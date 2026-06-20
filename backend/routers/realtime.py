from fastapi import APIRouter, Depends, Query, Request
from httpx import AsyncClient

from services.dependencies import get_http_client, limiter
from services.schemas import LiveboardResponse, SearchResponse
from services.sl_api import (
    fetch_realtime_departures,
    fetch_realtime_departures_free,
    normalize_free_departure_payload,
    normalize_free_sites,
    search_stops,
    search_stops_free,
)

router = APIRouter()

@router.get("/search", response_model=SearchResponse)
@limiter.limit("30/minute")
async def search_site(
    request: Request,
    query: str = Query(min_length=1, max_length=100),
    source: str = Query(default="key", pattern="^(key|free)$"),
    client: AsyncClient = Depends(get_http_client),
):
    """Search for stops/stations by name"""
    if source == "free":
        return {"ResponseData": normalize_free_sites(await search_stops_free(query, client=client))}
    return await search_stops(query, client=client)

@router.get("/liveboard/{site_id}", response_model=LiveboardResponse)
@limiter.limit("30/minute")
async def get_departures(
    request: Request,
    site_id: int,
    time_window: int = Query(default=60, ge=1, le=360),
    source: str = Query(default="key", pattern="^(key|free)$"),
    client: AsyncClient = Depends(get_http_client),
):
    """Get real-time live board data for a specific stop/station"""
    if source == "free":
        raw_departures = await fetch_realtime_departures_free(site_id, client=client)
        return normalize_free_departure_payload(raw_departures, site_id)
    return await fetch_realtime_departures(site_id, time_window=time_window, client=client)
