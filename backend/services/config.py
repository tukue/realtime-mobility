from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    sl_realtime_api_key: str = ""
    sl_situation_api_key: str = ""
    sl_typeahead_url: str = "https://journeyplanner.integration.sl.se/v1/typeahead.json"
    sl_realtime_url: str = "https://api.sl.se/api2/realtimedeparturesV4.json"
    sl_situation_url: str = "https://api.sl.se/api2/deviations.json"
    sl_free_sites_url: str = "https://transport.integration.sl.se/v1/sites"
    sl_free_departures_url: str = "https://transport.integration.sl.se/v1/sites/{site_id}/departures"
    sl_free_deviations_url: str = "https://deviations.integration.sl.se/v1/messages"
    sl_journey_url: str = "https://journeyplanner.integration.sl.se/v1/journey.json"
    cors_origins: list[str] = ["*"]

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
