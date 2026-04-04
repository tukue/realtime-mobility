import unittest

import httpx

from services.sl_api import (
    fetch_realtime_departures_free,
    normalize_free_departure_payload,
    normalize_free_site_result,
    search_stops_free,
)


class MockApiClient:
    def __init__(self, routes):
        self.calls = []
        self._routes = routes
        self._transport = httpx.MockTransport(self._handler)

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


class SlMockedSmokeTests(unittest.IsolatedAsyncioTestCase):
    async def test_free_search_returns_mocked_data(self):
        async with mock_client(
            {
                "https://transport.integration.sl.se/v1/sites": [
                    {
                        "id": 1079,
                        "name": "Norgegatan",
                        "lat": 59.3431180362708,
                        "lon": 18.0456865578456,
                    },
                    {
                        "id": 9999,
                        "name": "Other Stop",
                        "lat": 59.0,
                        "lon": 18.0,
                    },
                ]
            }
        ) as client:
            results = await search_stops_free("Norgegatan", client=client)

        self.assertEqual(len(results), 1)
        first = normalize_free_site_result(results[0])
        self.assertEqual(first["SiteId"], "1079")
        self.assertEqual(first["Name"], "Norgegatan")

    async def test_free_departures_returns_mocked_data(self):
        async with mock_client(
            {
                "https://transport.integration.sl.se/v1/sites/1079/departures": {
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
            raw_departures = await fetch_realtime_departures_free(1079, client=client)
            payload = normalize_free_departure_payload(raw_departures, 1079)

        self.assertEqual(payload["site_id"], 1079)
        self.assertEqual(payload["buses"][0]["destination"], "Radiohuset")
        self.assertEqual(payload["buses"][0]["transport_mode"], "bus")
        self.assertEqual(client.calls[0]["params"], {})


if __name__ == "__main__":
    unittest.main()
