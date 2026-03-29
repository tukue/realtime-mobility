from fastapi import APIRouter, HTTPException

from services.sl_api import SLApiError, fetch_service_alerts, fetch_service_alerts_free

router = APIRouter()

@router.get("/")
async def get_service_alerts(site_id: int = None, transport_mode: str = None, source: str = "key"):
    """
    Fetch real-time service alerts (deviations) from SL.
    Can filter by site_id or transport_mode.
    """
    try:
        if source == "free":
            return await fetch_service_alerts_free(site_id=site_id, transport_mode=transport_mode)
        return await fetch_service_alerts(site_id=site_id, transport_mode=transport_mode)
    except SLApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching service alerts: {str(e)}")
