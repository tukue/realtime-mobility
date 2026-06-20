# Senior Backend Review: FastAPI Improvement Suggestions

## 1. Configuration: Replace `os.getenv()` with Pydantic `BaseSettings`

**Current:** `sl_config.py` uses raw `os.getenv()` calls. No validation, no type coercion, no centralized config.

```python
# sl_config.py — current
def get_sl_realtime_url():
    return os.getenv("SL_REALTIME_URL", "https://transport.integration.sl.se/v1/sites/...")
```

**Suggested:** Use Pydantic v2 `BaseSettings` with `.env` support baked in. Single source of truth, validated, typed, with proper IDE support.

```python
# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    sl_realtime_api_key: str = ""
    sl_typeahead_url: str = "https://transport.integration.sl.se/v1/typeahead..."
    sl_realtime_url: str = "https://transport.integration.sl.se/v1/sites/..."
    sl_situation_url: str = "https://transport.integration.sl.se/v1/deviations/..."
    sl_free_sites_url: str = "https://transport.integration.sl.se/v1/sites/..."
    sl_free_departures_url: str = "https://transport.integration.sl.se/v1/departures/..."
    sl_free_deviations_url: str = "https://transport.integration.sl.se/v1/deviations/..."
    sl_journey_url: str = "https://transport.integration.sl.se/v1/journey/..."
    request_timeout: int = 10
    cors_origins: list[str] = ["*"]
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
```

**Benefits:** Validation at startup, type safety, autocomplete, env file support, no magic strings.

---

## 2. Dependency Injection via FastAPI `Depends()`

**Current:** Service functions accept `Optional[httpx.AsyncClient] = None` and create their own client if not provided. Routers import service functions directly. Tests use monkey-patching which is fragile.

```python
# current router pattern
from services.sl_api import search_stops

@router.get("/search")
async def search(query: str, source: str = "free"):
    return await search_stops(query, source)
```

**Suggested:** Register shared resources (HTTP client, settings) as FastAPI dependencies.

```python
# dependencies.py
from fastapi import Depends
from httpx import AsyncClient, Limits, Timeout

async def get_http_client() -> AsyncClient:
    async with AsyncClient(
        timeout=Timeout(settings.request_timeout),
        limits=Limits(max_keepalive_connections=20, max_connections=100),
    ) as client:
        yield client

async def get_settings() -> Settings:
    return settings

# router
@router.get("/search")
async def search(
    query: str,
    source: str = "free",
    client: AsyncClient = Depends(get_http_client),
    settings: Settings = Depends(get_settings),
):
    return await search_stops(client, query, source, settings)
```

**Benefits:** Testable via dependency override (`app.dependency_overrides[get_http_client] = mock_client`), connection pooling managed centrally, no more `Optional[AsyncClient]` noise.

---

## 3. Centralized Exception Handling

**Current:** Every router duplicates the same try/except pattern:

```python
try:
    return await search_stops(...)
except SLApiError as e:
    raise HTTPException(status_code=e.status_code, detail=e.message)
except Exception as e:
    raise HTTPException(status_code=500, detail=f"...")
```

**Suggested:** Register custom exception handlers on the app once.

```python
# exceptions.py
class SLApiError(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code

class NotFoundError(SLApiError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)

class UpstreamError(SLApiError):
    def __init__(self, message: str = "Upstream service unavailable"):
        super().__init__(message, status_code=502)

# main.py
@app.exception_handler(SLApiError)
async def sl_api_error_handler(request: Request, exc: SLApiError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})

@app.exception_handler(Exception)
async def general_error_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
```

**Benefits:** DRY, consistent error responses, centralized logging, cleaner route handlers.

---

## 4. Lifespan-Based Client Lifecycle (Replace `on_event`)

**Current:** Uses deprecated `@app.on_event("startup")` and creates `httpx.AsyncClient` per-request.

**Suggested:** Use FastAPI's lifespan context manager (v2.0+ recommended pattern).

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    client = AsyncClient(timeout=Timeout(10), limits=Limits(max_keepalive_connections=20))
    poller_task = asyncio.create_task(poller.start())
    yield
    poller_task.cancel()
    await client.aclose()
    await manager.disconnect_all()

app = FastAPI(lifespan=lifespan)
```

**Benefits:** Proper startup/shutdown lifecycle, no orphaned tasks, clean resource cleanup.

---

## 5. Pydantic Models for All Query Parameters

**Current:** Only `JourneyRequest` uses Pydantic. Other endpoints use raw query parameters with no validation.

```python
@router.get("/search")
async def search(query: str, source: str = "free"):
    ...
```

**Suggested:** Use Pydantic models with `Query` validation for all endpoints.

```python
from pydantic import BaseModel, Field
from fastapi import Query

class SearchParams(BaseModel):
    query: str = Field(min_length=1, max_length=100)
    source: str = Field(default="free", pattern="^(key|free)$")

