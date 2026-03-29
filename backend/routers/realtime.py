from fastapi import APIRouter, HTTPException

from services.sl_api import SLApiError, fetch_realtime_departures, search_stops

router = APIRouter()

@router.get("/search")
async def search_site(query: str):
    """Search for stops/stations by name"""
    try:
        return await search_stops(query)
    except SLApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching stops: {str(e)}")

@router.get("/departures/{site_id}")
async def get_departures(site_id: int, time_window: int = 60):
    """Get real-time departures for a specific stop/station"""
    try:
        return await fetch_realtime_departures(site_id, time_window=time_window)
    except SLApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching departures: {str(e)}")
