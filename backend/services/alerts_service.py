from __future__ import annotations

from typing import Any, Optional

import httpx

from services.sl_api import SLApiError, fetch_service_alerts_free


def map_severity(raw: str) -> str:
    """Map raw SL severity string to one of 'info' | 'warning' | 'critical'."""
    lower = (raw or "").lower()
    if lower in {"critical", "high", "severe", "major"}:
        return "critical"
    if lower in {"warning", "medium", "moderate"}:
        return "warning"
    return "info"


def _normalize_alert(raw: dict[str, Any]) -> dict[str, Any]:
    scope = raw.get("scope") or raw.get("lines") or raw.get("affected_lines") or []
    if isinstance(scope, str):
        scope = [scope]

    return {
        "id": str(raw.get("id") or raw.get("deviationId") or ""),
        "header": raw.get("header") or raw.get("description") or raw.get("title") or "",
        "details": raw.get("details") or raw.get("details_short") or raw.get("body") or "",
        "severity": map_severity(str(raw.get("severity") or raw.get("priority") or "")),
        "scope": [str(s) for s in scope],
        "transport_mode": raw.get("transport_mode") or raw.get("transportMode"),
        "valid_from": raw.get("valid_from") or raw.get("validFrom"),
        "valid_to": raw.get("valid_to") or raw.get("validTo"),
    }


async def fetch_alerts_for_site(
    site_id: int,
    source: str = "free",
    *,
    client: Optional[httpx.AsyncClient] = None,
) -> dict[str, Any]:
    """
    Fetch and normalise disruption alerts for a given site_id.
    Never raises — wraps SLApiError into an empty response with status='error'.
    """
    try:
        raw = await fetch_service_alerts_free(site_id=site_id, client=client)
        raw_alerts: list[dict] = raw.get("alerts") or []
        alerts = [_normalize_alert(a) for a in raw_alerts if isinstance(a, dict)]
        return {
            "status": "ok",
            "alerts": alerts,
            "stop_deviations": [],
        }
    except (SLApiError, Exception) as exc:
        return {
            "status": "error",
            "alerts": [],
            "stop_deviations": [],
            "message": str(exc),
        }
