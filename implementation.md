# Implementation Plan: Nearest Buses From a Starting Position

## Objective

Turn the current Stockholm transit checker into a flow where a user can provide a starting position manually and quickly see the nearest live buses around it.

## Application Structure

### Frontend
- `src/App.tsx` owns the page shell, local persistence for recent stops, backend health polling, and the main layout.
- `src/components/SearchBar.tsx` handles stop/station search.
- `src/components/NearbyStops.tsx` reuses the same stop lookup API for the manual starting-position flow.
- `src/components/stopBoard.tsx` renders the live board and transport-mode filters.
- `src/components/FavoritesList.tsx` loads saved stops when Supabase is configured.
- `src/lib/stopSearch.ts` is the shared stop-search helper used by search and nearby panels.

### Backend
- `backend/main.py` wires the FastAPI app and routers.
- `backend/routers/realtime.py` serves stop search and live updates.
- `backend/routers/liveboard.py` serves normalized live-update responses.
- `backend/routers/situations.py` serves disruption alerts.
- `backend/services/sl_api.py` contains the SL API client, payload normalization, and error handling.

### Data Flow
1. The user searches for a stop or enters a starting position.
2. The frontend calls the shared search helper, which hits the backend search endpoint.
3. The selected stop is stored locally as a recent stop.
4. The stop board fetches live updates for the selected stop.
5. Backend health is polled separately so the UI can show whether the API is reachable.

## Current Status

### Done
- Main transit dashboard shell
- Live stop search
- Multi-modal live board
- Recent stops saved locally
- Backend health indicator
- Optional Supabase favorites fallback
- Transit-focused design doc
- Manual starting-position flow
- Geolocation capture for nearby stops
- Nearby stop endpoint with distance ranking
- Shared stop-search helper
- Basic GitHub Actions CI for frontend build and backend unit tests
- Review fixes for mounted async cleanup and safe localStorage loading

### In Progress
- None

### Next Up
- Polish the manual search and nearby-copy wording
- Update `README.md` and `design.md` to describe nearby buses and the new endpoint
- Expand nearby-flow coverage if we add UI tests later

## Workstreams

### 1. Starting Position Capture

Goal: capture the user’s starting position with the least possible friction.

Tasks:
- Add a stop/station/area text field or reuse the existing stop search
- Let the user set a starting position without needing geolocation
- Store the selected starting position in frontend state
- Keep the current search-first experience fast and simple

Acceptance criteria:
- User can submit a starting position quickly
- The app stays usable without browser location permissions
- The first version uses typed stop/station/area input instead of GPS

### 2. Geolocation Capture

Goal: capture live location as an optional input for nearby stops while keeping manual fallback.

Tasks:
- Keep a `Use my location` action in the UI
- Define the browser permission flow and fallback behavior

Acceptance criteria:
- The app can use browser location when available
- Manual starting-position input still works when location is unavailable

### 3. Nearby Stop Lookup

Goal: find the closest bus stops around the user’s starting position.

Tasks:
- Add a backend endpoint such as `GET /api/nearby/stops?lat=...&lon=...`
- Retrieve candidate stops from the SL data source
- Calculate distance from the user’s coordinates
- Sort and return the closest stops

Acceptance criteria:
- Endpoint returns a small ranked list of nearby stops
- Response includes stop id, name, coordinates, and distance

### 4. Nearby Bus Results

Goal: show live buses for the nearest stop or stops.

Tasks:
- Fetch live updates for the top 1 to 3 nearest stops
- Group results by stop
- Show the nearest stop first
- Preserve the current selected-stop board behavior

Acceptance criteria:
- User sees live buses near their starting position
- The board still works for manually selected stops

### 5. Frontend UI

Goal: make the nearby-bus flow obvious and fast to use.

Tasks:
- Replace the current starting-location field with a nearby-bus action area
- Add a `Find nearby buses` button
- Show nearby stop cards with distance and next buses
- Keep the existing search flow as a separate path

Acceptance criteria:
- A user can understand the nearby-bus path without extra instructions
- The UI remains mobile-friendly and scannable

### 6. Fallback and Error Handling

Goal: keep the app useful even if location or backend calls fail.

Tasks:
- Handle geolocation permission denial
- Handle no nearby stops found
- Handle backend or SL API errors gracefully
- Keep the current stop search flow available at all times

Acceptance criteria:
- No failure state blocks the user from using the app
- Error messages explain the next step clearly

### 7. Testing

Goal: reduce risk before shipping the nearby-bus feature.

Tasks:
- Add backend tests for distance sorting and empty results
- Add frontend tests for location permission denial and render states
- Verify the existing search and live board still work

Acceptance criteria:
- Core happy path and fallback paths are covered

### 8. Docs

Goal: keep the project easy to understand and deploy.

Tasks:
- Update `design.md` with the nearby-bus flow
- Update `README.md` with setup and usage notes
- Document any new backend endpoints

Acceptance criteria:
- A new contributor can understand the feature without reading code first

## Proposed Milestones

### Milestone 1: Location input
- Geolocation button
- Manual fallback
- Local state wiring

### Milestone 2: Nearby stops API
- Backend endpoint
- Distance calculation
- Sorted nearby stop results

### Milestone 3: Nearby buses UI
- Nearby stop cards
- Live bus display
- Error and empty states

### Milestone 4: Stabilization
- Tests
- README updates
- Design doc updates

## Progress Tracking

Use this section for follow-up updates as work lands.

- `Not started`: task has not been touched
- `In progress`: task is actively being worked on
- `Blocked`: task is waiting on a dependency or decision
- `Done`: task has been implemented and verified

### Tracking Table

| Task | Status | Notes |
| --- | --- | --- |
| Starting position capture | Done | Manual stop/station/area input is the MVP path |
| Geolocation capture | Done | Optional browser location now feeds the nearby stops panel with manual fallback. |
| Nearby stop endpoint | Done | Returns ranked nearby stops by distance from the provided coordinates. |
| Nearby bus cards | Done | Nearby location mode now renders live bus previews for the closest stops. |
| Error handling | Done | Denied-location fallback, empty nearby states, and live-preview failure states are now surfaced more clearly. |
| Tests | Done | Backend unit tests and frontend build verification cover the nearby-flow changes. |
| Docs update | Done | `README.md` and `design.md` now document the nearby-bus flow and API endpoints. |

## Follow-up Cadence

- Update this file after each meaningful feature milestone
- Mark tasks `Done` only after the code is implemented and verified
- If a task is blocked, record the blocker in the `Notes` column

## Definition of Done

The nearest-bus feature is done when:
- The user can enter a starting position
- The app returns nearby bus stops in order of proximity
- The UI shows live buses for those nearby stops
- The app still works when geolocation or backend support is unavailable
- The README and design docs match the implemented behavior
