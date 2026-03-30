from fastapi import APIRouter, HTTPException

from services.sl_api import SLApiError, get_nearby_free_sites

router = APIRouter()


@router.get("/stops")
async def get_nearby_stops(lat: float, lon: float, limit: int = 5, source: str = "free"):
    """Get nearby stops ranked by distance from the provided coordinates."""
    try:
        if source != "free":
            raise HTTPException(status_code=400, detail="Nearby stop lookup currently uses the free SL source.")

        return {"ResponseData": await get_nearby_free_sites(lat, lon, limit=limit)}
    except SLApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching nearby stops: {str(e)}")
