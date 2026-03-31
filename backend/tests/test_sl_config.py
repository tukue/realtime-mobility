import os
import unittest
from unittest.mock import patch

from services.sl_config import (
    DEFAULT_SL_FREE_DEPARTURES_URL,
    DEFAULT_SL_FREE_DEVIATIONS_URL,
    DEFAULT_SL_FREE_SITES_URL,
    DEFAULT_SL_REALTIME_URL,
    DEFAULT_SL_SITUATION_URL,
    DEFAULT_SL_TYPEAHEAD_URL,
    get_sl_free_departures_url,
    get_sl_free_deviations_url,
    get_sl_free_sites_url,
    get_sl_realtime_url,
    get_sl_situation_url,
    get_sl_typeahead_url,
)


class SlConfigTests(unittest.TestCase):
    def test_defaults_are_used_when_env_is_missing(self):
        self.assertEqual(get_sl_typeahead_url(), DEFAULT_SL_TYPEAHEAD_URL)
        self.assertEqual(get_sl_realtime_url(), DEFAULT_SL_REALTIME_URL)
        self.assertEqual(get_sl_situation_url(), DEFAULT_SL_SITUATION_URL)
        self.assertEqual(get_sl_free_sites_url(), DEFAULT_SL_FREE_SITES_URL)
        self.assertEqual(get_sl_free_departures_url(), DEFAULT_SL_FREE_DEPARTURES_URL)
        self.assertEqual(get_sl_free_deviations_url(), DEFAULT_SL_FREE_DEVIATIONS_URL)

    def test_env_vars_override_defaults(self):
        with patch.dict(
            os.environ,
            {
                "SL_TYPEAHEAD_URL": "https://example.test/typeahead",
                "SL_REALTIME_URL": "https://example.test/realtime",
                "SL_SITUATION_URL": "https://example.test/situations",
                "SL_FREE_SITES_URL": "https://example.test/sites",
                "SL_FREE_DEPARTURES_URL": "https://example.test/sites/{site_id}/departures",
                "SL_FREE_DEVIATIONS_URL": "https://example.test/deviations",
            },
            clear=False,
        ):
            self.assertEqual(get_sl_typeahead_url(), "https://example.test/typeahead")
            self.assertEqual(get_sl_realtime_url(), "https://example.test/realtime")
            self.assertEqual(get_sl_situation_url(), "https://example.test/situations")
            self.assertEqual(get_sl_free_sites_url(), "https://example.test/sites")
            self.assertEqual(
                get_sl_free_departures_url(),
                "https://example.test/sites/{site_id}/departures",
            )
            self.assertEqual(get_sl_free_deviations_url(), "https://example.test/deviations")


if __name__ == "__main__":
    unittest.main()
