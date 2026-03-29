from fastapi import APIRouter, HTTPException

from services.sl_api import SLApiError, normalize_departure_payload, fetch_realtime_departures

router = APIRouter()

@router.get("/format/{site_id}")
async def get_formatted_departures(site_id: int):
    """Get formatted departures from the realtime endpoint"""
    try:
        raw_departures = await fetch_realtime_departures(site_id)
        return normalize_departure_payload(raw_departures, site_id)
    except SLApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
