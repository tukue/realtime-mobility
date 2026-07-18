from fastapi import APIRouter, Depends, Query, Request
from httpx import AsyncClient

from services.dependencies import get_http_client, limiter
from services.schemas import LiveboardResponse
from services.sl_api import (
    fetch_realtime_departures,
    fetch_realtime_departures_free,
    normalize_departure_payload,
    normalize_free_departure_payload,
)

router = APIRouter()

@router.get("/format/{site_id}", response_model=LiveboardResponse)
@limiter.limit("30/minute")
async def get_formatted_liveboard(
    request: Request,
    site_id: int,
    source: str = Query(default="key", pattern="^(key|free)$"),
    client: AsyncClient = Depends(get_http_client),
):
    """Get formatted live board data from the realtime endpoint"""
    if source == "free":
        raw_departures = await fetch_realtime_departures_free(site_id, client=client)
        return normalize_free_departure_payload(raw_departures, site_id)
    raw_departures = await fetch_realtime_departures(site_id, client=client)
    return normalize_departure_payload(raw_departures, site_id)