class NearbyParams(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    limit: int = Field(default=10, ge=1, le=50)
    source: str = Field(default="free", pattern="^(key|free)$")

# Alternatively, use FastAPI's Query inline:
@router.get("/search")
async def search(
    query: str = Query(min_length=1, max_length=100),
    source: str = Query(default="free", pattern="^(key|free)$"),
):
    ...
```

**Benefits:** Early validation with clear error messages, OpenAPI schema generation, self-documenting.

---

## 6. Replace Monkey-Patching in Tests with Dependency Override

**Current:** Tests swap imported functions (`realtime.search_stops = fake_search`), which is brittle.

```python
# test_routes.py — current
realtime.search_stops = fake_search
```

**Suggested:** Use FastAPI's `app.dependency_overrides` or `unittest.mock.patch` with proper dependency injection.

```python
# Using dependency override
async def mock_search_stops(client, query, source, settings):
    return [{"SiteId": "1234", "Name": "Test Stop"}]

app.dependency_overrides[get_sl_api_service] = lambda: mock_search_stops

# Using unittest.mock.patch
@patch("services.sl_api.search_stops", return_value=...)
async def test_search(self, mock_search):
    response = await client.get("/api/realtime/search?query=test")
```

**Benefits:** No test-induced damage to module state, works with DI, proper isolation.

---

## 7. Structured Logging Middleware

**Current:** No logging middleware. Errors surface as opaque 500s.

**Suggested:**

```python
import logging
import time
from fastapi import Request

logger = structlog.get_logger()  # or standard logging

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(
        "request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=round(duration * 1000),
    )
    return response
```

**Benefits:** Observability, performance monitoring, debugging.

---

## 8. Repository Pattern for SL API Client

**Current:** `sl_api.py` is a flat collection of 477 lines with functions mixing URL construction, HTTP calls, and response normalization.

**Suggested:** Introduce a repository/service layer separation.

```python
# repositories/sl_repository.py
class SLRepository:
    def __init__(self, client: AsyncClient, settings: Settings):
        self._client = client
        self._settings = settings

    async def search_stops(self, query: str) -> list[dict]:
        url = self._settings.sl_typeahead_url
        params = {"query": query, "apikey": self._settings.sl_realtime_api_key}
        return await self._fetch_json(url, params)

    async def get_departures(self, site_id: str) -> list[dict]:
        ...

# services/stop_service.py
class StopService:
    def __init__(self, repo: SLRepository):
        self._repo = repo

    async def search_stops(self, query: str, source: str = "free") -> list[dict]:
        data = await self._repo.search_stops(query, source)
        return [normalize_stop(s) for s in data]
```

**Benefits:** Testable in isolation, single responsibility, reusable across routers, clear data flow.

---

## 9. Rate Limiting

**Current:** API is fully open with no protection.

**Suggested:**

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(429, _rate_limit_exceeded_handler)

@router.get("/search")
@limiter.limit("30/minute")
async def search(request: Request, query: str):
    ...
```

**Benefits:** Prevents abuse, protects SL API quota, production-ready.

---

## 10. Clean Up: Move Standalone Scripts and Env File

- Remove `test_api.py`, `test_api_v2.py`, `test_api_v3.py` from `backend/` root (move to `tests/scripts/` or delete if covered by unit tests)
- Add `.env` to `.gitignore`. Use `.env.example` for documentation. Load secrets via environment variables in production (Render, Docker, etc.)
- Verify `.dockerignore` excludes `.env` from Docker builds
- Move `venv/` to `backend/.venv/` or add to `.gitignore` (should already be ignored)

---

## 11. Typed Response Models

**Current:** Route handlers return plain `dict` / `list[dict]`.

**Suggested:** Define Pydantic response models for every endpoint.

```python
class StopResult(BaseModel):
    site_id: str = Field(alias="SiteId")
    name: str = Field(alias="Name")
    type: str = Field(alias="Type")
    lon: float | None = None
    lat: float | None = None

    model_config = ConfigDict(populate_by_name=True)

@router.get("/search", response_model=list[StopResult])
async def search(...):
    ...
```

**Benefits:** Response validation, OpenAPI schema, client code generation support, type safety.

---

## 12. Background Poller: Graceful Shutdown and Error Backoff

**Current:** `AlertsPoller.start()` has no backoff on failure and `_tick` can swallow exceptions silently.

**Suggested:**

```python
class AlertsPoller:
    async def start(self):
        retry_delay = 1
        while self._running:
            try:
                await self._tick()
                retry_delay = 1
            except Exception:
                logger.exception("Poller tick failed")
                await asyncio.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, 60)
            await asyncio.sleep(self.interval)

    async def stop(self):
        self._running = False
```

**Benefits:** Resilience, self-healing, no silent failures.

---

## Summary Priority Matrix

| Priority | Area | Impact |
|----------|------|--------|
| P0 | Pydantic Settings + remove `.env` from repo | Security |
| P0 | Lifespan-based lifecycle | Correctness |
| P1 | Centralized exception handler | Maintainability |
| P1 | Pydantic models for request params | Robustness |
| P2 | `Depends()` for DI | Testability |
| P2 | Structured logging | Observability |
| P2 | Typed response models | DX / Docs |
| P3 | Repository pattern | Scalability |
| P3 | Rate limiting | Production readiness |
| P3 | Background poller backoff | Resilience |
| P3 | Clean up standalone scripts | Hygiene |
