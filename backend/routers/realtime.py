from fastapi import APIRouter, HTTPException

from services.sl_api import (
    SLApiError,
    fetch_realtime_departures,
    fetch_realtime_departures_free,
    normalize_free_departure_payload,
    normalize_free_sites,
    search_stops,
    search_stops_free,
)

router = APIRouter()

@router.get("/search")
async def search_site(query: str, source: str = "key"):
    """Search for stops/stations by name"""
    try:
        if source == "free":
            return {"ResponseData": normalize_free_sites(await search_stops_free(query))}
        return await search_stops(query)
    except SLApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching stops: {str(e)}")

@router.get("/liveboard/{site_id}")
async def get_departures(site_id: int, time_window: int = 60, source: str = "key"):
    """Get real-time live board data for a specific stop/station"""
    try:
        if source == "free":
            raw_departures = await fetch_realtime_departures_free(site_id)
            return normalize_free_departure_payload(raw_departures, site_id)
        return await fetch_realtime_departures(site_id, time_window=time_window)
    except SLApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching departures: {str(e)}")
