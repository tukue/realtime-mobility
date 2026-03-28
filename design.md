# Design: Stockholm Bus "Dinner Lines" Planner

## 1. Visual Style

### 1.1 Color Palette
- **Primary:** `SL Blue (#0089d1)`
- **Secondary:** `Evening Navy (#1a202c)`
- **Accent:** `Amber (#f6ad55)` - to highlight "Dinner" destinations and night routes.
- **Background:** `Off-white (#f7fafc)` or `Dark Mode Navy (#2d3748)`.

### 1.2 Typography
- **Primary Font:** `Inter` or `Inter Variable`
- **Headings:** Bold, large font (e.g., 24px+) for ease of use in transit.
- **Body:** Standard, readable size (16px) for stop names and times.

## 2. Component Design

### 2.1 "Quick Search" Header
- A search input with high-frequency "Dinner Destinations" (e.g., "Södermalm", "Mariatorget", "Stureplan").
- "Locate Me" icon that fetches current GPS coordinates.

### 2.2 Live Bus Card
- **Large Arrival Time:** High contrast "X mins" at the right edge.
- **Line Badge:** Square or circle with the line number (e.g., [4] in blue or red).
- **Progress Bar:** A small visual line showing how far the bus is from the current stop.
- **Service Warning Icon:** Yellow triangle if there is an active deviation on the line.

### 2.3 "Dinner Lines" Quick View
- A tab or drawer showing only the main inner-city buses (Lines 1, 2, 3, 4) and their current status.
- Color-coded: Green (On Time), Yellow (Minor Delay), Red (Significant Delay).

### 2.4 Interactive Map (Bottom/Background)
- A minimalist map with bus icons moving in real-time.
- Highlight the user's location and the nearest "Dinner Line" bus stops.

## 3. User Experience (UX) Flow

1.  **Home:** User opens the app. Shows "Nearby Departures" and "Recent Routes" automatically.
2.  **Search:** User types "Mariatorget." A dropdown with Site IDs appears.
3.  **Real-Time Board:** On selection, a list of incoming buses appears.
4.  **Journey Planning:** User selects "Plan Journey." Shows step-by-step route from current location.
5.  **Tracking:** User taps a bus number to see all upcoming stops for that specific vehicle.

## 4. Navigation (Tab Bar)
- **Departures:** Live board for current/saved stops.
- **Plan:** A-to-B journey planner.
- **Dinner Lines:** Quick status of major routes (1, 2, 3, 4).
- **Settings:** API keys, favorites, and dark mode toggle.
