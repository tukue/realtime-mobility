from fastapi import APIRouter, HTTPException

from services.sl_api import (
    SLApiError,
    fetch_realtime_departures,
    fetch_realtime_departures_free,
    normalize_departure_payload,
    normalize_free_departure_payload,
)

router = APIRouter()

@router.get("/format/{site_id}")
async def get_formatted_departures(site_id: int, source: str = "key"):
    """Get formatted departures from the realtime endpoint"""
    try:
        if source == "free":
            raw_departures = await fetch_realtime_departures_free(site_id)
            return normalize_free_departure_payload(raw_departures, site_id)
        raw_departures = await fetch_realtime_departures(site_id)
        return normalize_departure_payload(raw_departures, site_id)
    except SLApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
