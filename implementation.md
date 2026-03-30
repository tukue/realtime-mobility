# Implementation Plan: Nearest Buses From a Starting Position

## Objective

Turn the current Stockholm transit checker into a flow where a user can provide a starting position manually and quickly see the nearest live buses around it.

## Current Status

### Done
- Main transit dashboard shell
- Live stop search
- Multi-modal departure board
- Recent stops saved locally
- Backend health indicator
- Optional Supabase favorites fallback
- Transit-focused design doc

### In Progress
- Manual starting-stop MVP flow

### Next Up
- Add backend support for nearby stop lookup
- Render nearby stops and their live buses
- Keep geolocation as a later enhancement

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

### 2. Geolocation Later

Goal: defer live location until the MVP is validated.

Tasks:
- Keep a `Use my location` enhancement in the backlog
- Define the browser permission flow and fallback behavior for later

Acceptance criteria:
- The MVP does not depend on geolocation
- Location-based input can be added later without rewriting the core flow

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
- Fetch departures for the top 1 to 3 nearest stops
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
- Verify the existing search and departure board still work

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
| Geolocation capture | Deferred | Add later after MVP validation |
| Nearby stop endpoint | Deferred | MVP uses the existing stop search API for now |
| Nearby bus cards | In progress | Nearby stops panel now shows the closest matches from typed input |
| Error handling | Not started | Must preserve stop-search fallback |
| Tests | Not started | Add coverage after API and UI are wired |
| Docs update | In progress | Design plan exists; implementation notes started here |

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
