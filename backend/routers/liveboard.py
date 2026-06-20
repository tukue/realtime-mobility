from fastapi import APIRouter, Query

from services.sl_api import (
    fetch_realtime_departures,
    fetch_realtime_departures_free,
    normalize_departure_payload,
    normalize_free_departure_payload,
)

router = APIRouter()

@router.get("/format/{site_id}")
async def get_formatted_liveboard(
    site_id: int,
    source: str = Query(default="key", pattern="^(key|free)$"),
):
    """Get formatted live board data from the realtime endpoint"""
    if source == "free":
        raw_departures = await fetch_realtime_departures_free(site_id)
        return normalize_free_departure_payload(raw_departures, site_id)
    raw_departures = await fetch_realtime_departures(site_id)
    return normalize_departure_payload(raw_departures, site_id)
