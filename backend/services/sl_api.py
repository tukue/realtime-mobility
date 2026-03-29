from __future__ import annotations

import os
from typing import Any, Iterable, Optional

import httpx

SL_TYPEAHEAD_URL = "https://journeyplanner.integration.sl.se/v1/typeahead.json"
SL_REALTIME_URL = "https://api.sl.se/api2/realtimedeparturesV4.json"
SL_SITUATION_URL = "https://api.sl.se/api2/deviations.json"
SL_FREE_SITES_URL = "https://transport.integration.sl.se/v1/sites"
SL_FREE_DEPARTURES_URL = "https://transport.integration.sl.se/v1/sites/{site_id}/departures"
SL_FREE_DEVIATIONS_URL = "https://deviations.integration.sl.se/v1/messages"


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
    require_api_key: bool = True,
) -> dict[str, Any]:
    if require_api_key and client is None and not params.get("key"):
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


async def search_stops_free(
    query: str,
    *,
    client: Optional[httpx.AsyncClient] = None,
) -> list[dict[str, Any]]:
    params = {
        "expand": "true",
    }
    data = await _fetch_json(
        SL_FREE_SITES_URL,
        params,
        client=client,
        require_api_key=False,
    )

    if isinstance(data, list):
        lower_query = query.lower().strip()
        results: list[dict[str, Any]] = []
        for item in data:
            name = str(item.get("name", ""))
            if lower_query in name.lower():
                results.append(item)
        return results

    for key in ("sites", "results", "stopPlaces", "stop_areas", "items"):
        value = data.get(key)
        if isinstance(value, list):
            lower_query = query.lower().strip()
            return [item for item in value if lower_query in str(item.get("name", "")).lower()]

    return []


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


async def fetch_realtime_departures_free(
    site_id: int,
    *,
    client: Optional[httpx.AsyncClient] = None,
) -> dict[str, Any]:
    url = SL_FREE_DEPARTURES_URL.format(site_id=site_id)
    return await _fetch_json(url, {}, client=client, require_api_key=False)


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


async def fetch_service_alerts_free(
    site_id: Optional[int] = None,
    *,
    transport_mode: Optional[str] = None,
    client: Optional[httpx.AsyncClient] = None,
) -> dict[str, Any]:
    params: dict[str, Any] = {}
    if site_id is not None:
        params["site"] = site_id
    if transport_mode:
        params["transport_mode"] = transport_mode.upper()

    data = await _fetch_json(
        SL_FREE_DEVIATIONS_URL,
        params,
        client=client,
        require_api_key=False,
    )

    if isinstance(data, list):
        return {"status": "ok", "alerts": data}

    alerts = data.get("messages") or data.get("ResponseData") or data.get("items") or []
    return {"status": "ok", "alerts": alerts}


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


def normalize_free_site_result(item: dict[str, Any]) -> dict[str, Any]:
    site_id = item.get("id") or item.get("siteId") or item.get("gid") or ""
    stop_areas = item.get("stop_areas") or item.get("stopAreas") or []

    return {
        "SiteId": str(site_id),
        "Name": item.get("name") or item.get("display_name") or item.get("title") or "",
        "Type": item.get("type") or item.get("transport_mode") or "Stop",
        "X": str(item.get("lon") or item.get("x") or ""),
        "Y": str(item.get("lat") or item.get("y") or ""),
        "StopAreas": stop_areas,
    }


def normalize_free_sites(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [normalize_free_site_result(item) for item in items]


def normalize_free_departure_payload(raw: dict[str, Any], site_id: int) -> dict[str, Any]:
    departures = raw.get("departures") if isinstance(raw, dict) else []
    if departures is None:
        departures = []

    buses = []
    for item in departures:
        line = item.get("line") or {}
        stop_deviations = item.get("deviations") or []
        buses.append(
            {
                "line_number": str(line.get("designation") or line.get("id") or ""),
                "destination": item.get("destination") or "",
                "display_time": item.get("display") or "",
                "expected_datetime": item.get("expected") or "",
                "journey_direction": item.get("direction_code") or 0,
                "group_of_line": line.get("group_of_lines") or "",
                "transport_mode": str(line.get("transport_mode") or "BUS").lower(),
                "deviations": stop_deviations if isinstance(stop_deviations, list) else [stop_deviations],
                "has_deviations": bool(stop_deviations),
            }
        )

    stop_deviations = raw.get("stop_deviations") if isinstance(raw, dict) else []
    if stop_deviations is None:
        stop_deviations = []

    return {
        "site_id": site_id,
        "site_name": raw.get("site_name", "") if isinstance(raw, dict) else "",
        "status": "ok",
        "buses": buses,
        "metros": [],
        "trains": [],
        "trams": [],
        "ships": [],
        "stop_deviations": stop_deviations,
    }
