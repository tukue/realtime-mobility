import unittest
from unittest.mock import AsyncMock, patch

import httpx

from main import app


class NearbyIntegrationTests(unittest.IsolatedAsyncioTestCase):
    @patch("routers.nearby.get_nearby_free_sites", new=AsyncMock())
    async def test_nearby_stops_endpoint_returns_ranked_results(self):
        from routers import nearby

        nearby.get_nearby_free_sites.return_value = [
            {
                "SiteId": "2",
                "Name": "Norgegatan",
                "Type": "Stop",
                "X": "18.0459",
                "Y": "59.3435",
                "distance_meters": 123,
            },
            {
                "SiteId": "1",
                "Name": "Far Stop",
                "Type": "Stop",
                "X": "18.2000",
                "Y": "59.0000",
                "distance_meters": 5000,
            },
        ]

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get(
                "/api/nearby/stops",
                params={"lat": 59.3431180362708, "lon": 18.0456865578456, "limit": 2, "source": "free"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["ResponseData"][0]["Name"], "Norgegatan")
        self.assertEqual(payload["ResponseData"][0]["distance_meters"], 123)
        self.assertEqual(payload["ResponseData"][1]["Name"], "Far Stop")


if __name__ == "__main__":
    unittest.main()
