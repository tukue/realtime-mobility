import unittest

from routers import departures, realtime, situations


class RouteTests(unittest.IsolatedAsyncioTestCase):
    async def test_departures_route_returns_normalized_payload(self):
        async def fake_fetch(site_id, time_window=60, client=None):
            return {"ResponseData": {"Buses": [], "Name": "Test stop"}}

        original = departures.fetch_realtime_departures
        departures.fetch_realtime_departures = fake_fetch
        try:
            payload = await departures.get_formatted_departures(9117)
        finally:
            departures.fetch_realtime_departures = original

        self.assertEqual(payload["site_id"], 9117)
        self.assertEqual(payload["site_name"], "Test stop")

    async def test_realtime_search_route_delegates_to_service(self):
        async def fake_search(query, stations_only=False, max_results=10, client=None):
            return {"ResponseData": [{"Name": query}]}

        original = realtime.search_stops
        realtime.search_stops = fake_search
        try:
            payload = await realtime.search_site("Odenplan")
        finally:
            realtime.search_stops = original

        self.assertEqual(payload["ResponseData"][0]["Name"], "Odenplan")

    async def test_realtime_search_route_can_use_free_source(self):
        async def fake_search_free(query, client=None):
            return [{"name": query}]

        original = realtime.search_stops_free
        realtime.search_stops_free = fake_search_free
        try:
            payload = await realtime.search_site("Odenplan", source="free")
        finally:
            realtime.search_stops_free = original

        self.assertEqual(payload["ResponseData"][0]["Name"], "Odenplan")

    async def test_situations_route_delegates_to_service(self):
        async def fake_alerts(site_id=None, transport_mode=None, client=None):
            return {"status": "ok", "alerts": [{"Text": "Delay"}]}

        original = situations.fetch_service_alerts
        situations.fetch_service_alerts = fake_alerts
        try:
            payload = await situations.get_service_alerts(site_id=9117)
        finally:
            situations.fetch_service_alerts = original

        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["alerts"][0]["Text"], "Delay")

    async def test_situations_route_can_use_free_source(self):
        async def fake_alerts_free(site_id=None, transport_mode=None, client=None):
            return {"status": "ok", "alerts": [{"message": "Delay"}]}

        original = situations.fetch_service_alerts_free
        situations.fetch_service_alerts_free = fake_alerts_free
        try:
            payload = await situations.get_service_alerts(site_id=9117, source="free")
        finally:
            situations.fetch_service_alerts_free = original

        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["alerts"][0]["message"], "Delay")


if __name__ == "__main__":
    unittest.main()
