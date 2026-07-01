# Trail + Elevation Explorer v2 — Modified Files

## What changed

### New files
- `src/components/TrailElevationExplorer.jsx` — Interactive Leaflet map + canvas elevation profile with GPS replay
- `src/components/TrailElevationExplorer.css` — All styling for the explorer component

### Modified files
- `src/pages/LiveTrackerPage.jsx` — Three changes:
  1. Added import for `TrailElevationExplorer`
  2. Replaced the static SVG elevation panel with `<TrailElevationExplorer history={sortedHistory} />`
  3. Removed the now-unused `elevationProfile` useMemo

## Features
- **Working basemap switching** — Dark, Light, Streets tiles with proper Leaflet layer management
- **Interactive elevation scrub** — Hover the elevation chart to see a marker on the Leaflet map
- **GPS replay animation** — When tracker history exists, a "Replay Run" button appears:
  - Animates Nicole's marker along her actual GPS trail
  - Camera smoothly follows the marker
  - Elevation chart scrubs in sync
  - Adjustable speed (50×, 200×, 500×, 1000×)
  - Clickable scrub bar to jump to any point
  - Play / Pause / Resume / Stop controls

## How to install
1. Copy both files from `src/components/` into your project's `src/components/` directory
2. Replace your existing `src/pages/LiveTrackerPage.jsx` with the modified version

No new dependencies — uses Leaflet from CDN (already loaded by LiveTrackerPage) and the Canvas API.
