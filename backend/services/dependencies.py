from __future__ import annotations

import os

from fastapi import Request
from httpx import AsyncClient
from slowapi import Limiter

from services.config import Settings, get_settings

_TRUST_PROXY_HEADERS = os.getenv("TRUST_PROXY_HEADERS", "false").lower() == "true"


def get_trusted_client_ip(request: Request) -> str:
    """Extract real client IP behind a reverse proxy (e.g. Render).

    Only trusts X-Forwarded-For when TRUST_PROXY_HEADERS=true is set
    in the environment (configured on Render). Without this flag, falls
    back to the direct connection IP, preventing spoofing on direct access.
    """
    if _TRUST_PROXY_HEADERS:
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=get_trusted_client_ip)


async def get_http_client(request: Request) -> AsyncClient:
    return request.app.state.http_client


def get_app_settings() -> Settings:
    return get_settings()
