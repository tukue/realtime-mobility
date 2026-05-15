"""
Tests for Journey Planning — Requirements 5 & 6.
Covers: normalize_leg, plan_journey, journey router.
"""
from __future__ import annotations

import unittest
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from services.journey_service import normalize_leg, plan_journey
from routers.journey import router


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_app():
    app = FastAPI()
    app.include_router(router, prefix="/api/journey")
    return app


def _raw_leg(
    origin="T-Centralen", destination="Slussen",
    dep="10:00", arr="10:05",
    line="17", mode="TRAM", direction="Djurgården",
) -> dict:
    return {
        "Origin": {"name": origin, "time": dep},
        "Destination": {"name": destination, "time": arr},
        "Product": {"num": line, "catOut": mode},
        "direction": direction,
    }


def _raw_trip(dep="10:00", arr="10:30", dur="30", chg=1, legs=None) -> dict:
    if legs is None:
        legs = [_raw_leg()]
    return {
        "Origin": {"name": "T-Centralen", "time": dep},
        "Destination": {"name": "Slussen", "time": arr},
        "dur": dur,
        "chg": chg,
        "LegList": {"Leg": legs},
    }


# ---------------------------------------------------------------------------
# segment normalization — Requirement 6
# ---------------------------------------------------------------------------

class TestNormalizeLeg(unittest.TestCase):

    def test_full_leg_maps_all_fields(self):
        leg = normalize_leg(_raw_leg())
        self.assertEqual(leg["origin"], "T-Centralen")
        self.assertEqual(leg["destination"], "Slussen")
        self.assertEqual(leg["departure_time"], "10:00")
        self.assertEqual(leg["arrival_time"], "10:05")
        self.assertEqual(leg["line_number"], "17")
        self.assertEqual(leg["transport_mode"], "tram")   # lowercased
        self.assertEqual(leg["direction"], "Djurgården")

    def test_missing_keys_default_to_empty_string(self):
        leg = normalize_leg({})
        for field in ("origin", "destination", "departure_time", "arrival_time",
                      "line_number", "transport_mode", "direction"):
            self.assertEqual(leg[field], "", f"Expected '' for {field}")

    def test_partial_leg_does_not_raise(self):
        leg = normalize_leg({"Origin": {"name": "Odenplan"}})
        self.assertEqual(leg["origin"], "Odenplan")
        self.assertEqual(leg["destination"], "")

    def test_transport_mode_is_lowercased(self):
        leg = normalize_leg({"Product": {"catOut": "METRO"}})
        self.assertEqual(leg["transport_mode"], "metro")

    def test_all_string_fields_are_strings(self):
        """Property: all string fields are non-None strings for any dict input."""
        for raw in [{}, _raw_leg(), {"Origin": None, "Product": None}]:
            leg = normalize_leg(raw)
            for field in ("origin", "destination", "departure_time",
                          "arrival_time", "line_number", "transport_mode", "direction"):
                self.assertIsInstance(leg[field], str, f"{field} should be str")


# ---------------------------------------------------------------------------
# plan_journey — Requirements 5 & 6
# ---------------------------------------------------------------------------

class TestPlanJourney(unittest.IsolatedAsyncioTestCase):

    async def test_returns_sorted_trips(self):
        trips = [_raw_trip(dep="10:30"), _raw_trip(dep="10:00"), _raw_trip(dep="10:15")]
        with patch("services.journey_service._fetch_json",
                   new=AsyncMock(return_value={"Trip": trips})):
            result = await plan_journey("1001", "2002")

        dep_times = [t["departure_time"] for t in result["trips"]]
        self.assertEqual(dep_times, sorted(dep_times))

    async def test_returns_at_most_5_trips(self):
        trips = [_raw_trip(dep=f"10:{i:02d}") for i in range(8)]
        with patch("services.journey_service._fetch_json",
                   new=AsyncMock(return_value={"Trip": trips})):
            result = await plan_journey("1001", "2002")

        self.assertLessEqual(len(result["trips"]), 5)

    async def test_empty_trips_when_no_routes(self):
        with patch("services.journey_service._fetch_json",
                   new=AsyncMock(return_value={"Trip": []})):
            result = await plan_journey("1001", "2002")

        self.assertEqual(result["trips"], [])

    async def test_empty_trips_on_sl_api_error(self):
        from services.sl_api import SLApiError
        with patch("services.journey_service._fetch_json",
                   new=AsyncMock(side_effect=SLApiError("timeout", 504))):
            result = await plan_journey("1001", "2002")

        self.assertEqual(result["trips"], [])

    async def test_raises_on_same_origin_destination(self):
        with self.assertRaises(ValueError):
            await plan_journey("1001", "1001")

    async def test_max_changes_clamped_to_0_5(self):
        with patch("services.journey_service._fetch_json",
                   new=AsyncMock(return_value={"Trip": []})) as mock:
            await plan_journey("1001", "2002", max_changes=99)
            params = mock.call_args[0][1]
            self.assertLessEqual(params["maxChanges"], 5)

            await plan_journey("1001", "2002", max_changes=-3)
            params = mock.call_args[0][1]
            self.assertGreaterEqual(params["maxChanges"], 0)

    async def test_each_trip_has_at_least_one_leg(self):
        trips = [_raw_trip()]
        with patch("services.journey_service._fetch_json",
                   new=AsyncMock(return_value={"Trip": trips})):
            result = await plan_journey("1001", "2002")

        for trip in result["trips"]:
            self.assertGreaterEqual(len(trip["legs"]), 1)

    async def test_trips_sorted_property(self):
        """Property: trips are always sorted by departure_time."""
        import random
        times = [f"{h:02d}:{m:02d}" for h in range(8, 12) for m in range(0, 60, 10)]
        random.shuffle(times)
        trips = [_raw_trip(dep=t) for t in times[:6]]
        with patch("services.journey_service._fetch_json",
                   new=AsyncMock(return_value={"Trip": trips})):
            result = await plan_journey("1001", "2002")

        dep_times = [t["departure_time"] for t in result["trips"]]
        self.assertEqual(dep_times, sorted(dep_times))


# ---------------------------------------------------------------------------
# Journey router — POST /api/journey/plan
# ---------------------------------------------------------------------------

class TestJourneyRouter(unittest.TestCase):

    def setUp(self):
        self.app = _make_app()
        self.client = TestClient(self.app)

    def test_valid_request_returns_200_with_trips(self):
        result = {"trips": [_raw_trip()], "origin_name": "A", "destination_name": "B"}
        with patch("routers.journey.plan_journey", new=AsyncMock(return_value=result)):
            response = self.client.post(
                "/api/journey/plan",
                json={"origin_id": "1001", "destination_id": "2002"},
            )
        self.assertEqual(response.status_code, 200)
        self.assertIn("trips", response.json())

    def test_same_origin_destination_returns_400(self):
        response = self.client.post(
            "/api/journey/plan",
            json={"origin_id": "1001", "destination_id": "1001"},
        )
        self.assertEqual(response.status_code, 400)

    def test_empty_trips_returns_200(self):
        result = {"trips": [], "origin_name": "A", "destination_name": "B"}
        with patch("routers.journey.plan_journey", new=AsyncMock(return_value=result)):
            response = self.client.post(
                "/api/journey/plan",
                json={"origin_id": "1001", "destination_id": "2002"},
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["trips"], [])

    def test_missing_origin_returns_422(self):
        response = self.client.post(
            "/api/journey/plan",
            json={"destination_id": "2002"},
        )
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
