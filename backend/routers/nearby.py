from fastapi import APIRouter, Depends, Query, Request
from httpx import AsyncClient

from services.dependencies import get_http_client, limiter
from services.schemas import NearbyResponse
from services.sl_api import (
    get_nearby_free_boards,
    get_nearby_free_sites,
    get_nearby_free_train_boards,
)

router = APIRouter()


@router.get("/stops", response_model=NearbyResponse)
@limiter.limit("30/minute")
async def get_nearby_stops(
    request: Request,
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    limit: int = Query(default=5, ge=1, le=50),
    client: AsyncClient = Depends(get_http_client),
):
    """Get nearby stops ranked by distance from the provided coordinates."""
    return {"ResponseData": await get_nearby_free_sites(lat, lon, limit=limit, client=client)}


@router.get("/boards", response_model=NearbyResponse)
@limiter.limit("30/minute")
async def get_nearby_stop_boards(
    request: Request,
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    limit: int = Query(default=3, ge=1, le=20),
    client: AsyncClient = Depends(get_http_client),
):
    """Get nearby stops with live departure previews."""
    return {"ResponseData": await get_nearby_free_boards(lat, lon, limit=limit, client=client)}


@router.get("/train-boards", response_model=NearbyResponse)
@limiter.limit("30/minute")
async def get_nearby_train_boards(
    request: Request,
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    limit: int = Query(default=3, ge=1, le=20),
    client: AsyncClient = Depends(get_http_client),
):
    """Get nearby train/metro stations with live departure previews."""
    return {"ResponseData": await get_nearby_free_train_boards(lat, lon, limit=limit, client=client)}
