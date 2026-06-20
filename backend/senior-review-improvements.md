# Backend Improvements — Implemented

## P0 — Security / Correctness

- **Pydantic Settings** (`services/config.py`) — `lru_cache`-loaded `Settings` class reading `backend/.env`
- **Lifespan lifecycle** (`main.py`) — replaced deprecated `@app.on_event("startup")` with `@asynccontextmanager` lifespan; creates shared `http_client`, starts `AlertsPoller`, cleans up on shutdown
- **CORS hardening** — `allow_credentials` auto-disabled when `cors_origins` is `["*"]` (CWE-942)

## P1 — Maintainability / Robustness

- **Centralized exception handlers** (`main.py`) — `@app.exception_handler(SLApiError)` and `@app.exception_handler(Exception)` with `logger.exception()`
- **Query validation** — `Query(min_length=..., max_length=..., pattern=..., ge=..., le=...)` on all router parameters
- **Error backoff** — `AlertsPoller.start()` exponential backoff (1s → 2s → 4s … cap 120s)
- **Test isolation** — replaced module-level monkey-patching with `@patch()` decorators and `app.dependency_overrides`

## P2 — Observability / Developer Experience

- **Structured logging middleware** (`main.py`) — logs method, path, status, duration for every request
- **Rate limiting** (`slowapi`) — `30/minute` on all endpoints
- **Typed response models** (`services/schemas.py`) — Pydantic models for every endpoint with `response_model=`
- **Dependency injection** (`services/dependencies.py`) — `get_http_client()`, `get_app_settings()`, `limiter` via `Depends()`

## P3 — Production Readiness

- **Script cleanup** — `test_api.py` / `test_api_v2.py` / `test_api_v3.py` moved from root to `tests/scripts/`
- **Exception extraction** — `services/exceptions.py` with `SLApiError`
- **Config delegation** — `services/sl_config.py` now delegates to `get_settings()` instead of `os.getenv()`
- **Connection pooling** — single `httpx.AsyncClient` with `Limits(max_keepalive_connections=20, max_connections=100)` shared via `app.state`

## Not Implemented

- Repository pattern for SL API client (deferred — current structure sufficient for app scale)
