from __future__ import annotations

from fastapi import Request
from httpx import AsyncClient
from slowapi import Limiter
from slowapi.util import get_remote_address

from services.config import Settings, get_settings

limiter = Limiter(key_func=get_remote_address)


async def get_http_client(request: Request) -> AsyncClient:
    return request.app.state.http_client


def get_app_settings() -> Settings:
    return get_settings()
