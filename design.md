# Design: Stockholm Transit Checker

## 1. Product Goal

Build a fast, mobile-friendly app for checking Stockholm public transport live updates with as little friction as possible.

The app should let a rider:
- Search for a stop or station quickly
- See live updates across transport modes
- Reopen recent and saved stops in one tap
- Understand whether the backend and live data are currently healthy

This is not a full journey planner. It is a focused “check transit now” tool.

## 2. Core Use Cases

### 2.1 Quick live-board check
User opens the app, searches for a stop, and immediately sees live updates.

### 2.2 Repeat stop access
User returns to the app and reopens a recently used stop or favorite without searching again.

### 2.3 Multi-modal overview
User checks buses, metro, trains, trams, and ships from the same stop without switching apps.

### 2.4 Nearby buses
User taps `Use my location` or types a starting point, then sees nearby stops ranked by distance with live bus previews.

### 2.5 Deployment confidence
User can tell whether the backend is reachable and whether live data is loading correctly.

## 3. Product Principles

1. Speed first
- Search and results should feel immediate.
- The live board should auto-refresh without user intervention.

2. Low friction
- Don’t require account creation for the core experience.
- Save useful local state on the device when possible.

3. Graceful fallback
- If Supabase is not configured, the app should still work.
- If the backend is offline, the UI should show a clear state rather than silently failing.

4. Transit clarity
- Display line, destination, timing, and deviations in a compact format.
- Highlight the most useful live state, not just raw API data.

## 4. Information Architecture

### 4.1 Main areas
- Search panel
- Recent stops panel
- Favorites panel
- Live board
- Backend health indicator

### 4.2 Data hierarchy
1. Selected stop
2. Live board modes
3. Individual updates
4. Delay or deviation status

## 5. Screen Layout

### 5.1 Header
Contains:
- App title
- Short value proposition
- Status pills for modes, refresh, local recents, and backend health

### 5.2 Left sidebar
Contains:
- Search input
- Nearby buses card with manual starting point input and a `Use my location` button
- Recent stops
- Favorites
- Short usage hints

### 5.3 Main board
Contains:
- Selected stop name
- Refresh controls
- Backend/last-updated metadata
- Transport mode filters
- Live updates grouped by mode

## 6. Interaction Design

### 6.1 Search
- User types at least 2 characters.
- Results appear in a dropdown.
- Selecting a result updates the board immediately.

### 6.2 Starting location
- The app supports typed stop, station, or area input as the fallback path.
- The app also supports browser geolocation through a `Use my location` action.
- When location is available, the nearby panel ranks the closest stops automatically.
- When location is unavailable or denied, the manual starting point still works.

### 6.3 Nearby buses
- The nearby panel fetches the closest stops from the backend.
- The UI shows distance, stop type, and live departure previews for the nearest results.
- The first result is selected automatically so the live board can open quickly.

### 6.4 Recent stops
- Every selected stop is stored locally.
- The app keeps only a small number of recent stops to reduce clutter.
- Selecting a recent stop behaves the same as search results.

### 6.5 Favorites
- Favorites are loaded from Supabase when configured.
- If Supabase variables are missing, the favorites area explains that the app still works without cloud storage.

### 6.6 Live-board filtering
- Default view shows all live modes.
- User can filter to a single mode when they only care about one transit type.

### 6.7 Refresh
- Live updates refresh automatically on a timer.
- A manual refresh button is always available.

## 7. Visual Direction

The UI should feel:
- Calm but high contrast
- Modern and slightly premium
- Easy to scan on a phone screen
- Functional before decorative

### 7.1 Typography
- Use a strong display face for headings
- Use a highly readable sans-serif for body text
- Keep line lengths short in the board and sidebar

### 7.2 Color
- Use a dark transit dashboard background
- Use colored mode badges for mode identity
- Use green, amber, and red carefully for system state and service warnings

### 7.3 Motion
- Keep motion subtle
- Use only small transitions for hover, refresh, and result selection

## 8. Content Rules

### 8.1 Search copy
- Keep prompts short and action-oriented
- Avoid jargon like “site” unless it is already familiar from the data source

### 8.2 Departure cards
Each card should show:
- Line number
- Destination
- Display time
- Expected time or timestamp
- Mode label
- Deviation indicator when needed

### 8.3 Empty states
Empty states should explain:
- What is missing
- What the user can do next
- Whether this is a data issue or a configuration issue

## 9. Technical Constraints

### 9.1 Frontend
- React + Vite
- Static deployment friendly
- Minimal dependency footprint

### 9.2 Backend
- FastAPI serves the `/api/*` endpoints
- The frontend proxies to the backend in local development
- The app should degrade cleanly if the backend is unavailable

### 9.3 State storage
- Use localStorage for recent stops
- Use Supabase only for optional cross-session favorites

## 10. Deployment Requirements

The app should be easy to deploy in a simple setup:
- Frontend can be hosted as a static site
- Backend can run separately on a standard port
- Health check endpoint should be available
- README should clearly explain startup order and port expectations

### 10.1 Deployment User Story
As a maintainer, I want to deploy the frontend to Vercel or another static hosting platform and connect it to the backend API in a separate deployment, so I can ship the app without changing the codebase for each platform.

Acceptance criteria:
- The frontend builds successfully for static hosting.
- Backend API URLs and environment variables are documented.
- The deployment works on Vercel, Netlify, or a similar host with the same build output.
- The app still shows backend health and live transit data after deployment.

## 11. Success Criteria

The redesign is successful if:
- A user can search a stop in under 1 interaction after landing on the page
- Recently used stops can be reopened without searching
- The app remains usable without Supabase
- Backend health is visible in the UI
- The production build works without manual patching

## 12. Implementation Phases

### Phase 1
- Search
- Recent stops
- Favorites fallback
- Backend health indicator

### Phase 2
- Mode filtering
- Better multi-modal grouping
- Departure card refinements

### Phase 3
- Nearby stops
- Location-based shortcuts
- Nearby live bus previews
- More deployment polish

## 13. Open Questions

- Should we expand the nearby panel into a more map-like experience, or keep it list-first?
- Do we want cloud favorites to remain optional, or become a required part of the product later?
- Should the app eventually support a dedicated mobile/PWA install flow?
