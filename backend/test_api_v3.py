import httpx
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("SL_REALTIME_API_KEY")

# The most stable "Gate" for SL Real-time data
REALTIME_URL = "https://api.sl.se/api2/realtimedeparturesV4.json"

async def explore_sl_gate():
    if not API_KEY:
        print("❌ No API Key found in .env")
        return

    # Using Odenplan (SiteId: 9117) as a test case for "Dinner Lines"
    site_id = 9117
    print(f"--- Exploring SL Gate: {REALTIME_URL} ---")
    print(f"--- Fetching Arrivals for Site: {site_id} ---")

    params = {
        "key": API_KEY,
        "siteid": site_id,
        "timewindow": 30, # Next 30 minutes
        "bus": "true"      # Only focus on buses for the travel planner
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(REALTIME_URL, params=params, timeout=15.0)

            if resp.status_code == 200:
                data = resp.json()
                if data.get("StatusCode") == 0:
                    buses = data.get("ResponseData", {}).get("Buses", [])
                    print(f"✅ Connection Successful! Found {len(buses)} buses.")

                    for bus in buses[:3]: # Show first 3 arrivals
                        line = bus.get("LineNumber")
                        dest = bus.get("Destination")
                        display = bus.get("DisplayTime")
                        # This is the "Arrival Date/Time" you requested
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
