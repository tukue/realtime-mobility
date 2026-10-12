from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional

from httpx import AsyncClient
from services.dependencies import get_http_client
from services.journey_service import plan_journey

router = APIRouter()


class JourneyRequest(BaseModel):
    origin_id: str
    destination_id: str
    datetime: Optional[str] = None
    max_changes: int = 3
    transport_modes: Optional[list[Literal['bus', 'metro', 'train', 'tram', 'ship']]] = Field(
        default=None, min_length=1, max_length=5,
    )

    @field_validator("origin_id", "destination_id")
    @classmethod
    def must_be_non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("must be non-empty")
        return v

    @field_validator("max_changes")
    @classmethod
    def clamp_changes(cls, v: int) -> int:
        return max(0, min(5, v))


@router.post("/plan")
async def plan(req: JourneyRequest, client: AsyncClient = Depends(get_http_client)):
    if req.origin_id == req.destination_id:
        raise HTTPException(status_code=400, detail="origin_id and destination_id must be different")
    return await plan_journey(
        req.origin_id,
        req.destination_id,
        req.datetime,
        req.max_changes,
        client=client,
        transport_modes=req.transport_modes,
    )
