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
    if not isinstance(data, dict):
        raise SLApiError('Journey provider returned an invalid response.', 502)
    raw_journeys = data.get('journeys')
    if not isinstance(raw_journeys, list):
        raise SLApiError('Journey provider returned an invalid response.', 502)
    messages = data.get('systemMessages') or []
    if not isinstance(messages, list):
        raise SLApiError('Journey provider returned invalid system messages.', 502)
    if not raw_journeys and any(isinstance(m, dict) and m.get('type') == 'error' for m in messages):
        raise SLApiError('Journey provider could not calculate routes. Please try again.', 502)

    # Validate the provider structure before sorting or dereferencing leg fields.
    journeys = []
    for journey in raw_journeys:
        if not isinstance(journey, dict) or not isinstance(journey.get('legs'), list):
            raise SLApiError('Journey provider returned invalid journey legs.', 502)
        if not journey['legs']:
            continue
        if any(not isinstance(leg, dict)
               or not isinstance(leg.get('origin'), dict)
               or not isinstance(leg.get('destination'), dict) for leg in journey['legs']):
            raise SLApiError('Journey provider returned invalid journey endpoints.', 502)
        journeys.append(journey)

    def departure(journey: dict[str, Any]) -> str:
        origin = journey['legs'][0]['origin']
        value = origin.get('departureTimeEstimated') or origin.get('departureTimePlanned') or ''
        if not isinstance(value, str):
            raise SLApiError('Journey provider returned an invalid departure time.', 502)
        return value

    journeys.sort(key=departure)
    trips = []
    for journey in journeys[:5]:
        try:
            legs = [normalize_leg(leg) for leg in journey['legs']]
            duration = journey.get('tripRtDuration')
            if duration is None:
                duration = journey.get('tripDuration') or 0
            trips.append({
                'departure_time': legs[0]['departure_time'], 'arrival_time': legs[-1]['arrival_time'],
                'duration_minutes': math.ceil(float(duration) / 60),
                'changes': int(journey.get('interchanges') or 0), 'legs': legs,
            })
        except (AttributeError, TypeError, ValueError, OverflowError) as exc:
            raise SLApiError('Journey provider returned invalid trip details.', 502) from exc
    first_legs = trips[0]['legs'] if trips else []
    return {
        'trips': trips,
        'origin_name': first_legs[0]['origin'] if first_legs else '',
        'destination_name': first_legs[-1]['destination'] if first_legs else '',
    }
