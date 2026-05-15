"""
Tests for Disruption Alerts — Requirements 1, 2, 3, 4.
Covers: alerts_service, AlertsConnectionManager, AlertsPoller, REST router.
"""
from __future__ import annotations

import unittest
from unittest.mock import AsyncMock, patch

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from services.alerts_service import fetch_alerts_for_site, map_severity
from services.alerts_manager import AlertsConnectionManager, AlertsPoller
from routers.alerts import router


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_app():
    app = FastAPI()
    app.include_router(router, prefix="/api/alerts")
    return app


def _make_ws():
    ws = AsyncMock()
    ws.send_json = AsyncMock()
    return ws


def _broadcasts_of_type(ws: AsyncMock, msg_type: str) -> list:
    """Return all send_json call payloads matching a given message type."""
    return [c[0][0] for c in ws.send_json.call_args_list
            if c[0][0].get("type") == msg_type]


# ---------------------------------------------------------------------------
# map_severity — property: output always in valid set
# ---------------------------------------------------------------------------

class TestMapSeverity(unittest.TestCase):
    VALID = {"info", "warning", "critical"}

    def test_critical_keywords(self):
        for kw in ("critical", "high", "severe", "major", "CRITICAL", "HIGH"):
            self.assertEqual(map_severity(kw), "critical")

    def test_warning_keywords(self):
        for kw in ("warning", "medium", "moderate", "WARNING"):
            self.assertEqual(map_severity(kw), "warning")

    def test_unknown_defaults_to_info(self):
        for kw in ("", "unknown", "low", "xyz", "normal"):
            result = map_severity(kw)
            self.assertEqual(result, "info", f"Expected 'info' for {kw!r}, got {result!r}")

    def test_output_always_in_valid_set(self):
        """Property: for any string, map_severity returns a valid severity."""
        inputs = ["", "critical", "HIGH", "warning", "MEDIUM", "low", "abc", "123", None]
        for raw in inputs:
            result = map_severity(raw or "")
            self.assertIn(result, self.VALID, f"Invalid severity {result!r} for input {raw!r}")


# ---------------------------------------------------------------------------
# fetch_alerts_for_site
# ---------------------------------------------------------------------------

class TestFetchAlertsForSite(unittest.IsolatedAsyncioTestCase):

    async def test_returns_normalised_alerts_on_success(self):
        raw_alerts = [
            {"id": "1", "header": "Delay on line 55", "severity": "high",
             "details": "Expect 10 min delay", "scope": ["55"]},
        ]
        with patch("services.alerts_service.fetch_service_alerts_free",
                   new=AsyncMock(return_value={"status": "ok", "alerts": raw_alerts})):
            result = await fetch_alerts_for_site(9001)

        self.assertEqual(result["status"], "ok")
        self.assertEqual(len(result["alerts"]), 1)
        alert = result["alerts"][0]
        self.assertEqual(alert["id"], "1")
        self.assertEqual(alert["severity"], "critical")   # "high" → "critical"
        self.assertEqual(alert["scope"], ["55"])

    async def test_severity_always_valid(self):
        raw_alerts = [
            {"id": "a", "severity": "unknown_value"},
            {"id": "b", "severity": ""},
            {"id": "c"},
        ]
        with patch("services.alerts_service.fetch_service_alerts_free",
                   new=AsyncMock(return_value={"status": "ok", "alerts": raw_alerts})):
            result = await fetch_alerts_for_site(9001)

        for alert in result["alerts"]:
            self.assertIn(alert["severity"], {"info", "warning", "critical"})

    async def test_returns_empty_on_sl_api_error(self):
        from services.sl_api import SLApiError
        with patch("services.alerts_service.fetch_service_alerts_free",
                   new=AsyncMock(side_effect=SLApiError("timeout", 504))):
            result = await fetch_alerts_for_site(9001)

        self.assertEqual(result["status"], "error")
        self.assertEqual(result["alerts"], [])
        self.assertEqual(result["stop_deviations"], [])
        self.assertIn("message", result)

    async def test_returns_empty_list_when_no_alerts(self):
        with patch("services.alerts_service.fetch_service_alerts_free",
                   new=AsyncMock(return_value={"status": "ok", "alerts": []})):
            result = await fetch_alerts_for_site(9001)

        self.assertEqual(result["alerts"], [])
        self.assertEqual(result["status"], "ok")

    async def test_handles_missing_fields_gracefully(self):
        """normalize_alert must not raise on partial/empty dicts."""
        raw_alerts = [{}, {"id": None}, {"severity": None, "scope": None}]
        with patch("services.alerts_service.fetch_service_alerts_free",
                   new=AsyncMock(return_value={"status": "ok", "alerts": raw_alerts})):
            result = await fetch_alerts_for_site(9001)

        self.assertEqual(len(result["alerts"]), 3)
        for alert in result["alerts"]:
            self.assertIsInstance(alert["header"], str)
            self.assertIn(alert["severity"], {"info", "warning", "critical"})


