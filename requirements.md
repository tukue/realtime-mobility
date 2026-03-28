# Requirements: Stockholm Bus Travel Planner (Dinner Lines)

## Project Overview
A real-time bus travel planner focused on "Dinner Lines" in Stockholm—high-frequency routes connecting residential areas to major dining and nightlife hubs (e.g., Södermalm, Vasastan, Östermalm).

## 1. Functional Requirements

### 1.1 Search & Navigation
- **Stop Search:** Users can search for any SL bus stop by name.
- **Route Planning:** Plan a journey from current location (GPS) or a specific stop to a "Dinner Destination."
- **Nearby Stops:** Automatically detect the user's location and show the closest bus stops.

### 1.2 Real-Time Information
- **Live Departures:** Show real-time "minutes to arrival" for buses, not just scheduled times.
- **Line Tracking:** Display the current progress of a bus on its route.
- **Service Alerts:** Real-time notifications for delays, cancellations, or rerouted "Dinner Lines."

### 1.3 "Dinner Lines" Specialization
- **Curated Routes:** A dedicated "Dinner Lines" mode highlighting high-frequency night and evening bus lines (e.g., 1, 2, 3, 4, and night buses).
- **Popular Destinations:** Quick-access shortcuts to restaurant-heavy areas like Mariatorget, Stureplan, and Odenplan.

### 1.4 Personalization
- **Favorites:** Ability to save "Work to Dinner" or "Home to Dinner" routes.
- **Recent Searches:** Store the last 5 searched stops locally.

## 2. Non-Functional Requirements

### 2.1 Performance
- **Low Latency:** Real-time data must refresh every 30 seconds automatically.
- **Fast Load Time:** Initial app load under 2 seconds on 4G/5G connections.

### 2.2 Usability
- **Mobile First:** The UI must be optimized for one-handed use on mobile devices (large buttons, bottom navigation).
- **Accessibility:** High contrast ratios and ARIA labels for screen readers.

### 2.3 Reliability
- **Graceful Degradation:** If the SL Real-time API is down, show the static timetable and a warning.
- **Offline Support:** Basic caching of the last viewed departures.

## 3. Data Sources
- **Trafiklab SL APIs:** 
  - SL Stop Lookup (Typeahead)
  - SL Real-time Information 4
  - SL Trip Planner 3.1
  - SL Situation 4 (Deviations)
