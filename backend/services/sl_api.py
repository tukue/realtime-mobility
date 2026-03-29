from __future__ import annotations

import os
from typing import Any, Iterable, Optional

import httpx

SL_TYPEAHEAD_URL = "https://journeyplanner.integration.sl.se/v1/typeahead.json"
SL_REALTIME_URL = "https://api.sl.se/api2/realtimedeparturesV4.json"
SL_SITUATION_URL = "https://api.sl.se/api2/deviations.json"


class SLApiError(Exception):
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _get_api_key(name: str) -> str:
    return os.getenv(name, "")


async def _fetch_json(
    url: str,
    params: dict[str, Any],
    *,
    timeout: float = 10.0,
    client: Optional[httpx.AsyncClient] = None,
) -> dict[str, Any]:
    if client is None and not params.get("key"):
        raise SLApiError(
            "Missing SL API key. Check backend/.env and restart the backend.",
            status_code=500,
        )

    if client is not None:
        try:
            response = await client.get(url, params=params, timeout=timeout)
            response.raise_for_status()
            return response.json()
        except httpx.TimeoutException as exc:
            raise SLApiError("SL request timed out while contacting the upstream API.", 504) from exc
        except httpx.ConnectError as exc:
            raise SLApiError("Could not reach the SL API host. Check network or DNS access.", 503) from exc
        except httpx.HTTPStatusError as exc:
            raise SLApiError(
                f"SL API returned HTTP {exc.response.status_code} for {url}.",
                status_code=502,
            ) from exc
        except httpx.RequestError as exc:
            raise SLApiError(f"SL request failed: {exc}", status_code=502) from exc

    try:
        async with httpx.AsyncClient() as session:
            response = await session.get(url, params=params, timeout=timeout)
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException as exc:
        raise SLApiError("SL request timed out while contacting the upstream API.", 504) from exc
    except httpx.ConnectError as exc:
        raise SLApiError("Could not reach the SL API host. Check network or DNS access.", 503) from exc
    except httpx.HTTPStatusError as exc:
        raise SLApiError(
            f"SL API returned HTTP {exc.response.status_code} for {url}.",
            status_code=502,
        ) from exc
    except httpx.RequestError as exc:
        raise SLApiError(f"SL request failed: {exc}", status_code=502) from exc


async def search_stops(
    query: str,
    *,
    stations_only: bool = False,
    max_results: int = 10,
    client: Optional[httpx.AsyncClient] = None,
) -> dict[str, Any]:
    params = {
        "key": _get_api_key("SL_REALTIME_API_KEY"),
        "searchstring": query,
        "stationsonly": "true" if stations_only else "false",
        "maxresults": max_results,
    }
    return await _fetch_json(SL_TYPEAHEAD_URL, params, client=client)


async def fetch_realtime_departures(
    site_id: int,
    *,
    time_window: int = 60,
    client: Optional[httpx.AsyncClient] = None,
) -> dict[str, Any]:
    params = {
        "key": _get_api_key("SL_REALTIME_API_KEY"),
        "siteid": site_id,
        "timewindow": time_window,
    }
    data = await _fetch_json(SL_REALTIME_URL, params, client=client)

    if data.get("StatusCode") not in (None, 0):
        raise SLApiError(
            f"SL realtime API returned StatusCode {data.get('StatusCode')}: {data.get('Message', 'Unknown error')}",
            status_code=502,
        )

    return data


async def fetch_service_alerts(
    site_id: Optional[int] = None,
    *,
    transport_mode: Optional[str] = None,
    client: Optional[httpx.AsyncClient] = None,
) -> dict[str, Any]:
    params: dict[str, Any] = {"key": _get_api_key("SL_SITUATION_API_KEY")}
    if site_id is not None:
        params["siteid"] = site_id
    if transport_mode:
        params["transportMode"] = transport_mode

    data = await _fetch_json(SL_SITUATION_URL, params, client=client)
    if data.get("StatusCode") != 0:
        return {
            "status": "no_data",
            "alerts": [],
            "message": data.get("Message", "No data returned from SL"),
        }

    return {
        "status": "ok",
        "alerts": data.get("ResponseData", []),
    }


def normalize_transport_data(
    transport_list: Iterable[dict[str, Any]],
    transport_mode: str,
) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []

    for item in transport_list:
        deviations = item.get("Deviations", []) or []
        normalized.append(
            {
                "line_number": str(item.get("LineNumber", "")),
                "destination": item.get("Destination", ""),
                "display_time": item.get("DisplayTime", ""),
                "expected_datetime": item.get("ExpectedDateTime", ""),
                "journey_direction": item.get("JourneyDirection", 0),
                "group_of_line": item.get("GroupOfLine", ""),
                "transport_mode": transport_mode,
                "deviations": deviations,
                "has_deviations": bool(deviations),
            }
        )

    return normalized


def normalize_departure_payload(raw: dict[str, Any], site_id: int) -> dict[str, Any]:
    response_data = raw.get("ResponseData", {}) or {}

    return {
        "site_id": site_id,
        "site_name": response_data.get("Name", ""),
        "status": "ok" if raw.get("StatusCode") == 0 else "error",
        "buses": normalize_transport_data(response_data.get("Buses", []) or [], "bus"),
        "metros": normalize_transport_data(response_data.get("Metros", []) or [], "metro"),
        "trains": normalize_transport_data(response_data.get("Trains", []) or [], "train"),
        "trams": normalize_transport_data(response_data.get("Trams", []) or [], "tram"),
        "ships": normalize_transport_data(response_data.get("Ships", []) or [], "ship"),
    }
