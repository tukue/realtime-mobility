import httpx
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("SL_REALTIME_API_KEY")

SEARCH_URL = "https://api.sl.se/api2/typeahead.json"
REALTIME_URL = "https://api.sl.se/api2/realtimedeparturesV4.json"

async def test_api_integration():
    if not API_KEY or API_KEY == "your_sl_api_key_here":
        print("❌ Error: SL_REALTIME_API_KEY is not set correctly in backend/.env")
        return

    masked_key = f"{API_KEY[:4]}...{API_KEY[-4:]}"
    print(f"--- Testing SL API (Key: {masked_key}) ---")

    headers = {
        "User-Agent": "StockholmTransitPlanner/1.0"
    }

    async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
        print("\n1. Testing Stop Search (Odenplan)...")
        search_params = {
            "key": API_KEY,
            "searchstring": "Odenplan",
            "maxresults": 5
        }

        try:
            resp = await client.get(SEARCH_URL, params=search_params, timeout=15.0)

            if resp.status_code == 200:
                data = resp.json()
                if data.get("StatusCode") == 0 or "ResponseData" in data:
                    results = data.get("ResponseData", [])
                    if results:
                        site_id = results[0].get("SiteId")
                        name = results[0].get("Name")
                        print(f"✅ Stop Search OK: Found {name} (SiteID: {site_id})")

                        print(f"\n2. Testing Realtime Departures for {name}...")
                        rt_params = {
                            "key": API_KEY,
                            "siteid": site_id,
                            "timewindow": 60
                        }
                        rt_resp = await client.get(REALTIME_URL, params=rt_params, timeout=15.0)
                        if rt_resp.status_code == 200:
                            rt_data = rt_resp.json()
                            if rt_data.get("StatusCode") == 0:
                                buses = rt_data.get("ResponseData", {}).get("Buses", [])
                                print(f"✅ Realtime OK: Found {len(buses)} buses at {name}")
                            else:
                                print(f"⚠️ Realtime API Status {rt_data.get('StatusCode')}: {rt_data.get('Message')}")
                        else:
                            print(f"❌ Realtime API HTTP Error: {rt_resp.status_code}")
                    else:
                        print(f"⚠️ Stop Search returned 0 results. Data: {data}")
                else:
                    print(f"⚠️ Search API error in body: {data}")
            elif resp.status_code == 502:
                print("❌ Stop Search API HTTP Error: 502 Bad Gateway")
                print("Tip: This often means the SL server is down or the domain is blocked. Try again in a few minutes.")
            else:
                print(f"❌ Stop Search API HTTP Error: {resp.status_code}")
        except Exception as e:
            print(f"❌ Connection Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_api_integration())
