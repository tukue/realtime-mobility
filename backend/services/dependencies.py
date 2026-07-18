from __future__ import annotations

from fastapi import Request
from httpx import AsyncClient
from slowapi import Limiter

from services.config import Settings, get_settings


def get_trusted_client_ip(request: Request) -> str:
    """Extract real client IP behind a reverse proxy (e.g. Render).

    Render terminates TLS and forwards the original client IP in
    X-Forwarded-For.  We trust the first entry (leftmost) since we
    control the proxy layer.  Falls back to direct connection IP.
    """
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=get_trusted_client_ip)


async def get_http_client(request: Request) -> AsyncClient:
    return request.app.state.http_client


def get_app_settings() -> Settings:
    return get_settings()
