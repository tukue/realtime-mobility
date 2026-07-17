from __future__ import annotations

import re

from fastapi import APIRouter, Depends, Request, WebSocket, WebSocketDisconnect
from httpx import AsyncClient

from services.alerts_manager import manager
from services.alerts_service import fetch_alerts_for_site
from services.config import get_settings
from services.dependencies import get_http_client, limiter
from services.schemas import AlertsResponse

router = APIRouter()

SITE_ID_PATTERN = re.compile(r"^\d{1,10}$")


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
    settings = get_settings()
    allowed_origins = settings.cors_origins

    if allowed_origins != ["*"]:
        origin = websocket.headers.get("origin", "")
        if origin and origin not in allowed_origins:
            await websocket.accept()
            await websocket.close(code=4003)
            return

    await websocket.accept()

    if not site_id or not SITE_ID_PATTERN.match(site_id.strip()):
        await websocket.close(code=4000)
        return

    rejected = await manager.connect(websocket, site_id)
    if rejected:
        await websocket.close(code=4001)
        return

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket, site_id)
