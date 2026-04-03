from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from services.alerts_service import fetch_alerts_for_site


class AlertsConnectionManager:
    """Tracks active WebSocket connections grouped by site_id."""

    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, site_id: str) -> None:
        await websocket.accept()
        self._connections.setdefault(site_id, set()).add(websocket)
        await websocket.send_json({"type": "connected", "site_id": site_id})

    async def disconnect(self, websocket: WebSocket, site_id: str) -> None:
        sockets = self._connections.get(site_id, set())
        sockets.discard(websocket)
        if not sockets:
            self._connections.pop(site_id, None)

    async def broadcast(self, site_id: str, data: dict[str, Any]) -> None:
        sockets = set(self._connections.get(site_id, set()))
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

    async def start(self) -> None:
        self._running = True
        async with httpx.AsyncClient() as client:
            while self._running:
                await self._tick(client)
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


# Singletons — imported by the router and main.py
manager = AlertsConnectionManager()
poller = AlertsPoller(manager)
