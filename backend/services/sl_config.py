from __future__ import annotations

import os

DEFAULT_SL_TYPEAHEAD_URL = "https://journeyplanner.integration.sl.se/v1/typeahead.json"
DEFAULT_SL_REALTIME_URL = "https://api.sl.se/api2/realtimedeparturesV4.json"
DEFAULT_SL_SITUATION_URL = "https://api.sl.se/api2/deviations.json"
DEFAULT_SL_FREE_SITES_URL = "https://transport.integration.sl.se/v1/sites"
DEFAULT_SL_FREE_DEPARTURES_URL = "https://transport.integration.sl.se/v1/sites/{site_id}/departures"
DEFAULT_SL_FREE_DEVIATIONS_URL = "https://deviations.integration.sl.se/v1/messages"
DEFAULT_SL_JOURNEY_URL = "https://journeyplanner.integration.sl.se/v1/journey.json"


def get_sl_typeahead_url() -> str:
    return os.getenv("SL_TYPEAHEAD_URL", DEFAULT_SL_TYPEAHEAD_URL)


def get_sl_realtime_url() -> str:
    return os.getenv("SL_REALTIME_URL", DEFAULT_SL_REALTIME_URL)


def get_sl_situation_url() -> str:
    return os.getenv("SL_SITUATION_URL", DEFAULT_SL_SITUATION_URL)


def get_sl_free_sites_url() -> str:
    return os.getenv("SL_FREE_SITES_URL", DEFAULT_SL_FREE_SITES_URL)


def get_sl_free_departures_url() -> str:
    return os.getenv("SL_FREE_DEPARTURES_URL", DEFAULT_SL_FREE_DEPARTURES_URL)


def get_sl_free_deviations_url() -> str:
    return os.getenv("SL_FREE_DEVIATIONS_URL", DEFAULT_SL_FREE_DEVIATIONS_URL)


def get_sl_journey_url() -> str:
    return os.getenv("SL_JOURNEY_URL", DEFAULT_SL_JOURNEY_URL)
