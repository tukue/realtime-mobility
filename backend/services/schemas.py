from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class TransportDeparture(BaseModel):
    line_number: str = ""
    destination: str = ""
    display_time: str = ""
    expected_datetime: str = ""
    journey_direction: int = 0
    group_of_line: str = ""
    transport_mode: str = ""
    deviations: list = []
    has_deviations: bool = False


class LiveboardResponse(BaseModel):
    site_id: int
    site_name: str = ""
    status: str = "ok"
    buses: list[TransportDeparture] = []
    metros: list[TransportDeparture] = []
    trains: list[TransportDeparture] = []
    trams: list[TransportDeparture] = []
    ships: list[TransportDeparture] = []
    stop_deviations: list = []


class FreeSiteResult(BaseModel):
    SiteId: str = ""
    Name: str = ""
    Type: str = "Stop"
    X: str = ""
    Y: str = ""
    StopAreas: list = []
    distance_meters: int = 0

    model_config = ConfigDict(extra="ignore")


class NearbyResponse(BaseModel):
    ResponseData: list[FreeSiteResult] = []


class SearchResponse(BaseModel):
    ResponseData: list = []


class AlertItem(BaseModel):
    id: str = ""
    header: str = ""
    details: str = ""
    severity: str = "info"
    scope: list[str] = []
    transport_mode: str | None = None
    valid_from: str | None = None
    valid_to: str | None = None


class AlertsResponse(BaseModel):
    status: str = "ok"
    alerts: list[AlertItem] = []
    stop_deviations: list = []
    message: str | None = None


class JourneyLeg(BaseModel):
    origin: str = ""
    destination: str = ""
    departure_time: str = ""
    arrival_time: str = ""
    line_number: str = ""
    transport_mode: str = ""
    direction: str = ""


class JourneyTrip(BaseModel):
    duration_minutes: int = 0
    changes: int = 0
    legs: list[JourneyLeg] = []
    departure_time: str = ""
    arrival_time: str = ""


class JourneyResponse(BaseModel):
    trips: list[JourneyTrip] = []
    origin_name: str = ""
    destination_name: str = ""


class SituationsResponse(BaseModel):
    status: str = "ok"
    alerts: list = []
    message: str | None = None
