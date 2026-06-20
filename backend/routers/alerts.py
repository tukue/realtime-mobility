from __future__ import annotations

from fastapi import APIRouter, Depends, Request, WebSocket, WebSocketDisconnect
from httpx import AsyncClient

from services.alerts_manager import manager
from services.alerts_service import fetch_alerts_for_site
from services.dependencies import get_http_client, limiter
from services.schemas import AlertsResponse

router = APIRouter()


@router.get("/", response_model=AlertsResponse)
@limiter.limit("30/minute")
async def get_alerts(
    request: Request,
    site_id: int,
    source: str = "free",
    client: AsyncClient = Depends(get_http_client),
):
    """REST fallback — returns current alerts for a stop."""
    return await fetch_alerts_for_site(site_id, source, client=client)


@router.websocket("/ws/{site_id}")
async def ws_alerts(websocket: WebSocket, site_id: str):
    """WebSocket endpoint — pushes alert updates to the client."""
    await websocket.accept()
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