# ---------------------------------------------------------------------------
# AlertsConnectionManager
# ---------------------------------------------------------------------------

class TestAlertsConnectionManager(unittest.IsolatedAsyncioTestCase):

    async def test_connect_accepts_and_sends_connected_message(self):
        mgr = AlertsConnectionManager()
        ws = _make_ws()
        await mgr.connect(ws, "9001")

        ws.accept.assert_called_once()
        ws.send_json.assert_called_once_with({"type": "connected", "site_id": "9001"})
        self.assertEqual(mgr.subscriber_count("9001"), 1)

    async def test_disconnect_removes_socket(self):
        mgr = AlertsConnectionManager()
        ws = _make_ws()
        await mgr.connect(ws, "9001")
        await mgr.disconnect(ws, "9001")

        self.assertEqual(mgr.subscriber_count("9001"), 0)
        self.assertNotIn("9001", mgr.active_site_ids())

    async def test_subscriber_count_is_non_negative(self):
        """Property: subscriber_count never goes below 0."""
        mgr = AlertsConnectionManager()
        ws = _make_ws()
        await mgr.disconnect(ws, "9001")
        self.assertGreaterEqual(mgr.subscriber_count("9001"), 0)

    async def test_active_site_ids_excludes_empty_sites(self):
        mgr = AlertsConnectionManager()
        ws = _make_ws()
        await mgr.connect(ws, "9001")
        await mgr.disconnect(ws, "9001")

        self.assertNotIn("9001", mgr.active_site_ids())

    async def test_broadcast_sends_to_all_subscribers(self):
        mgr = AlertsConnectionManager()
        ws1, ws2 = _make_ws(), _make_ws()
        await mgr.connect(ws1, "9001")
        await mgr.connect(ws2, "9001")

        payload = {"type": "alerts", "site_id": "9001", "data": {}}
        await mgr.broadcast("9001", payload)

        ws1.send_json.assert_called_with(payload)
        ws2.send_json.assert_called_with(payload)

    async def test_broadcast_removes_disconnected_socket(self):
        mgr = AlertsConnectionManager()
        ws = _make_ws()
        # First call (connect message) succeeds; second call (broadcast) raises
        ws.send_json.side_effect = [None, WebSocketDisconnect()]
        await mgr.connect(ws, "9001")

        await mgr.broadcast("9001", {"type": "alerts"})

        self.assertEqual(mgr.subscriber_count("9001"), 0)

    async def test_broadcast_to_empty_site_is_noop(self):
        mgr = AlertsConnectionManager()
        await mgr.broadcast("nonexistent", {"type": "alerts"})

    async def test_multiple_sites_are_independent(self):
        mgr = AlertsConnectionManager()
        ws1, ws2 = _make_ws(), _make_ws()
        await mgr.connect(ws1, "9001")
        await mgr.connect(ws2, "9002")

        await mgr.broadcast("9001", {"type": "alerts", "site_id": "9001"})

        ws1.send_json.assert_called()
        self.assertEqual(len(_broadcasts_of_type(ws2, "alerts")), 0)


