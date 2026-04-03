from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.alerts_manager import manager
from services.alerts_service import fetch_alerts_for_site

router = APIRouter()


@router.get("/")
async def get_alerts(site_id: int, source: str = "free"):
    """REST fallback — returns current alerts for a stop."""
    return await fetch_alerts_for_site(site_id, source)


@router.websocket("/ws/{site_id}")
async def ws_alerts(websocket: WebSocket, site_id: str):
    """WebSocket endpoint — pushes alert updates to the client."""
    if not site_id or not site_id.strip():
        await websocket.close(code=4000)
        return

    await manager.connect(websocket, site_id)
    try:
        while True:
            # Keep connection alive; client sends nothing meaningful
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket, site_id)
