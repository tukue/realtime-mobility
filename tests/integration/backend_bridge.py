"""Run actual API routes in-process; replace only SL's HTTP transport.

JSON stdin/stdout is the test transport, so no listening sockets are required.
"""
import asyncio
import json
import sys
from pathlib import Path
from unittest.mock import patch

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'backend'))
from main import app  # noqa: E402
from services.config import get_settings  # noqa: E402

STATIONS = [
    {"id": 9117, "name": "Odenplan", "lat": 59.342, "lon": 18.049},
    {"id": 9001, "name": "T-Centralen", "lat": 59.331, "lon": 18.060},
    {"id": 9192, "name": "Slussen", "lat": 59.320, "lon": 18.072},
]
input_request = json.load(sys.stdin)
upstream_requests = []
settings = get_settings()


def upstream(request):
    upstream_requests.append({"path": request.url.path, "params": dict(request.url.params)})
    if request.url.path == httpx.URL(settings.sl_free_sites_url).path:
        return httpx.Response(200, json=STATIONS)
    if request.url.path == httpx.URL(settings.sl_journey_url).path:
        assert request.url.params['originId'] == '9117'
        assert request.url.params['destId'] == '9192'
        legs = [
            {"Origin": {"name": "Odenplan", "time": "10:00"},
             "Destination": {"name": "T-Centralen", "time": "10:04"},
             "Product": {"num": "17", "catOut": "METRO"}, "direction": "Skarpnäck"},
            {"Origin": {"name": "T-Centralen", "time": "10:06"},
             "Destination": {"name": "Slussen", "time": "10:10"},
             "Product": {"num": "14", "catOut": "METRO"}, "direction": "Fruängen"},
        ]
        trip = {"Origin": legs[0]['Origin'], "Destination": legs[-1]['Destination'],
                "dur": "10", "chg": 1, "LegList": {"Leg": legs}}
        return httpx.Response(200, json={
            "Origin": {"name": "Odenplan"}, "Destination": {"name": "Slussen"},
            "Trip": [] if input_request.get('empty') else [trip],
        })
    raise AssertionError(f'Unexpected external request: {request.url}')


original_client = httpx.AsyncClient


def fixture_client(*args, **kwargs):
    kwargs['transport'] = httpx.MockTransport(upstream)
    return original_client(*args, **kwargs)


async def run():
    # No lifespan: avoid starting the unrelated background alert poller.
    async with fixture_client() as provider:
        app.state.http_client = provider
        async with original_client(transport=httpx.ASGITransport(app=app),
                                   base_url="http://testserver") as api:
            with patch('httpx.AsyncClient', fixture_client):
                response = await api.request(input_request['method'], input_request['url'],
                                             json=input_request.get('body'))
    return {"status": response.status_code, "body": response.json(),
            "upstream": upstream_requests}


print(json.dumps(asyncio.run(run())))
