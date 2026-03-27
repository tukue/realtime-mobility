from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class Departure(BaseModel):
    line_number: str
    destination: str
    display_time: str
    expected_datetime: str
    transport_mode: str
    deviations: Optional[List[str]] = []

@router.get("/format/{site_id}")
async def get_formatted_departures(site_id: int):
    """Get formatted departures from the realtime endpoint"""
    from routers.realtime import get_departures

    try:
        data = await get_departures(site_id)

        formatted = {
            "site_name": data.get("ResponseData", {}).get("StopPointDeviations", []),
            "buses": format_transport_data(data.get("ResponseData", {}).get("Buses", [])),
            "metros": format_transport_data(data.get("ResponseData", {}).get("Metros", [])),
            "trains": format_transport_data(data.get("ResponseData", {}).get("Trains", [])),
            "trams": format_transport_data(data.get("ResponseData", {}).get("Trams", [])),
            "ships": format_transport_data(data.get("ResponseData", {}).get("Ships", []))
        }

        return formatted
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def format_transport_data(transport_list: List) -> List[dict]:
    """Format transport departure data"""
    result = []
    for item in transport_list:
        result.append({
            "line_number": item.get("LineNumber", ""),
            "destination": item.get("Destination", ""),
            "display_time": item.get("DisplayTime", ""),
            "expected_datetime": item.get("ExpectedDateTime", ""),
            "journey_direction": item.get("JourneyDirection", 0),
            "group_of_line": item.get("GroupOfLine", ""),
            "deviations": item.get("Deviations", [])
        })
    return result
