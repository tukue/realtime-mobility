from fastapi import APIRouter, HTTPException
import httpx
import os

router = APIRouter()

# Trafiklab SL Situation API 4
SL_SITUATION_API_KEY = os.getenv("SL_SITUATION_API_KEY", "")
SL_SITUATION_URL = "https://api.sl.se/api2/deviations.json"

@router.get("/")
async def get_service_alerts(site_id: int = None, transport_mode: str = None):
    """
    Fetch real-time service alerts (deviations) from SL.
    Can filter by site_id or transport_mode.
    """
    params = {
        "key": SL_SITUATION_API_KEY,
    }

    if site_id:
        params["siteid"] = site_id
    if transport_mode:
        params["transportMode"] = transport_mode

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(SL_SITUATION_URL, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()

            if data.get("StatusCode") != 0:
                # Sometimes the API returns a success HTTP code but an internal error
                return {"alerts": [], "status": "no_data", "message": data.get("Message")}

            return data.get("ResponseData", [])
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Error fetching service alerts: {str(e)}")
