from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from dotenv import load_dotenv
import os

load_dotenv()

import asyncio

from routers import realtime, departures, situations, nearby, alerts
from services.alerts_manager import poller

app = FastAPI(title="Stockholm public travel planner API")
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST_DIR = BASE_DIR / "dist"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(realtime.router, prefix="/api/realtime", tags=["realtime"])
app.include_router(nearby.router, prefix="/api/nearby", tags=["nearby"])
app.include_router(departures.router, prefix="/api/departures", tags=["departures"])
app.include_router(situations.router, prefix="/api/situations", tags=["situations"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])


@app.on_event("startup")
async def startup():
    asyncio.create_task(poller.start())


def _safe_frontend_path(requested_path: str) -> Path | None:
    candidate = (FRONTEND_DIST_DIR / requested_path).resolve()
    try:
        candidate.relative_to(FRONTEND_DIST_DIR)
    except ValueError:
        return None
    return candidate


@app.get("/")
async def root():
    index_file = FRONTEND_DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "Stockholm public travel planner API", "status": "running"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}

@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")

    index_file = FRONTEND_DIST_DIR / "index.html"
    if index_file.exists():
        asset_path = _safe_frontend_path(full_path)
        if asset_path and asset_path.is_file():
            return FileResponse(asset_path)
        return FileResponse(index_file)

    raise HTTPException(status_code=404, detail="Frontend build not found")
