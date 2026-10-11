"""SL v2 wire-contract regression tests; all station/timetable data are fixtures."""
import unittest
from unittest.mock import AsyncMock, patch

import httpx

from services.exceptions import SLApiError
from services.journey_service import plan_journey


def journey(dep='08:00', arr='08:20'):
    return {'tripDuration': 1200, 'interchanges': 0, 'legs': [{
        'origin': {'name': 'Norgegatan', 'departureTimePlanned': f'2026-10-11T{dep}:00Z'},
        'destination': {'name': 'Sollentuna', 'arrivalTimePlanned': f'2026-10-11T{arr}:00Z'},
        'transportation': {'number': 'sample-line', 'product': {'class': 5},
                           'destination': {'name': 'Sollentuna'}},
    }]}


class JourneyV2Tests(unittest.IsolatedAsyncioTestCase):
    async def test_norgegatan_to_sollentuna_uses_v2_and_normalizes_response(self):
        def provider(request):
            self.assertEqual(request.url.path, '/v2/trips')
            # Fixture-only short IDs; not asserted to be real station IDs.
            self.assertEqual(request.url.params['name_origin'], '9091001000001234')
            self.assertEqual(request.url.params['name_destination'], '9091001000005678')
            self.assertEqual(request.url.params['calc_number_of_trips'], '3')
            self.assertNotIn('originId', request.url.params)
            return httpx.Response(200, json={'journeys': [journey()]})
        async with httpx.AsyncClient(transport=httpx.MockTransport(provider)) as client:
            result = await plan_journey('1234', '5678', client=client)
        self.assertEqual(result['origin_name'], 'Norgegatan')
        self.assertEqual(result['destination_name'], 'Sollentuna')
        trip = result['trips'][0]
        self.assertEqual(trip['departure_time'], '10:00')
        self.assertEqual(trip['arrival_time'], '10:20')
        self.assertEqual(trip['duration_minutes'], 20)
        self.assertEqual(trip['legs'][0]['transport_mode'], 'bus')

    async def test_global_ids_are_preserved_and_dates_use_stockholm_time(self):
        with patch('services.journey_service._fetch_json', new=AsyncMock(return_value={'journeys': []})) as fetch:
            await plan_journey('9091001000001234', '9091001000005678', '2026-10-11T23:30:00Z')
        params = fetch.call_args.args[1]
        self.assertEqual(params['name_origin'], '9091001000001234')
        self.assertEqual(params['itd_date'], '20261012')
        self.assertEqual(params['itd_time'], '0130')

    async def test_upstream_http_error_is_not_an_empty_success(self):
        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda req: httpx.Response(503))) as client:
            with self.assertRaises(SLApiError) as raised:
                await plan_journey('1234', '5678', client=client)
        self.assertEqual(raised.exception.status_code, 502)

    async def test_provider_errors_and_unknown_schema_are_not_empty_successes(self):
        for payload in [{}, {'Trip': []}, {'journeys': [], 'systemMessages': [{'type': 'error'}]}]:
            with self.subTest(payload=payload), patch('services.journey_service._fetch_json', new=AsyncMock(return_value=payload)):
                with self.assertRaises(SLApiError):
                    await plan_journey('1234', '5678')

    async def test_real_empty_result_is_preserved(self):
        with patch('services.journey_service._fetch_json', new=AsyncMock(return_value={'journeys': []})):
            self.assertEqual((await plan_journey('1234', '5678'))['trips'], [])

    async def test_same_station_in_short_and_global_formats_is_rejected(self):
        with self.assertRaises(ValueError):
            await plan_journey('1234', '9091001000001234')

    async def test_midnight_journeys_sort_by_date_not_display_time(self):
        with patch('services.journey_service._fetch_json', new=AsyncMock(return_value={
            'journeys': [journey('22:30', '22:50'), journey('21:30', '21:50')],
        })):
            result = await plan_journey('1234', '5678')
        self.assertEqual([t['departure_time'] for t in result['trips']], ['23:30', '00:30'])
