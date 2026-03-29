from fastapi import APIRouter, HTTPException

from services.sl_api import fetch_service_alerts

router = APIRouter()

@router.get("/")
async def get_service_alerts(site_id: int = None, transport_mode: str = None):
    """
    Fetch real-time service alerts (deviations) from SL.
    Can filter by site_id or transport_mode.
    """
    try:
        return await fetch_service_alerts(site_id=site_id, transport_mode=transport_mode)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching service alerts: {str(e)}")
