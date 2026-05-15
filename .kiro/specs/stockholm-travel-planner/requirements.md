# Requirements Document

## Introduction

This document defines requirements for four improvements to the Stockholm real-time transit webapp: Disruption Alerts with WebSocket live push, Journey Planning, Push Notifications, and Offline Support. The existing FastAPI + React/TypeScript stack and 30-second REST polling departure board remain unchanged. Requirements are derived from the approved design document.

## Glossary

- **DisruptionBanner**: React component that displays active service disruptions above the departure board.
- **useAlerts**: React hook that manages WebSocket connection and REST fallback for alert data.
- **AlertsConnectionManager**: Backend class that tracks active WebSocket connections grouped by `site_id` and broadcasts alert payloads.
- **AlertsPoller**: Backend asyncio task that polls the SL Deviations API every 60 seconds and broadcasts results via `AlertsConnectionManager`.
- **JourneyPlanner**: React component providing origin/destination input and trip option display.
- **JourneyService**: Backend service that calls the SL Trip API and normalises results.
- **NotificationManager**: React hook managing Web Push subscription lifecycle.
- **PushService**: Backend service that dispatches Web Push notifications via VAPID.
- **ServiceWorker**: Workbox-based service worker providing offline caching.
- **SL_Deviations_API**: SL Trafiklab REST endpoint for service disruption data.
- **SL_Trip_API**: SL Trafiklab REST endpoint for journey planning.
- **Alert**: Data object representing a single service disruption with id, header, details, severity, and scope.
- **Trip**: Data object representing a planned journey with legs, duration, and change count.
- **JourneyLeg**: Data object representing one segment of a Trip.
- **VAPID**: Voluntary Application Server Identification protocol used for Web Push authentication.
- **push_subscriptions**: Supabase table storing Web Push subscription data per stop and optional line filter.
- **site_id**: SL stop identifier string used to scope alerts, departures, and push subscriptions.

---

## Requirements

### Requirement 1: Disruption Alerts — WebSocket Connection

**User Story:** As a commuter, I want to see live disruption alerts for my selected stop without refreshing the page, so that I am immediately aware of service changes.

#### Acceptance Criteria

1. WHEN a user views a stop, THE useAlerts hook SHALL open a WebSocket connection to `/api/ws/alerts/{site_id}` on mount.
2. WHEN the WebSocket connection is established, THE AlertsConnectionManager SHALL send a `{"type": "connected", "site_id": "..."}` message to the client.
3. WHEN the WebSocket connection closes unexpectedly, THE useAlerts hook SHALL attempt to reconnect with exponential back-off starting at 1 second, doubling each attempt, capped at 30 seconds.
4. WHEN three consecutive reconnect attempts fail, THE useAlerts hook SHALL fall back to REST polling of `GET /api/alerts` at 60-second intervals.
5. WHEN the component unmounts or `siteId` changes, THE useAlerts hook SHALL close the WebSocket connection and cancel any active polling timer.
6. WHEN a WebSocket connection is closed, THE AlertsConnectionManager SHALL remove the corresponding socket from the active set for that `site_id`.

---

### Requirement 2: Disruption Alerts — Alert Data Push

**User Story:** As a commuter, I want disruption alerts to update automatically every minute, so that I always see current service status without manual refresh.

#### Acceptance Criteria

1. WHILE at least one WebSocket subscriber is connected for a `site_id`, THE AlertsPoller SHALL poll the SL_Deviations_API for that stop every 60 seconds.
2. WHEN the SL_Deviations_API returns successfully, THE AlertsPoller SHALL broadcast a `{"type": "alerts", "site_id": ..., "data": {...}, "timestamp": ...}` message to all connected clients for that `site_id`.
3. WHEN the SL_Deviations_API returns an error or times out, THE AlertsPoller SHALL broadcast a `{"type": "error", "site_id": ..., "message": ...}` message to all connected clients for that `site_id`.
4. WHEN a `{"type": "alerts"}` message is received, THE useAlerts hook SHALL update the `alerts` and `stopDeviations` state and clear any error state.
5. WHEN a `{"type": "error"}` message is received, THE useAlerts hook SHALL set the `error` state and retain the last known alerts without clearing them.
6. WHEN no WebSocket subscribers are connected for a `site_id`, THE AlertsPoller SHALL not issue any SL_Deviations_API requests for that stop.
7. THE AlertsPoller SHALL not start a new poll cycle for a site until the previous poll cycle for that site completes.

