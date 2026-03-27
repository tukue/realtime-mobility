from fastapi import APIRouter, HTTPException
import httpx
import os

router = APIRouter()

SL_REALTIME_API_KEY = os.getenv("SL_REALTIME_API_KEY", "")
SL_REALTIME_BASE_URL = "https://api.sl.se/api2/realtimedeparturesV4.json"

@router.get("/search")
async def search_site(query: str):
    """Search for stops/stations by name"""
    url = "https://journeyplanner.integration.sl.se/v1/typeahead.json"
    params = {
        "key": SL_REALTIME_API_KEY,
        "searchstring": query,
        "stationsonly": "false",
        "maxresults": 10
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            return data
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Error searching stops: {str(e)}")

@router.get("/departures/{site_id}")
async def get_departures(site_id: int, time_window: int = 60):
    """Get real-time departures for a specific stop/station"""
    params = {
        "key": SL_REALTIME_API_KEY,
        "siteid": site_id,
        "timewindow": time_window
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(SL_REALTIME_BASE_URL, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()

            if data.get("StatusCode") != 0:
                raise HTTPException(
                    status_code=400,
                    detail=data.get("Message", "Error from SL API")
                )

            return data
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Error fetching departures: {str(e)}")
