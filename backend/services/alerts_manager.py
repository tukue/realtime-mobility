from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

import httpx
from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect, WebSocketState

from services.alerts_service import fetch_alerts_for_site


class AlertsConnectionManager:
    """Tracks active WebSocket connections grouped by site_id."""

    MAX_CONNECTIONS_PER_IP = 5
    MAX_TOTAL_CONNECTIONS = 500

    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, site_id: str) -> bool:
        """Connect a WebSocket. Returns True if rejected (caller should close)."""
        client_ip = websocket.client.host if websocket.client else "unknown"
        total = sum(len(s) for s in self._connections.values())

        if total >= self.MAX_TOTAL_CONNECTIONS:
            logger.warning("WS rejected: max total connections (%d)", self.MAX_TOTAL_CONNECTIONS)
            return True

        ip_count = sum(
            1
            for sockets in self._connections.values()
            for ws in sockets
            if ws.client and ws.client.host == client_ip
        )
        if ip_count >= self.MAX_CONNECTIONS_PER_IP:
            logger.warning(
                "WS rejected: client %s hit per-IP limit (%d)",
                client_ip,
                self.MAX_CONNECTIONS_PER_IP,
            )
            return True

        if getattr(websocket, "application_state", None) != WebSocketState.CONNECTED:
            await websocket.accept()
        self._connections.setdefault(site_id, set()).add(websocket)
        await websocket.send_json({"type": "connected", "site_id": site_id})
        return False

    async def disconnect(self, websocket: WebSocket, site_id: str) -> None:
        sockets = self._connections.get(site_id, set())
        sockets.discard(websocket)
        if not sockets:
            self._connections.pop(site_id, None)

    async def broadcast(self, site_id: str, data: dict[str, Any]) -> None:
        sockets = list(self._connections.get(site_id, set()))
        for ws in sockets:
            try:
                await ws.send_json(data)
            except (WebSocketDisconnect, RuntimeError):
                await self.disconnect(ws, site_id)

    def subscriber_count(self, site_id: str) -> int:
        return len(self._connections.get(site_id, set()))

    def active_site_ids(self) -> set[str]:
        return {sid for sid, sockets in self._connections.items() if sockets}


class AlertsPoller:
    """Background asyncio task — polls SL Deviations API every `interval` seconds
    for each stop that has at least one active WebSocket subscriber."""

    def __init__(self, manager: AlertsConnectionManager, interval: int = 60) -> None:
        self._manager = manager
        self._interval = interval
        self._running = False
        self._max_backoff = 120

    async def start(self) -> None:
        self._running = True
        backoff = 1
        async with httpx.AsyncClient() as client:
            while self._running:
                try:
                    await self._tick(client)
                    backoff = 1
                except Exception:
                    logger.exception("Poller tick failed")
                    await asyncio.sleep(backoff)
                    backoff = min(backoff * 2, self._max_backoff)
                    continue
                await asyncio.sleep(self._interval)

    async def stop(self) -> None:
        self._running = False

    async def _tick(self, client: httpx.AsyncClient) -> None:
        # Snapshot as sorted list so zip pairing is deterministic
        site_ids = sorted(self._manager.active_site_ids())
        if not site_ids:
            return

        results = await asyncio.gather(
            *(fetch_alerts_for_site(int(sid), client=client) for sid in site_ids),
            return_exceptions=True,
        )

        now = datetime.now(timezone.utc).isoformat()
        for site_id, result in zip(site_ids, results):
            if isinstance(result, Exception):
                await self._manager.broadcast(site_id, {
                    "type": "error",
                    "site_id": site_id,
                    "message": str(result),
                })
            else:
                await self._manager.broadcast(site_id, {
                    "type": "alerts",
                    "site_id": site_id,
                    "data": result,
                    "timestamp": now,
                })


# Singletons — imported by routers and main.py lifespan
manager = AlertsConnectionManager()
poller = AlertsPoller(manager)
