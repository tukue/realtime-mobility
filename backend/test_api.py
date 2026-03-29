import httpx
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("SL_REALTIME_API_KEY")
SEARCH_URL = "https://journeyplanner.integration.sl.se/v1/typeahead.json"

async def test_api():
    if not API_KEY or API_KEY == "your_sl_api_key_here":
        print("❌ Error: SL_REALTIME_API_KEY is not set correctly in backend/.env")
        return

    print(f"Testing SL API with key: {API_KEY[:4]}...{API_KEY[-4:]}")

    params = {
        "key": API_KEY,
        "searchstring": "Odenplan",
        "stationsonly": "true",
        "maxresults": 1
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(SEARCH_URL, params=params)
            if response.status_code == 200:
                data = response.json()
                if "ResponseData" in data and len(data["ResponseData"]) > 0:
                    print(f"✅ Success! Found: {data['ResponseData'][0]['Name']}")
                else:
                    print(f"⚠️ API returned but no results: {data}")
            else:
                print(f"❌ API Error: {response.status_code}")
                print(response.text)
    except Exception as e:
        print(f"❌ Connection Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_api())
