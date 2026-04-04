from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from services.sl_api import SLApiError, _fetch_json
from services.sl_config import get_sl_journey_url


def normalize_leg(raw: dict[str, Any]) -> dict[str, Any]:
    """Normalise a raw SL trip leg — missing keys default to empty string."""
    origin = raw.get("Origin") or {}
    destination = raw.get("Destination") or {}
    product = raw.get("Product") or {}
    return {
        "origin": origin.get("name") or "",
        "destination": destination.get("name") or "",
        "departure_time": origin.get("time") or "",
        "arrival_time": destination.get("time") or "",
        "line_number": product.get("num") or "",
        "transport_mode": (product.get("catOut") or "").lower(),
        "direction": raw.get("direction") or "",
    }


def _parse_trip(raw_trip: dict[str, Any]) -> dict[str, Any]:
    raw_legs = raw_trip.get("LegList", {}).get("Leg") or []
    if isinstance(raw_legs, dict):
        raw_legs = [raw_legs]
    legs = [normalize_leg(leg) for leg in raw_legs if isinstance(leg, dict)]

    # Duration in minutes from PT##M or similar ISO string, fallback to 0
    duration_str = raw_trip.get("dur") or ""
    try:
        duration = int(duration_str)
    except (ValueError, TypeError):
        duration = 0

    changes = int(raw_trip.get("chg") or 0)
    dep_time = (raw_trip.get("Origin") or {}).get("time") or ""
    arr_time = (raw_trip.get("Destination") or {}).get("time") or ""

    return {
        "duration_minutes": duration,
        "changes": changes,
        "legs": legs,
        "departure_time": dep_time,
        "arrival_time": arr_time,
    }


async def plan_journey(
    origin_id: str,
    destination_id: str,
    datetime_str: Optional[str] = None,
    max_changes: int = 3,
    *,
    client: Optional[httpx.AsyncClient] = None,
) -> dict[str, Any]:
    """
    Plan a journey between two SL stops.
    Returns JourneyResult with trips sorted by departure_time.
    Never raises — returns empty trips on error.
    """
    if origin_id == destination_id:
        raise ValueError("origin_id and destination_id must be different")

    max_changes = max(0, min(5, max_changes))

    if datetime_str is None:
        now = datetime.now(timezone.utc)
        date = now.strftime("%Y-%m-%d")
        time = now.strftime("%H:%M")
    else:
        try:
            dt = datetime.fromisoformat(datetime_str.replace("Z", "+00:00"))
            date = dt.strftime("%Y-%m-%d")
            time = dt.strftime("%H:%M")
        except ValueError:
            now = datetime.now(timezone.utc)
            date = now.strftime("%Y-%m-%d")
            time = now.strftime("%H:%M")

    params: dict[str, Any] = {
        "originId": origin_id,
        "destId": destination_id,
        "date": date,
        "time": time,
        "numTrips": 5,
        "maxChanges": max_changes,
    }

    try:
        data = await _fetch_json(
            get_sl_journey_url(),
            params,
            client=client,
            require_api_key=False,
        )
    except SLApiError:
        return {"trips": [], "origin_name": "", "destination_name": ""}

    raw_trips = (data.get("Trip") or data.get("trips") or [])
    if isinstance(raw_trips, dict):
        raw_trips = [raw_trips]

    trips = [_parse_trip(t) for t in raw_trips if isinstance(t, dict)]
    trips.sort(key=lambda t: t["departure_time"])

    origin_name = (data.get("Origin") or {}).get("name") or ""
    dest_name = (data.get("Destination") or {}).get("name") or ""

    return {
        "trips": trips,
        "origin_name": origin_name,
        "destination_name": dest_name,
    }
