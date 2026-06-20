from fastapi import APIRouter, HTTPException, Query

from services.sl_api import (
    get_nearby_free_boards,
    get_nearby_free_sites,
    get_nearby_free_train_boards,
)

router = APIRouter()


@router.get("/stops")
async def get_nearby_stops(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    limit: int = Query(default=5, ge=1, le=50),
    source: str = Query(default="free", pattern="^free$"),
):
    """Get nearby stops ranked by distance from the provided coordinates."""
    return {"ResponseData": await get_nearby_free_sites(lat, lon, limit=limit)}


@router.get("/boards")
async def get_nearby_stop_boards(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    limit: int = Query(default=3, ge=1, le=20),
    source: str = Query(default="free", pattern="^free$"),
):
    """Get nearby stops with live departure previews."""
    return {"ResponseData": await get_nearby_free_boards(lat, lon, limit=limit)}


@router.get("/train-boards")
async def get_nearby_train_boards(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    limit: int = Query(default=3, ge=1, le=20),
    source: str = Query(default="free", pattern="^free$"),
):
    """Get nearby train/metro stations with live departure previews."""
    return {"ResponseData": await get_nearby_free_train_boards(lat, lon, limit=limit)}
