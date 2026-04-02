# Requirements: Stockholm Transit Improvements

## Overview

Four features are added to the Stockholm real-time transit webapp in priority order: Disruption Alerts, Journey Planning, Push Notifications, and Offline Support. Each requirement maps directly to a design section in `design.md`.

---

## Feature 1: Disruption Alerts

### 1.1 Alert fetch on stop selection

**User story**: As a rider, I want to see active service disruptions for my selected stop so I know about delays or cancellations before I travel.

**Acceptance criteria**:

1. WHEN a stop is selected THEN the frontend calls `GET /api/alerts?site_id={id}&source=free` within 500 ms of the stop board rendering.
2. WHEN the API returns one or more alerts THEN the `DisruptionBanner` component is visible above the departure board.
3. WHEN the API returns an empty alerts list THEN the `DisruptionBanner` is not rendered (no empty placeholder).
4. WHEN the alerts API call fails (network error or 5xx) THEN the departure board still renders normally and no error is shown to the user for the alerts failure.

### 1.2 Alert severity display

**User story**: As a rider, I want disruptions colour-coded by severity so I can quickly judge how serious they are.

**Acceptance criteria**:

1. WHEN an alert has `severity: 'critical'` THEN the banner uses a red colour scheme.
2. WHEN an alert has `severity: 'warning'` THEN the banner uses an amber colour scheme.
3. WHEN an alert has `severity: 'info'` THEN the banner uses a blue colour scheme.
4. WHEN the SL API returns an unrecognised severity string THEN the system maps it to `'info'` and does not throw an error.

### 1.3 Backend alerts endpoint

**User story**: As a developer, I need a `/api/alerts` endpoint that normalises SL deviation data into a consistent shape.

**Acceptance criteria**:

1. WHEN `GET /api/alerts?site_id={id}&source=free` is called THEN the response has shape `{alerts: Alert[], stop_deviations: Alert[], status: string}`.
2. WHEN the SL deviations API is unreachable THEN the endpoint returns `{alerts: [], stop_deviations: [], status: 'error', message: string}` with HTTP 200 (not 5xx).
3. WHEN an alert is normalised THEN its `severity` field is always one of `'info' | 'warning' | 'critical'`.

---