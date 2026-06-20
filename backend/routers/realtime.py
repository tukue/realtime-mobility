from fastapi import APIRouter, Query

from services.sl_api import (
    fetch_realtime_departures,
    fetch_realtime_departures_free,
    normalize_free_departure_payload,
    normalize_free_sites,
    search_stops,
    search_stops_free,
)

router = APIRouter()

@router.get("/search")
async def search_site(
    query: str = Query(min_length=1, max_length=100),
    source: str = Query(default="key", pattern="^(key|free)$"),
):
    """Search for stops/stations by name"""
    if source == "free":
        return {"ResponseData": normalize_free_sites(await search_stops_free(query))}
    return await search_stops(query)

@router.get("/liveboard/{site_id}")
async def get_departures(
    site_id: int,
    time_window: int = Query(default=60, ge=1, le=360),
    source: str = Query(default="key", pattern="^(key|free)$"),
):
    """Get real-time live board data for a specific stop/station"""
    if source == "free":
        raw_departures = await fetch_realtime_departures_free(site_id)
        return normalize_free_departure_payload(raw_departures, site_id)
    return await fetch_realtime_departures(site_id, time_window=time_window)
