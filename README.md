# Stockholm transportation planner learning app

A real-time web application for tracking bus, train, metro, tram, and ship arrivals in Stockholm using SL (Storstockholms Lokaltrafik) APIs.

## Features

- Real-time departure information for all SL transport modes
- Search for stops and stations across Stockholm
- Save favorite stops for quick access
- Auto-refresh every 30 seconds
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

- [SL Realtidsinformation 4](https://www.trafiklab.se/api/trafiklab-apis/sl/stop-lookup/)
- [SL Stop Lookup](https://www.trafiklab.se/api/trafiklab-apis/sl/stop-lookup/)

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
