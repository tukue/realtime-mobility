import unittest

import httpx

from services.sl_api import (
    fetch_realtime_departures,
    fetch_realtime_departures_free,
    fetch_service_alerts,
    fetch_service_alerts_free,
    get_nearby_free_boards,
    get_nearby_free_sites,
    normalize_departure_payload,
    normalize_free_departure_payload,
    normalize_free_site_result,
    normalize_free_sites,
    normalize_transport_data,
    search_stops,
    search_stops_free,
)


class MockApiClient:
    def __init__(self, routes):
        self.calls = []
        self._transport = httpx.MockTransport(self._handler)
        self._routes = routes

    async def __aenter__(self):
        self._client = httpx.AsyncClient(transport=self._transport, base_url="https://example.test")
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self._client.aclose()

    async def get(self, url, params=None, timeout=None):
        self.calls.append({"url": url, "params": params or {}, "timeout": timeout})
        return await self._client.get(url, params=params, timeout=timeout)

    def _handler(self, request: httpx.Request) -> httpx.Response:
        route = self._routes.get(f"{request.url.scheme}://{request.url.host}{request.url.path}")
        if route is None:
            route = self._routes.get(request.url.path)
        if route is None:
            return httpx.Response(404, request=request, json={"detail": "Not found"})
        if callable(route):
            route = route(request)
        if isinstance(route, tuple):
            payload, status_code = route
        else:
            payload, status_code = route, 200
        return httpx.Response(status_code, request=request, json=payload)


def mock_client(routes):
    return MockApiClient(routes)


