# Stockholm transportation planner learning app

A real-time web application for tracking bus, train, metro, tram, and ship arrivals in Stockholm using SL (Storstockholms Lokaltrafik) APIs.

## Product planning (MVP)

### 1) Target transit agencies with open realtime APIs

For MVP validation, we will support **Stockholm-focused providers only** so the scope stays aligned to this app:

1. **SL (Storstockholms Lokaltrafik) via Trafiklab APIs**
   - **Vehicle positions:** realtime vehicle monitoring where available per mode/feed
   - **Stop arrivals/departures:** realtime departures (e.g., SL Realtidsinformation feeds)
   - **Service alerts:** traffic/disruption information from SL/Trafiklab datasets
   - Why this is a fit: primary operator for metro, commuter rail, buses, trams, and local ferries in Stockholm.

2. **Trafikverket (Swedish Transport Administration) traffic/disruption APIs — Stockholm subset**
   - **Vehicle positions:** not primary source for local transit vehicles (used selectively when relevant)
   - **Stop arrivals/departures:** complementary station traffic information for regional rail context
   - **Service alerts:** disruption/traffic situation data relevant to Stockholm area operations
   - Why this is a fit: broad official disruption context that improves alert coverage while remaining Sweden/Stockholm scoped.

> Implementation note: launch with SL realtime departures + stop search first, then add Stockholm-scoped Trafikverket disruption context as a secondary data source.

### 2) MVP user stories

1. **Stop/station departures**
   - As a rider, I can search a stop/station and see next departures.
   - Acceptance criteria:
     - Search returns relevant stops/stations by name within 1 interaction.
     - Departure board shows route, destination/headsign, scheduled time, realtime estimate, and delay indicator.
     - Board auto-refreshes (target interval: 15–30s) and clearly shows last-updated timestamp.

2. **Live vehicle map**
   - As a rider, I can view live vehicle positions on a map.
   - Acceptance criteria:
     - Map displays active vehicles for selected route/operator within Stockholm coverage.
     - Vehicle markers include line/route and last report time.
     - Rider can filter by route and transport mode.

3. **Favorites**
   - As a rider, I can favorite stops/routes.
   - Acceptance criteria:
     - Rider can save and remove favorites in one tap/click.
     - Favorites persist across sessions.
     - Favorites are accessible from the home/departure view without re-searching.

### 3) Non-goals for v1

To keep scope tight, the following are explicitly out of scope for v1:

- Fare calculation, fare capping, or payment/ticket purchase flows
- Full multimodal trip planning with transfer optimization
- Account/profile system beyond lightweight favorites persistence
- Booking/reservations (paratransit, microtransit, or intercity services)
- Offline-first support and push notifications
- Historical analytics and personalized commute predictions

### 4) Success metrics

MVP is considered successful when these targets are consistently met in production-like usage:

#### Performance & reliability
- **Median backend API response time:** < **500 ms** for stop search/departure queries
- **P95 backend API response time:** < **1.2 s**
- **First contentful view (app shell + first useful content):** < **2.0 s** on typical 4G/mobile hardware
- **Departure data freshness:** realtime feed ingestion lag < **30 s** median
- **Availability:** 99.5% monthly uptime for public API endpoints

#### Product usage & quality
- **Departure board success rate:** ≥ 98% requests return usable departures (not empty/error due to platform issues)
- **Map render success rate:** ≥ 99% sessions can load map + vehicle layer
- **Favorites adoption:** ≥ 25% weekly active riders save at least 1 favorite
- **Repeat usage:** ≥ 30% 7-day return rate among users who searched at least one stop

## Features

- Real-time departure information for all SL transport modes
- Search for stops and stations across Stockholm
- Save favorite stops for quick access
- Auto-refresh every 30 seconds
- Use a manual starting position to surface nearby stops
- Clean, modern UI with color-coded transport types

## Tech Stack

### Frontend
- TypeScript
- React
- Vite
- Supabase (for favorites storage)

### Backend
- Python FastAPI
- httpx for API calls
- CORS enabled for local development

## Setup Instructions

### 1. Get SL API Key

1. Visit [SL Developer Portal](https://www.trafiklab.se/)
2. Create an account
3. Create a new project
4. Subscribe to the "SL Realtidsinformation 4" API
5. Copy your API key

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Update `backend/.env` with your SL API key:
```
SL_REALTIME_API_KEY=your_actual_api_key_here
```

Start the backend server:
```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### 3. Frontend Setup

Install dependencies:
```bash
npm install
```

The frontend will automatically proxy API requests to the backend.

## Running the Application

1. Start the backend server (see Backend Setup)
2. The frontend dev server starts automatically
3. Open your browser to the URL shown
4. Search for a stop or station
5. View real-time departures

## API Endpoints

### Backend API

- `GET /api/realtime/search?query={query}` - Search for stops/stations
- `GET /api/realtime/departures/{site_id}` - Get raw departures data
- `GET /api/departures/format/{site_id}` - Get formatted departures data

### SL API Documentation

## Features to Add

- Push notifications for specific lines
- Journey planning
- Disruption alerts
- Offline support
- Mobile app version
- Historical data analysis

## Development

The project uses:
- Vite for fast development and building
- TypeScript for type safety
- FastAPI for high-performance backend
- Supabase for database and favorites storage

## License

MIT
