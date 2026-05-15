import unittest

from routers import liveboard, nearby, realtime, situations


class RouteTests(unittest.IsolatedAsyncioTestCase):
    async def test_liveboard_route_returns_normalized_payload(self):
        async def fake_fetch(site_id, time_window=60, client=None):
            return {"ResponseData": {"Buses": [], "Name": "Test stop"}}

        original = liveboard.fetch_realtime_departures
        liveboard.fetch_realtime_departures = fake_fetch
        try:
            payload = await liveboard.get_formatted_liveboard(9117)
        finally:
            liveboard.fetch_realtime_departures = original

        self.assertEqual(payload["site_id"], 9117)
        self.assertEqual(payload["site_name"], "Test stop")

    async def test_realtime_search_route_delegates_to_service(self):
        async def fake_search(query, stations_only=False, max_results=10, client=None):
            return {"ResponseData": [{"Name": query}]}

        original = realtime.search_stops
        realtime.search_stops = fake_search
        try:
            payload = await realtime.search_site("Norgegatan")
        finally:
            realtime.search_stops = original

        self.assertEqual(payload["ResponseData"][0]["Name"], "Norgegatan")

    async def test_realtime_search_route_can_use_free_source(self):
        async def fake_search_free(query, client=None):
            return [{"name": query}]

        original = realtime.search_stops_free
        realtime.search_stops_free = fake_search_free
        try:
            payload = await realtime.search_site("Norgegatan", source="free")
        finally:
            realtime.search_stops_free = original

        self.assertEqual(payload["ResponseData"][0]["Name"], "Norgegatan")

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

    async def test_nearby_route_uses_free_source(self):
        async def fake_nearby(lat, lon, limit=5, client=None):
            return [
                {
                    "SiteId": "1079",
                    "Name": "Norgegatan",
                    "Type": "Stop",
                    "X": "18.0456865578456",
                    "Y": "59.3431180362708",
                    "distance_meters": 123,
                }
            ]

        original = nearby.get_nearby_free_sites
        nearby.get_nearby_free_sites = fake_nearby
        try:
            payload = await nearby.get_nearby_stops(lat=59.34, lon=18.04)
        finally:
            nearby.get_nearby_free_sites = original

        self.assertEqual(payload["ResponseData"][0]["Name"], "Norgegatan")
        self.assertEqual(payload["ResponseData"][0]["distance_meters"], 123)

    async def test_nearby_boards_route_attaches_departures(self):
        async def fake_boards(lat, lon, limit=3, client=None):
            return [
                {
                    "SiteId": "1079",
                    "Name": "Norgegatan",
                    "Type": "Stop",
                    "X": "18.0456865578456",
                    "Y": "59.3431180362708",
                    "distance_meters": 123,
                    "departures": {
                        "site_id": 1079,
                        "site_name": "Norgegatan",
                        "status": "ok",
                        "buses": [{"line_number": "179", "destination": "Radiohuset"}],
                        "metros": [],
                        "trains": [],
                        "trams": [],
                        "ships": [],
                    },
                }
            ]

        original = nearby.get_nearby_free_boards
        nearby.get_nearby_free_boards = fake_boards
        try:
            payload = await nearby.get_nearby_stop_boards(lat=59.34, lon=18.04)
        finally:
            nearby.get_nearby_free_boards = original

        self.assertEqual(payload["ResponseData"][0]["departures"]["buses"][0]["destination"], "Radiohuset")


if __name__ == "__main__":
    unittest.main()
