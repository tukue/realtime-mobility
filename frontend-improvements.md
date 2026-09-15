# Frontend improvement roadmap

We will improve the frontend one focused step at a time. The existing terminology stays unchanged so returning users do not need to relearn the app.

## Step 1 — Make the starting action clear

**Status: Complete**

- Make **Find a stop** visually prominent.
- Add a small **Start here** cue.
- Explain that searching a stop or station opens live departures.
- Keep the existing search behavior and API unchanged.

## Step 2 — Make search results easier to scan

**Status: Next**

- Improve the visual separation between stop name and stop type.
- Add a clear selected/hover state.
- Make the result area easier to use with a keyboard and screen reader.
- Keep the existing result data and terminology.

## Step 3 — Make nearby stops easier to compare

**Status: Planned**

- Present distance, stop type, and live preview in a consistent hierarchy.
- Make **Open board** the clearest action on each result.
- Explain when results are based on browser location or manual input.

## Step 4 — Improve the live departure board

**Status: Planned**

- Emphasize the next departure.
- Make refresh and last-updated status easier to notice.
- Keep transport mode filters visible while reviewing departures.
- Make empty and error states actionable.

## Step 5 — Improve repeat use

**Status: Planned**

- Give Recent stops and Saved stops clearer priority after a stop has been selected.
- Make changing the selected stop easy from the departure board.
- Preserve the current stop and filter state during normal navigation.

## Working rule

Each step should:

1. Address one user-facing problem.
2. Preserve the current terminology and backend contract.
3. Be validated with the existing frontend build.
4. Be committed separately where practical.
