from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

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

    @model_validator(mode="after")
    def _validate_keys(self) -> "Settings":
        if self.sl_realtime_api_key:
            if not self.sl_situation_api_key:
                logger.warning(
                    "SL_SITUATION_API_KEY is not set — falling back to "
                    "SL_REALTIME_API_KEY for situation/alert endpoints."
                )
                self.sl_situation_api_key = self.sl_realtime_api_key
        else:
            logger.warning(
                "SL_REALTIME_API_KEY is not set. Key-based endpoints "
                "(source=key) will fail at runtime. "
                "Use source=free or set the key in your .env file."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
