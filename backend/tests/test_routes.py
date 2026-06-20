import unittest
from unittest.mock import AsyncMock, patch

from routers import liveboard, nearby, realtime, situations


class RouteTests(unittest.IsolatedAsyncioTestCase):
    @patch("routers.realtime.search_stops", new=AsyncMock())
    async def test_realtime_search_route_delegates_to_service(self):
        realtime.search_stops.return_value = {"ResponseData": [{"Name": "Norgegatan"}]}
        payload = await realtime.search_site("Norgegatan")
        self.assertEqual(payload["ResponseData"][0]["Name"], "Norgegatan")

    @patch("routers.realtime.search_stops_free", new=AsyncMock())
    async def test_realtime_search_route_can_use_free_source(self):
        realtime.search_stops_free.return_value = [{"name": "Norgegatan"}]
        payload = await realtime.search_site("Norgegatan", source="free")
        self.assertEqual(payload["ResponseData"][0]["Name"], "Norgegatan")

    @patch("routers.liveboard.fetch_realtime_departures", new=AsyncMock())
    async def test_liveboard_route_returns_normalized_payload(self):
        liveboard.fetch_realtime_departures.return_value = {
            "ResponseData": {"Buses": [], "Name": "Test stop"}
        }
        payload = await liveboard.get_formatted_liveboard(9117)
        self.assertEqual(payload["site_id"], 9117)
        self.assertEqual(payload["site_name"], "Test stop")

    @patch("routers.situations.fetch_service_alerts", new=AsyncMock())
    async def test_situations_route_delegates_to_service(self):
        situations.fetch_service_alerts.return_value = {
            "status": "ok", "alerts": [{"Text": "Delay"}]
        }
        payload = await situations.get_service_alerts(site_id=9117)
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["alerts"][0]["Text"], "Delay")

    @patch("routers.situations.fetch_service_alerts_free", new=AsyncMock())
    async def test_situations_route_can_use_free_source(self):
        situations.fetch_service_alerts_free.return_value = {
            "status": "ok", "alerts": [{"message": "Delay"}]
        }
        payload = await situations.get_service_alerts(site_id=9117, source="free")
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["alerts"][0]["message"], "Delay")

    @patch("routers.nearby.get_nearby_free_sites", new=AsyncMock())
    async def test_nearby_route_uses_free_source(self):
        nearby.get_nearby_free_sites.return_value = [
            {
                "SiteId": "1079",
                "Name": "Norgegatan",
                "Type": "Stop",
                "X": "18.0456865578456",
                "Y": "59.3431180362708",
                "distance_meters": 123,
            }
        ]
        payload = await nearby.get_nearby_stops(lat=59.34, lon=18.04)
        self.assertEqual(payload["ResponseData"][0]["Name"], "Norgegatan")
        self.assertEqual(payload["ResponseData"][0]["distance_meters"], 123)

    @patch("routers.nearby.get_nearby_free_boards", new=AsyncMock())
    async def test_nearby_boards_route_attaches_departures(self):
        nearby.get_nearby_free_boards.return_value = [
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
        payload = await nearby.get_nearby_stop_boards(lat=59.34, lon=18.04)
        self.assertEqual(
            payload["ResponseData"][0]["departures"]["buses"][0]["destination"],
            "Radiohuset",
        )


if __name__ == "__main__":
    unittest.main()