class SlApiTests(unittest.IsolatedAsyncioTestCase):
    async def test_search_stops_passes_query_and_returns_data(self):
        async with mock_client(
            {
                "https://journeyplanner.integration.sl.se/v1/typeahead.json": {
                    "ResponseData": [{"SiteId": "123", "Name": "Norgegatan"}]
                }
            }
        ) as client:
            data = await search_stops("Norgegatan", client=client)

        self.assertEqual(data["ResponseData"][0]["Name"], "Norgegatan")
        self.assertEqual(client.calls[0]["params"]["searchstring"], "Norgegatan")

    async def test_search_stops_free_returns_sites_without_api_key(self):
        async with mock_client(
            {
                "https://transport.integration.sl.se/v1/sites": [
                    {
                        "id": 1079,
                        "name": "Norgegatan",
                        "lat": 59.3431180362708,
                        "lon": 18.0456865578456,
                    }
                ]
            }
        ) as client:
            data = await search_stops_free("Norgegatan", client=client)

        self.assertEqual(data[0]["name"], "Norgegatan")
        self.assertEqual(client.calls[0]["params"]["expand"], "true")

    async def test_get_nearby_free_sites_sorts_by_distance(self):
        async with mock_client(
            {
                "https://transport.integration.sl.se/v1/sites": [
                    {
                        "id": 1,
                        "name": "Far Stop",
                        "lat": 59.0,
                        "lon": 18.2,
                    },
                    {
                        "id": 2,
                        "name": "Norgegatan",
                        "lat": 59.3435,
                        "lon": 18.0459,
                    },
                ]
            }
        ) as client:
            data = await get_nearby_free_sites(59.3431180362708, 18.0456865578456, client=client)

        self.assertEqual(data[0]["Name"], "Norgegatan")
        self.assertIn("distance_meters", data[0])

    async def test_get_nearby_free_sites_skips_missing_coordinates(self):
        async with mock_client(
            {
                "https://transport.integration.sl.se/v1/sites": [
                    {
                        "id": 1,
                        "name": "Broken Stop",
                        "lat": None,
                        "lon": "",
                    },
                    {
                        "id": 2,
                        "name": "Norgegatan",
                        "lat": 59.3435,
                        "lon": 18.0459,
                    },
                ]
            }
        ) as client:
            data = await get_nearby_free_sites(59.3431180362708, 18.0456865578456, client=client)

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["Name"], "Norgegatan")
        self.assertEqual(data[0]["SiteId"], "2")

    async def test_get_nearby_free_sites_returns_empty_list_when_catalog_is_empty(self):
        async with mock_client({"https://transport.integration.sl.se/v1/sites": []}) as client:
            data = await get_nearby_free_sites(59.3431180362708, 18.0456865578456, client=client)

        self.assertEqual(data, [])

    async def test_get_nearby_free_boards_attaches_departure_previews(self):
        async with mock_client(
            {
                "https://transport.integration.sl.se/v1/sites": [
                    {
                        "id": 2,
                        "name": "Norgegatan",
                        "lat": 59.3435,
                        "lon": 18.0459,
                    }
                ],
                "https://transport.integration.sl.se/v1/sites/2/departures": {
                    "departures": [
                        {
                            "destination": "Radiohuset",
                            "display": "3 min",
                            "expected": "2026-03-29T12:03:00",
                            "line": {
                                "designation": "179",
                                "transport_mode": "BUS",
                                "group_of_lines": "Inner city",
                            },
                        }
                    ]
                },
            }
        ) as client:
            data = await get_nearby_free_boards(59.3431180362708, 18.0456865578456, client=client)

        self.assertEqual(data[0]["Name"], "Norgegatan")
        self.assertEqual(data[0]["departures"]["site_name"], "Norgegatan")
        self.assertEqual(data[0]["departures"]["buses"][0]["destination"], "Radiohuset")

    async def test_fetch_realtime_departures_returns_raw_data(self):
        async with mock_client(
            {
                "https://api.sl.se/api2/realtimedeparturesV4.json": {
                    "StatusCode": 0,
                    "ResponseData": {
                        "Buses": [
                            {
                                "LineNumber": "179",
                                "Destination": "Radiohuset",
                                "DisplayTime": "3 min",
                                "ExpectedDateTime": "2026-03-29T12:03:00",
                                "Deviations": [{"Text": "Minor delay"}],
                            }
                        ]
                    },
                }
            }
        ) as client:
            data = await fetch_realtime_departures(9117, client=client)

        self.assertEqual(data["StatusCode"], 0)
        self.assertEqual(client.calls[0]["params"]["siteid"], 9117)

    async def test_fetch_realtime_departures_free_returns_payload(self):
        async with mock_client(
            {
                "https://transport.integration.sl.se/v1/sites/9117/departures": {
                    "departures": [
                        {
                            "destination": "Radiohuset",
                            "display": "3 min",
                            "expected": "2026-03-29T12:03:00",
                            "line": {
                                "designation": "179",
                                "transport_mode": "BUS",
                                "group_of_lines": "Inner city",
                            },
                        }
                    ]
                }
            }
        ) as client:
            data = await fetch_realtime_departures_free(9117, client=client)

        self.assertEqual(data["departures"][0]["destination"], "Radiohuset")
        self.assertEqual(client.calls[0]["params"], {})

    async def test_fetch_service_alerts_returns_normalized_alerts(self):
        async with mock_client(
            {
                "https://api.sl.se/api2/deviations.json": {
                    "StatusCode": 0,
                    "ResponseData": [{"Text": "Service change"}],
                }
            }
        ) as client:
            data = await fetch_service_alerts(site_id=9117, client=client)

        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["alerts"][0]["Text"], "Service change")
        self.assertEqual(client.calls[0]["params"]["siteid"], 9117)

    async def test_fetch_service_alerts_free_returns_normalized_alerts(self):
        async with mock_client(
            {
                "https://deviations.integration.sl.se/v1/messages": [
                    {"message": "Service change", "importance": 5}
                ]
            }
        ) as client:
            data = await fetch_service_alerts_free(site_id=9117, transport_mode="bus", client=client)

        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["alerts"][0]["message"], "Service change")
        self.assertEqual(client.calls[0]["params"]["site"], 9117)

    async def test_fetch_service_alerts_handles_no_data(self):
        async with mock_client(
            {
                "https://api.sl.se/api2/deviations.json": {
                    "StatusCode": 1,
                    "Message": "No alerts",
                }
            }
        ) as client:
            data = await fetch_service_alerts(client=client)

        self.assertEqual(data["status"], "no_data")
        self.assertEqual(data["alerts"], [])

    def test_normalize_transport_data_adds_transport_mode_and_flags(self):
        payload = normalize_transport_data(
            [
                {
                    "LineNumber": "179",
                    "Destination": "Radiohuset",
                    "DisplayTime": "3 min",
                    "ExpectedDateTime": "2026-03-29T12:03:00",
                    "Deviations": [{"Text": "Minor delay"}],
                }
            ],
            "bus",
        )

        self.assertEqual(payload[0]["line_number"], "179")
        self.assertEqual(payload[0]["transport_mode"], "bus")
        self.assertTrue(payload[0]["has_deviations"])

    # departure payload normalization terminology
    def test_normalize_departure_payload_returns_consistent_shape(self):
        raw = {
            "StatusCode": 0,
            "ResponseData": {
                "Name": "Norgegatan",
                "Buses": [{"LineNumber": "179", "Destination": "Radiohuset"}],
                "Metros": [],
                "Trains": [],
                "Trams": [],
                "Ships": [],
            },
        }

        payload = normalize_departure_payload(raw, 9117)

        self.assertEqual(payload["site_id"], 9117)
        self.assertEqual(payload["site_name"], "Norgegatan")
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["buses"][0]["line_number"], "179")

    def test_normalize_free_site_result_returns_expected_shape(self):
        payload = normalize_free_site_result(
            {
                "id": 1079,
                "name": "Norgegatan",
                "lat": 59.3431180362708,
                "lon": 18.0456865578456,
            }
        )

        self.assertEqual(payload["SiteId"], "1079")
        self.assertEqual(payload["Name"], "Norgegatan")
        self.assertEqual(payload["Type"], "Stop")

    def test_normalize_free_sites_maps_list(self):
        payload = normalize_free_sites(
            [
                {
                    "id": 1079,
                    "name": "Norgegatan",
                    "lat": 59.3431180362708,
                    "lon": 18.0456865578456,
                }
            ]
        )

        self.assertEqual(payload[0]["SiteId"], "1079")

    def test_normalize_free_departure_payload_returns_consistent_shape(self):
        raw = {
            "departures": [
                {
                    "destination": "Radiohuset",
                    "display": "3 min",
                    "expected": "2026-03-29T12:03:00",
                    "direction_code": 1,
                    "line": {
                        "designation": "179",
                        "transport_mode": "BUS",
                        "group_of_lines": "Inner city",
                    },
                    "deviations": [{"message": "Minor delay"}],
                }
            ],
            "stop_deviations": [{"message": "Platform change"}],
        }

        payload = normalize_free_departure_payload(raw, 9117)

        self.assertEqual(payload["site_id"], 9117)
        self.assertEqual(payload["buses"][0]["line_number"], "179")
        self.assertEqual(payload["buses"][0]["transport_mode"], "bus")
        self.assertEqual(payload["status"], "ok")


if __name__ == "__main__":
    unittest.main()
