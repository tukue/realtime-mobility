import os
import unittest

from services.sl_api import (
    fetch_realtime_departures_free,
    normalize_free_departure_payload,
    normalize_free_site_result,
    search_stops_free,
)


@unittest.skipUnless(
    os.getenv("RUN_SL_LIVE_TESTS") == "1",
    "Set RUN_SL_LIVE_TESTS=1 to run live SL smoke tests",
)
class SlLiveSmokeTests(unittest.IsolatedAsyncioTestCase):
    async def test_free_search_returns_live_data(self):
        results = await search_stops_free("Odenplan")

        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 0)

        first = normalize_free_site_result(results[0])
        self.assertTrue(first["SiteId"])
        self.assertTrue(first["Name"])

    async def test_free_departures_returns_live_data(self):
        results = await search_stops_free("Odenplan")
        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 0)

        first = normalize_free_site_result(results[0])
        site_id_text = first["SiteId"]
        self.assertTrue(site_id_text)

        site_id = int("".join(ch for ch in site_id_text if ch.isdigit()))
        raw_departures = await fetch_realtime_departures_free(site_id)
        payload = normalize_free_departure_payload(raw_departures, site_id)

        self.assertEqual(payload["site_id"], site_id)
        self.assertIn("buses", payload)
        self.assertGreaterEqual(len(payload["buses"]), 0)


if __name__ == "__main__":
    unittest.main()
