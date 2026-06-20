import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from routers import realtime, liveboard, situations, nearby, alerts, journey
from services.alerts_manager import poller
from services.config import get_settings
from services.exceptions import SLApiError

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(poller.start())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        await poller.stop()


app = FastAPI(title="Stockholm public travel planner API", lifespan=lifespan)
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST_DIR = BASE_DIR / "dist"

settings = get_settings()
cors_origins = settings.cors_origins
cors_allow_credentials = cors_origins != ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(realtime.router, prefix="/api/realtime", tags=["realtime"])
app.include_router(nearby.router, prefix="/api/nearby", tags=["nearby"])
app.include_router(liveboard.router, prefix="/api/liveboard", tags=["liveboard"])
app.include_router(situations.router, prefix="/api/situations", tags=["situations"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(journey.router, prefix="/api/journey", tags=["journey"])


@app.exception_handler(SLApiError)
async def sl_api_error_handler(request: Request, exc: SLApiError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.exception_handler(Exception)
async def general_error_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception at %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


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
