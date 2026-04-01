import unittest

import httpx

from main import app
from routers import nearby


class NearbyIntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def test_nearby_stops_endpoint_returns_ranked_results(self):
        async def fake_nearby(latitude, longitude, limit=5, client=None):
            return [
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

        original = nearby.get_nearby_free_sites
        nearby.get_nearby_free_sites = fake_nearby
        try:
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                response = await client.get(
                    "/api/nearby/stops",
                    params={"lat": 59.3431180362708, "lon": 18.0456865578456, "limit": 2, "source": "free"},
                )
        finally:
            nearby.get_nearby_free_sites = original

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["ResponseData"][0]["Name"], "Norgegatan")
        self.assertEqual(payload["ResponseData"][0]["distance_meters"], 123)
        self.assertEqual(payload["ResponseData"][1]["Name"], "Far Stop")


if __name__ == "__main__":
    unittest.main()
