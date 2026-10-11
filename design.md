# Design: Stockholm Transit Checker

## 1. Product Goal

Build a fast, mobile-friendly app for checking Stockholm public transport live updates with as little friction as possible.

The app should let a rider:
- Search for a stop or station quickly
- See live updates across transport modes
- Reopen recent and saved stops in one tap
- Understand whether the backend and live data are currently healthy

Live travel dashboards remain the primary experience. A journey planning panel also lets riders compare routes between two selected stops.

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
- Journey planning panel
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

## 14. PR #34: Accessible Journey Planning Design

### 14.1 User flow and scope

Expose the existing journey planner and backend on the main page. Riders can
check upcoming services at one station in the live travel dashboards or plan a
journey between two stations. The planner appears before the live board and is
available before any station is selected. A jump link targets its focusable heading.

Here, accessible refers to keyboard and assistive-technology interaction.
Wheelchair accessibility, step-free routing, lift availability, and accessible
transfer guarantees require provider data and routing options beyond this PR.

### 14.2 State ownership and station selection

`App` owns the main selected station and passes it as `initialOrigin`. Changing
that station updates the planner origin while preserving the destination. The
planner owns its inputs, results, loading state, and errors locally; this flow
does not require a global state store.

Each endpoint has separate text and selected-station state. A typed name is not
proof of a valid station. Selecting a suggestion stores its stable `SiteId`;
editing the text clears the selection and old results. Requests require two
selected, distinct IDs. `canSearch` is derived from those selections and loading
state rather than stored separately, reducing contradictory UI states.

### 14.3 Asynchronous work and stale data

Station suggestions appear inline and remain visible after input blur, until
selection or Escape, so riders can click a station without losing the list.
Stop searches require at least two trimmed characters and wait 300 milliseconds
after typing. Effect cleanup cancels the debounce timer and prevents obsolete
search responses from updating suggestions. In-flight stop searches are ignored
when obsolete rather than aborted at the HTTP layer.

Journey requests use both an `AbortController` and a request generation counter.
Cancellation reduces obsolete work; the counter prevents a late response from
replacing newer state even if cancellation arrives too late. Editing an endpoint,
changing the main selected origin, or unmounting invalidates the pending request.
A 15-second timeout prevents an indefinitely loading form.

### 14.4 API boundary and result presentation

The frontend reuses `searchStops` and posts selected IDs to `/api/journey/plan`.
FastAPI retains provider integration and response normalization. The browser
consumes normalized trip and leg fields rather than provider-specific payloads.
The initial integration reused the existing backend. The subsequent Find routes
fix migrates its provider adapter to SL Journey-planner v2 while preserving the
frontend API contract. Short Transport site IDs become global IDs at the backend
boundary, and provider timestamps are rendered in Europe/Stockholm.

Trip summaries expose times, duration, and changes; expandable details show the
legs. The first route opens automatically so its itinerary is immediately visible;
other numbered routes expose a Show details action. A prominent count banner and
focused results heading bring successful results into view. Loading, failed
requests, and successful empty results have separate UI states and retry actions.
The frontend checks that `trips` is an array; complete runtime validation of every
nested trip field remains a possible improvement.

### 14.5 Accessibility decisions

Station fields use labeled comboboxes with listboxes, active descendants, and
selected options. Arrow keys navigate, Enter selects, Escape dismisses, and Tab
continues through the form. Pointer selection preserves input focus until the
option is selected. Loading and results use polite status announcements; errors
use alerts. Expandable trip buttons expose `aria-expanded` and `aria-controls`,
with unique detail IDs generated by `useId`. Existing focus styles remain enabled.

DOM tests verify semantics and keyboard behavior. Manual checks with screen
readers, touch devices, and multiple browsers are still needed to assess the
complete accessibility experience.

### 14.6 Tests and their boundaries

The frontend suite covers main-page integration, keyboard and pointer selection,
request IDs, validation, details, retries, timeout, cancellation, and stale
responses using mocked search and journey responses.

The separate `npm run test:integration` suite connects the real planner and
stop-search client to the real FastAPI application and services through a Python
ASGI bridge. Only external SL HTTP responses are replaced with sample Odenplan,
T-Centralen, and Slussen data. It checks a transfer journey, empty results with
retry, and invalid API requests. JSON over subprocess stdin/stdout avoids a
listening server. CI installs Python dependencies before running this suite.

These are frontend/backend integration tests, not browser end-to-end or live
provider tests. They bypass the application lifespan and unrelated alert polling.
They do not verify deployed networking, provider credentials, or current station
availability. Local execution was blocked by missing Python dependencies when
added; a passing CI integration run is needed to establish execution confidence.

### 14.7 Runtime, dependencies, and content

CI selects the latest Node 24 release; Docker uses the Node 24 image and `.nvmrc`
selects Node 24 for local development. These floating versions receive updates,
but builds at different times may use different patch releases.

Vitest 4.1.11 removes the vulnerable Tinypool dependency chain, while Vite 7.3.7
and refreshed transitive dependencies address the reported build-tool issues.
`package-lock.json` records resolved versions; `npm ci` and the existing audit
step remain CI checks. The reported low-severity Babel advisory was not resolved
by that update, and a fresh online audit remains required. Node upgrades alone
do not remediate dependency advisories.

The copy now uses “Live travel dashboards” throughout the app and documentation.
This is a wording change; station-level service behavior is unchanged. The
empty-journey message invites trying other stations without claiming delivery of
an accessible or guaranteed route.

### 14.8 Remaining service limitations

Journey planning requires online backend/provider access and is not supplied by
offline departure caches. The v2 adapter propagates provider failures and rejects
unrecognized response schemas instead of presenting them as empty results.
Deployments with an explicit `SL_JOURNEY_URL` must update it to the v2 trips URL.
Synthetic fixtures verify the wire contract; live provider verification remains
necessary to confirm current route availability.

### 14.9 Usability feedback and validation

The station-search count was mistaken for a completed route search. Suggestions
previously disappeared on input blur while the count stayed visible, leaving
unselected endpoints and an unavailable Find routes action. Suggestions now use
normal document flow and remain visible until selection or Escape. Selection
instructions explain the remaining action instead of relying on the count alone.

Successful journeys now have a prominent count banner, a focusable heading that
scrolls into view, numbered route cards, and explicit Show details / Hide details
labels. The first itinerary opens automatically. A search result generation resets
card expansion even when React batches a fast repeat request; this behavior was
caught and verified by a regression test. Empty and failed requests preserve
input focus rather than moving it to a nonexistent results heading.

On 11 October 2026, the user confirmed the feature was working following these
improvements, in the context of the reported Norgegatan → Sollentuna search.
The latest local frontend run passed 25 tests and the production build passed.
This user confirmation complements the fixtures; it does not establish a complete
browser, screen-reader, or live-provider compatibility matrix.
