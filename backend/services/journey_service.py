from __future__ import annotations

import math
from datetime import datetime
from typing import Any, Optional
from zoneinfo import ZoneInfo

import httpx

from services.exceptions import SLApiError
from services.sl_api import _fetch_json
from services.sl_config import get_sl_journey_url

STOCKHOLM = ZoneInfo('Europe/Stockholm')


def _local_time(value: str | None) -> str:
    if not value:
        return ''
    dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if dt.tzinfo is not None:
        dt = dt.astimezone(STOCKHOLM)
    return dt.strftime('%H:%M')


def _station_name(location: dict[str, Any]) -> str:
    # Platform disassembledName can be a platform number; prefer its stop parent.
    if location.get('type') == 'platform':
        location = location.get('parent') or location
    return location.get('disassembledName') or location.get('name') or ''


def normalize_leg(raw: dict[str, Any]) -> dict[str, Any]:
    origin = raw.get('origin') or {}
    destination = raw.get('destination') or {}
    transport = raw.get('transportation') or {}
    product = transport.get('product') or {}
    mode = {0: 'train', 2: 'metro', 4: 'tram', 5: 'bus', 9: 'ship', 10: 'bus', 19: 'bus'}.get(
        product.get('class'), str(product.get('name') or '').lower())
    return {
        'origin': _station_name(origin),
        'destination': _station_name(destination),
        'departure_time': _local_time(origin.get('departureTimeEstimated') or origin.get('departureTimePlanned')),
        'arrival_time': _local_time(destination.get('arrivalTimeEstimated') or destination.get('arrivalTimePlanned')),
        'line_number': str(transport.get('number') or ''),
        'transport_mode': mode,
        'direction': (transport.get('destination') or {}).get('name') or '',
    }


def _global_site_id(site_id: str) -> str:
    # SL Transport search returns short site IDs; v2 trips uses global site IDs.
    if site_id.isascii() and site_id.isdigit() and len(site_id) <= 5:
        return f'9091001{int(site_id):09d}'
    return site_id


async def plan_journey(
    origin_id: str,
    destination_id: str,
    datetime_str: Optional[str] = None,
    max_changes: int = 3,
    *,
    client: Optional[httpx.AsyncClient] = None,
) -> dict[str, Any]:
    origin_id, destination_id = _global_site_id(origin_id), _global_site_id(destination_id)
    if origin_id == destination_id:
        raise ValueError('origin_id and destination_id must be different')
    params: dict[str, Any] = {
        'type_origin': 'any', 'name_origin': origin_id,
        'type_destination': 'any', 'name_destination': destination_id,
        'calc_number_of_trips': 3, 'max_changes': max(0, min(5, max_changes)),
        'language': 'en', 'calc_one_direction': 'true',
    }
    if datetime_str:
        dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
        if dt.tzinfo is not None:
            dt = dt.astimezone(STOCKHOLM)
        params.update(itd_date=dt.strftime('%Y%m%d'), itd_time=dt.strftime('%H%M'),
                      itd_trip_date_time_dep_arr='dep')

    # Provider failures must remain errors, not successful "no routes" responses.
    data = await _fetch_json(get_sl_journey_url(), params, client=client, require_api_key=False)
    raw_journeys = data.get('journeys')
    if not isinstance(raw_journeys, list):
        raise SLApiError('Journey provider returned an invalid response.', 502)
    if not raw_journeys and any(m.get('type') == 'error' for m in data.get('systemMessages', [])):
        raise SLApiError('Journey provider could not calculate routes. Please try again.', 502)

    journeys = sorted((j for j in raw_journeys if j.get('legs')),
                      key=lambda j: j['legs'][0]['origin'].get('departureTimeEstimated')
                      or j['legs'][0]['origin'].get('departureTimePlanned') or '')[:5]
    trips = []
    for journey in journeys:
        legs = [normalize_leg(leg) for leg in journey['legs']]
        duration = journey.get('tripRtDuration')
        if duration is None:
            duration = journey.get('tripDuration') or 0
        trips.append({
            'departure_time': legs[0]['departure_time'], 'arrival_time': legs[-1]['arrival_time'],
            'duration_minutes': math.ceil(float(duration) / 60),
            'changes': int(journey.get('interchanges') or 0), 'legs': legs,
        })
    return {
        'trips': trips,
        'origin_name': trips[0]['legs'][0]['origin'] if trips else '',
        'destination_name': trips[0]['legs'][-1]['destination'] if trips else '',
    }