# ---------------------------------------------------------------------------
# AlertsPoller
# ---------------------------------------------------------------------------

class TestAlertsPoller(unittest.IsolatedAsyncioTestCase):

    async def test_tick_broadcasts_alerts_to_active_sites(self):
        mgr = AlertsConnectionManager()
        ws = _make_ws()
        await mgr.connect(ws, "9001")

        alert_data = {"status": "ok", "alerts": [], "stop_deviations": []}
        with patch("services.alerts_manager.fetch_alerts_for_site",
                   new=AsyncMock(return_value=alert_data)):
            poller = AlertsPoller(mgr, interval=60)
            async with httpx.AsyncClient() as client:
                await poller._tick(client)

        broadcasts = _broadcasts_of_type(ws, "alerts")
        self.assertEqual(len(broadcasts), 1)
        self.assertEqual(broadcasts[0]["site_id"], "9001")
        self.assertIn("timestamp", broadcasts[0])

    async def test_tick_broadcasts_error_on_sl_failure(self):
        mgr = AlertsConnectionManager()
        ws = _make_ws()
        await mgr.connect(ws, "9001")

        with patch("services.alerts_manager.fetch_alerts_for_site",
                   new=AsyncMock(side_effect=Exception("SL timeout"))):
            poller = AlertsPoller(mgr, interval=60)
            async with httpx.AsyncClient() as client:
                await poller._tick(client)

        errors = _broadcasts_of_type(ws, "error")
        self.assertEqual(len(errors), 1)
        self.assertIn("SL timeout", errors[0]["message"])

    async def test_tick_skips_when_no_subscribers(self):
        mgr = AlertsConnectionManager()

        with patch("services.alerts_manager.fetch_alerts_for_site",
                   new=AsyncMock()) as mock_fetch:
            poller = AlertsPoller(mgr, interval=60)
            async with httpx.AsyncClient() as client:
                await poller._tick(client)

        mock_fetch.assert_not_called()

    async def test_every_active_site_receives_exactly_one_broadcast_per_tick(self):
        """Property: each site with subscribers gets exactly one broadcast per tick."""
        mgr = AlertsConnectionManager()
        ws1, ws2 = _make_ws(), _make_ws()
        await mgr.connect(ws1, "9001")
        await mgr.connect(ws2, "9002")

        alert_data = {"status": "ok", "alerts": [], "stop_deviations": []}
        with patch("services.alerts_manager.fetch_alerts_for_site",
                   new=AsyncMock(return_value=alert_data)):
            poller = AlertsPoller(mgr, interval=60)
            async with httpx.AsyncClient() as client:
                await poller._tick(client)

        for ws, site_id in [(ws1, "9001"), (ws2, "9002")]:
            self.assertEqual(
                len(_broadcasts_of_type(ws, "alerts")), 1,
                f"site {site_id} should get exactly 1 broadcast"
            )


# ---------------------------------------------------------------------------
# REST router — GET /api/alerts/
# ---------------------------------------------------------------------------

class TestAlertsRestRouter(unittest.TestCase):

    def setUp(self):
        self.app = _make_app()
        self.client = TestClient(self.app)

    def test_get_alerts_returns_200_with_alerts_array(self):
        alert_data = {"status": "ok", "alerts": [], "stop_deviations": []}
        with patch("routers.alerts.fetch_alerts_for_site",
                   new=AsyncMock(return_value=alert_data)):
            response = self.client.get("/api/alerts/?site_id=9001&source=free")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("alerts", body)
        self.assertIsInstance(body["alerts"], list)

    def test_get_alerts_returns_empty_on_sl_error(self):
        error_data = {"status": "error", "alerts": [], "stop_deviations": [], "message": "timeout"}
        with patch("routers.alerts.fetch_alerts_for_site",
                   new=AsyncMock(return_value=error_data)):
            response = self.client.get("/api/alerts/?site_id=9001")

        # Must return 200 with empty arrays, not an HTTP error (Req 3.3)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["alerts"], [])


if __name__ == "__main__":
    unittest.main()
