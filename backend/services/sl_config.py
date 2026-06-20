from __future__ import annotations

from services.config import get_settings


def get_sl_typeahead_url() -> str:
    return get_settings().sl_typeahead_url


def get_sl_realtime_url() -> str:
    return get_settings().sl_realtime_url


def get_sl_situation_url() -> str:
    return get_settings().sl_situation_url


def get_sl_free_sites_url() -> str:
    return get_settings().sl_free_sites_url


def get_sl_free_departures_url() -> str:
    return get_settings().sl_free_departures_url


def get_sl_free_deviations_url() -> str:
    return get_settings().sl_free_deviations_url


def get_sl_journey_url() -> str:
    return get_settings().sl_journey_url