---

### Requirement 3: Disruption Alerts — REST Fallback

**User Story:** As a commuter, I want disruption alerts to remain available even when WebSocket is unavailable, so that I still see service status in degraded network conditions.

#### Acceptance Criteria

1. WHEN WebSocket is unavailable or three reconnect attempts have failed, THE useAlerts hook SHALL poll `GET /api/alerts?site_id={site_id}` every 60 seconds.
2. WHEN `GET /api/alerts` is called, THE AlertsRouter SHALL return an `AlertsResponse` containing `alerts` and `stop_deviations` arrays.
3. IF the SL_Deviations_API is unavailable, THEN THE AlertsRouter SHALL return an `AlertsResponse` with empty arrays rather than an HTTP error response.

---

### Requirement 4: Disruption Alerts — Display

**User Story:** As a commuter, I want disruption alerts displayed clearly above the departure board with severity colour-coding, so that I can quickly assess the impact of disruptions.

#### Acceptance Criteria

1. WHEN `alerts.length === 0`, THE DisruptionBanner SHALL not render any visible content.
2. WHEN alerts are present, THE DisruptionBanner SHALL colour-code each alert by severity: info as blue, warning as amber, critical as red.
3. WHEN the WebSocket connection state is `connected`, THE DisruptionBanner SHALL display a "Live" badge.
4. WHEN the WebSocket connection state is `disconnected` or `connecting`, THE DisruptionBanner SHALL display an "Updating..." indicator.
5. THE DisruptionBanner SHALL render independently of the departure board and SHALL NOT block departure board rendering.
6. THE Alert severity field SHALL be one of `{'info', 'warning', 'critical'}`, defaulting to `'info'` when the raw SL severity value is unrecognised.

---

### Requirement 5: Journey Planning — API

**User Story:** As a commuter, I want to plan a journey between two stops, so that I can find the best route and departure time.

#### Acceptance Criteria

1. WHEN a `POST /api/journey/plan` request is received with valid `origin_id` and `destination_id`, THE JourneyService SHALL query the SL_Trip_API and return a `JourneyResult`.
2. THE JourneyService SHALL return at most 5 trip options per request.
3. THE JourneyService SHALL return trips sorted in ascending order by `departure_time`.
4. WHEN the SL_Trip_API returns no routes or a non-200 response, THE JourneyService SHALL return a `JourneyResult` with an empty `trips` array without raising an exception.
5. IF `origin_id` equals `destination_id`, THEN THE JourneyService SHALL return a 400 error response.
6. THE JourneyService SHALL clamp the `max_changes` parameter to the range [0, 5].
7. WHEN `datetime` is omitted from the request, THE JourneyService SHALL default to the current UTC time.

---

### Requirement 6: Journey Planning — Leg Normalisation

**User Story:** As a commuter, I want journey legs to display consistent stop names, times, and line information, so that I can follow the route clearly.

#### Acceptance Criteria

1. WHEN normalising a raw SL trip leg, THE JourneyService SHALL produce a `JourneyLeg` with non-null `origin`, `destination`, `departure_time`, `arrival_time`, `line_number`, `transport_mode`, and `direction` fields.
2. WHEN a raw leg is missing optional fields, THE JourneyService SHALL substitute empty strings rather than raising an exception.
3. THE JourneyService SHALL set `transport_mode` to the lowercase value of the SL `catOut` field.

---

### Requirement 7: Journey Planning — UI

**User Story:** As a commuter, I want a journey planner interface with stop autocomplete, so that I can quickly enter origin and destination stops.

#### Acceptance Criteria

1. THE JourneyPlanner SHALL provide two stop search inputs (origin and destination) with autocomplete backed by the existing stop search functionality.
2. WHEN a journey result is returned, THE JourneyPlanner SHALL display up to 5 trip options sorted by departure time.
3. WHEN a trip option is selected, THE JourneyPlanner SHALL expand it to show individual legs with line number, transport mode, departure time, and arrival time.
4. WHEN the JourneyService returns an empty `trips` array, THE JourneyPlanner SHALL display a "No routes found" message and a retry button.

