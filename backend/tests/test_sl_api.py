import unittest

import httpx

from services.sl_api import (
    fetch_realtime_departures,
    fetch_realtime_departures_free,
    fetch_service_alerts,
    fetch_service_alerts_free,
    get_nearby_free_sites,
    normalize_departure_payload,
    normalize_free_departure_payload,
    normalize_free_site_result,
    normalize_free_sites,
    normalize_transport_data,
    search_stops,
    search_stops_free,
)


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code
        self.request = httpx.Request("GET", "https://example.test")

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError(
                "error",
                request=self.request,
                response=httpx.Response(self.status_code, request=self.request),
            )

    def json(self):
        return self._payload


class FakeClient:
    def __init__(self, payloads):
        self.payloads = payloads
        self.calls = []

    async def get(self, url, params=None, timeout=None):
        self.calls.append({"url": url, "params": params, "timeout": timeout})
        payload = self.payloads[url]
        if callable(payload):
            payload = payload(url=url, params=params, timeout=timeout)
        return payload


class SlApiTests(unittest.IsolatedAsyncioTestCase):
    async def test_search_stops_passes_query_and_returns_data(self):
        client = FakeClient(
            {
                "https://journeyplanner.integration.sl.se/v1/typeahead.json": FakeResponse(
                    {"ResponseData": [{"SiteId": "123", "Name": "Odenplan"}]}
                )
            }
        )

        data = await search_stops("Odenplan", client=client)

        self.assertEqual(data["ResponseData"][0]["Name"], "Odenplan")
        self.assertEqual(client.calls[0]["params"]["searchstring"], "Odenplan")

    async def test_search_stops_free_returns_sites_without_api_key(self):
        client = FakeClient(
            {
                "https://transport.integration.sl.se/v1/sites": FakeResponse(
                    [
                        {
                            "id": 1079,
                            "name": "Stockholm Odenplan",
                            "lat": 59.3431180362708,
                            "lon": 18.0456865578456,
                        }
                    ]
                )
            }
        )

        data = await search_stops_free("Odenplan", client=client)

        self.assertEqual(data[0]["name"], "Stockholm Odenplan")
        self.assertEqual(client.calls[0]["params"]["expand"], "true")

    async def test_get_nearby_free_sites_sorts_by_distance(self):
        client = FakeClient(
            {
                "https://transport.integration.sl.se/v1/sites": FakeResponse(
                    [
                        {
                            "id": 1,
                            "name": "Far Stop",
                            "lat": 59.0,
                            "lon": 18.2,
                        },
                        {
                            "id": 2,
                            "name": "Near Stop",
                            "lat": 59.3435,
                            "lon": 18.0459,
                        },
                    ]
                )
            }
        )

        data = await get_nearby_free_sites(59.3431180362708, 18.0456865578456, client=client)

        self.assertEqual(data[0]["Name"], "Near Stop")
        self.assertIn("distance_meters", data[0])

    async def test_fetch_realtime_departures_returns_raw_data(self):
        client = FakeClient(
            {
                "https://api.sl.se/api2/realtimedeparturesV4.json": FakeResponse(
                    {
                        "StatusCode": 0,
                        "ResponseData": {
                            "Buses": [
                                {
                                    "LineNumber": "4",
                                    "Destination": "Radiohuset",
                                    "DisplayTime": "3 min",
                                    "ExpectedDateTime": "2026-03-29T12:03:00",
                                    "Deviations": [{"Text": "Minor delay"}],
                                }
                            ]
                        },
                    }
                )
            }
        )

        data = await fetch_realtime_departures(9117, client=client)

        self.assertEqual(data["StatusCode"], 0)
        self.assertEqual(client.calls[0]["params"]["siteid"], 9117)

    async def test_fetch_realtime_departures_free_returns_payload(self):
        client = FakeClient(
            {
                "https://transport.integration.sl.se/v1/sites/9117/departures": FakeResponse(
                    {
                        "departures": [
                            {
                                "destination": "Radiohuset",
                                "display": "3 min",
                                "expected": "2026-03-29T12:03:00",
                                "line": {
                                    "designation": "4",
                                    "transport_mode": "BUS",
                                    "group_of_lines": "Inner city",
                                },
                            }
                        ]
                    }
                )
            }
        )

        data = await fetch_realtime_departures_free(9117, client=client)

        self.assertEqual(data["departures"][0]["destination"], "Radiohuset")
        self.assertEqual(client.calls[0]["params"], {})

    async def test_fetch_service_alerts_returns_normalized_alerts(self):
        client = FakeClient(
            {
                "https://api.sl.se/api2/deviations.json": FakeResponse(
                    {
                        "StatusCode": 0,
                        "ResponseData": [{"Text": "Service change"}],
                    }
                )
            }
        )

        data = await fetch_service_alerts(site_id=9117, client=client)

        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["alerts"][0]["Text"], "Service change")
        self.assertEqual(client.calls[0]["params"]["siteid"], 9117)

    async def test_fetch_service_alerts_free_returns_normalized_alerts(self):
        client = FakeClient(
            {
                "https://deviations.integration.sl.se/v1/messages": FakeResponse(
                    [
                        {"message": "Service change", "importance": 5}
                    ]
                )
            }
        )

        data = await fetch_service_alerts_free(site_id=9117, transport_mode="bus", client=client)

        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["alerts"][0]["message"], "Service change")
        self.assertEqual(client.calls[0]["params"]["site"], 9117)

    async def test_fetch_service_alerts_handles_no_data(self):
        client = FakeClient(
            {
                "https://api.sl.se/api2/deviations.json": FakeResponse(
                    {"StatusCode": 1, "Message": "No alerts"}
                )
            }
        )

        data = await fetch_service_alerts(client=client)

        self.assertEqual(data["status"], "no_data")
        self.assertEqual(data["alerts"], [])

    def test_normalize_transport_data_adds_transport_mode_and_flags(self):
        payload = normalize_transport_data(
            [
                {
                    "LineNumber": "4",
                    "Destination": "Radiohuset",
                    "DisplayTime": "3 min",
                    "ExpectedDateTime": "2026-03-29T12:03:00",
                    "Deviations": [{"Text": "Minor delay"}],
                }
            ],
            "bus",
        )

        self.assertEqual(payload[0]["line_number"], "4")
        self.assertEqual(payload[0]["transport_mode"], "bus")
        self.assertTrue(payload[0]["has_deviations"])

    def test_normalize_departure_payload_returns_consistent_shape(self):
        raw = {
            "StatusCode": 0,
            "ResponseData": {
                "Name": "Odenplan",
                "Buses": [{"LineNumber": "4", "Destination": "Radiohuset"}],
                "Metros": [],
                "Trains": [],
                "Trams": [],
                "Ships": [],
            },
        }

        payload = normalize_departure_payload(raw, 9117)

        self.assertEqual(payload["site_id"], 9117)
        self.assertEqual(payload["site_name"], "Odenplan")
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["buses"][0]["line_number"], "4")

    def test_normalize_free_site_result_returns_expected_shape(self):
        payload = normalize_free_site_result(
            {
                "id": 1079,
                "name": "Stockholm Odenplan",
                "lat": 59.3431180362708,
                "lon": 18.0456865578456,
            }
        )

        self.assertEqual(payload["SiteId"], "1079")
        self.assertEqual(payload["Name"], "Stockholm Odenplan")
        self.assertEqual(payload["Type"], "Stop")

    def test_normalize_free_sites_maps_list(self):
        payload = normalize_free_sites(
            [
                {
                    "id": 1079,
                    "name": "Stockholm Odenplan",
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
                        "designation": "4",
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
        self.assertEqual(payload["buses"][0]["line_number"], "4")
        self.assertEqual(payload["buses"][0]["transport_mode"], "bus")
        self.assertEqual(payload["status"], "ok")


if __name__ == "__main__":
    unittest.main()
