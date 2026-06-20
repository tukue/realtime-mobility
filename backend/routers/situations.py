from fastapi import APIRouter, Depends, Query, Request
from httpx import AsyncClient

from services.dependencies import get_http_client, limiter
from services.schemas import SituationsResponse
from services.sl_api import fetch_service_alerts, fetch_service_alerts_free

router = APIRouter()

@router.get("/", response_model=SituationsResponse)
@limiter.limit("30/minute")
async def get_service_alerts(
    request: Request,
    site_id: int = Query(default=None, ge=0),
    transport_mode: str = Query(default=None, max_length=50),
    source: str = Query(default="key", pattern="^(key|free)$"),
    client: AsyncClient = Depends(get_http_client),
):
    """
    Fetch real-time service alerts (deviations) from SL.
    Can filter by site_id or transport_mode.
    """
    if source == "free":
        return await fetch_service_alerts_free(site_id=site_id, transport_mode=transport_mode, client=client)
    return await fetch_service_alerts(site_id=site_id, transport_mode=transport_mode, client=client)