---

### Requirement 8: Push Notifications — Subscription

**User Story:** As a commuter, I want to subscribe to push notifications for a specific stop and optionally filter by line, so that I receive relevant departure alerts without opening the app.

#### Acceptance Criteria

1. WHEN a user subscribes, THE NotificationManager SHALL call `pushManager.subscribe` with `userVisibleOnly: true` and the VAPID public key.
2. WHEN a push subscription is obtained, THE NotificationManager SHALL POST the subscription to `POST /api/notifications/subscribe` with `site_id` and optional `line_filter`.
3. WHEN `POST /api/notifications/subscribe` is called, THE PushService SHALL upsert exactly one row in the `push_subscriptions` table keyed on `endpoint`.
4. WHEN `POST /api/notifications/subscribe` succeeds, THE PushService SHALL return `{"subscribed": true}`.
5. THE NotificationManager SHALL persist subscription state in `localStorage` to avoid re-subscribing on every mount.
6. WHEN the browser does not support `Notification` or `serviceWorker`, THE NotificationManager SHALL set `supported` to `false` and not attempt subscription.

---

### Requirement 9: Push Notifications — Dispatch

**User Story:** As a commuter, I want push notifications to be sent only for lines I care about, so that I am not overwhelmed by irrelevant alerts.

#### Acceptance Criteria

1. WHEN dispatching a push notification for a departure, THE PushService SHALL send to all subscriptions for the matching `site_id` where `line_filter` is empty or contains the departure's line number.
2. WHEN a push dispatch receives an HTTP 410 response from the push endpoint, THE PushService SHALL delete the corresponding subscription row from `push_subscriptions`.
3. WHEN a push dispatch fails for any reason other than 410, THE PushService SHALL log the error and continue processing remaining subscriptions.
4. THE PushService SHALL sign all push messages using the VAPID private key stored as an environment variable.

---

### Requirement 10: Offline Support — Service Worker Caching

**User Story:** As a commuter, I want the app to show cached departure data when I am offline, so that I can still see the last known timetable without an internet connection.

#### Acceptance Criteria

1. THE ServiceWorker SHALL precache the app shell (HTML, CSS, and JS bundles) using Workbox `precacheAndRoute`.
2. WHEN a fetch request matches `/api/departures/**`, THE ServiceWorker SHALL apply a NetworkFirst strategy with a 30-second network timeout.
3. WHEN the network request for `/api/departures/**` succeeds, THE ServiceWorker SHALL store the response in Cache Storage before returning it to the page.
4. WHEN the network request for `/api/departures/**` fails or times out, THE ServiceWorker SHALL return the cached response with an `X-Served-By: service-worker` header added.
5. WHEN no cached response exists and the network is unavailable, THE ServiceWorker SHALL return `{"offline": true, "buses": []}`.
6. WHEN a fetch request matches `/api/alerts/**`, THE ServiceWorker SHALL apply a StaleWhileRevalidate strategy.
7. WHEN the departure board receives a response with `X-Served-By: service-worker`, THE App SHALL display an offline indicator to the user.

---

### Requirement 11: Offline Support — Push Event Handling

**User Story:** As a commuter, I want push notifications to display correctly even when the app is in the background, so that I receive timely alerts regardless of app state.

#### Acceptance Criteria

1. WHEN the ServiceWorker receives a push event, THE ServiceWorker SHALL display a notification using the title and body from the push payload.

---

### Requirement 12: Security and Configuration

**User Story:** As a developer, I want sensitive credentials managed securely and inputs validated, so that the application is not vulnerable to injection or credential exposure.

#### Acceptance Criteria

1. THE PushService SHALL read VAPID private and public keys exclusively from environment variables and SHALL NOT commit them to source control.
2. WHEN a WebSocket connection request is received with an empty or malformed `site_id`, THE AlertsRouter SHALL reject the connection with a 4000-series WebSocket close code.
3. THE ServiceWorker SHALL only cache responses originating from the app's own origin.
4. WHEN `origin_id` equals `destination_id` in a journey plan request, THE JourneyService SHALL return a 400 response before calling the SL_Trip_API.
