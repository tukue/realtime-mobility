import httpx
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("SL_REALTIME_API_KEY")

REALTIME_URL = "https://api.sl.se/api2/realtimedeparturesV4.json"

async def explore_sl_gate():
    if not API_KEY:
        print("❌ No API Key found in .env")
        return

    site_id = 9117
    print(f"--- Exploring SL Gate: {REALTIME_URL} ---")
    print(f"--- Fetching Arrivals for Site: {site_id} ---")

    params = {
        "key": API_KEY,
        "siteid": site_id,
        "timewindow": 30,
        "bus": "true"
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(REALTIME_URL, params=params, timeout=15.0)

            if resp.status_code == 200:
                data = resp.json()
                if data.get("StatusCode") == 0:
                    buses = data.get("ResponseData", {}).get("Buses", [])
                    print(f"✅ Connection Successful! Found {len(buses)} buses.")

                    for bus in buses[:3]:
                        line = bus.get("LineNumber")
                        dest = bus.get("Destination")
                        display = bus.get("DisplayTime")
                        expected = bus.get("ExpectedDateTime")

                        print(f"\n🚌 Bus {line} to {dest}")
                        print(f"   Arrival (Display): {display}")
                        print(f"   Arrival (ISO Date): {expected}")
                else:
                    print(f"⚠️ API Error: {data.get('Message')}")
            else:
                print(f"❌ HTTP Error {resp.status_code}")

    except Exception as e:
        print(f"❌ Failed to reach SL Gate: {str(e)}")

if __name__ == "__main__":
    asyncio.run(explore_sl_gate())
