# WebSocket Implementation

This document explains how real-time alerts are pushed to the client using WebSockets.

## Overview

- The WebSocket endpoint is served by the backend and allows the client to subscribe to alert updates for a single `site_id`.
- The server keeps a per-site list of active sockets and broadcasts updates as they arrive.
- Alerts are produced by a background poller that fetches SL alerts and pushes them to all subscribers.

## Roles

- **Server:** the FastAPI backend (`backend/main.py` + `backend/routers/alerts.py`) hosts the WebSocket endpoint and pushes updates.
- **Client:** the frontend (browser) opens the WebSocket and receives pushed alerts.
- **External API:** the SL API is an external server that the backend calls to fetch alerts.

## Server Endpoints

- `GET /api/alerts/` returns the current snapshot of alerts (HTTP fallback).
- `WS /api/alerts/ws/{site_id}` opens a WebSocket subscription for live alerts.

## Connection Flow

1. Client opens `WS /api/alerts/ws/{site_id}`.
2. Server accepts the connection and validates `site_id`.
3. On success, the socket is registered and a `connected` message is sent.
4. The connection stays open and the server pushes alerts as they arrive.
5. On disconnect, the socket is removed from the manager.

## Data Flow (Diagram)

```text
Browser (Client)
  |
  |  WS /api/alerts/ws/{site_id}
  v
FastAPI Backend (Server)
  | \
  |  \  HTTP (poller)
  |   \--> SL API (External Server)
  |
  +--> Broadcast alerts to all connected sockets
```

## Message Types

All messages are JSON objects.

- `connected`
  - Sent once after registration.
  - Payload: `{ "type": "connected", "site_id": "<id>" }`
- `alerts`
  - Sent when new alerts are fetched for the site.
  - Payload: `{ "type": "alerts", "site_id": "<id>", "data": <alert_payload>, "timestamp": "<iso8601>" }`
- `error`
  - Sent when the poller fails to fetch alerts.
  - Payload: `{ "type": "error", "site_id": "<id>", "message": "<error>" }`

## Key Modules

- `backend/routers/alerts.py`
  - WebSocket endpoint and HTTP fallback.
- `backend/services/alerts_manager.py`
  - Connection registry, broadcast, and disconnect logic.
- `backend/services/alerts_service.py`
  - Normalization for alert payloads.
- `backend/services/alerts_manager.py` (poller)
  - Periodic fetch and broadcast loop.

## Notes

- The WebSocket handshake must be accepted before sending a close frame.
- Broadcasts iterate over a snapshot list of sockets to avoid mutation during disconnect.
- If no subscribers exist for a site, the poller skips fetching for that site.
