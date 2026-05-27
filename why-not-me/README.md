# Trail + Elevation Interactive Explorer — Modified Files

## What changed

Two files were modified and one new file was added:

### New file
- `src/components/TrailElevationExplorer.jsx` — The new interactive component

### Modified files
- `src/pages/LiveTrackerPage.jsx` — Two changes:
  1. Added import for `TrailElevationExplorer`
  2. Replaced the static SVG elevation panel (the `{elevationProfile && (...)}` block) with `<TrailElevationExplorer />`
  3. Removed the now-unused `elevationProfile` useMemo

## How to install

1. Copy `src/components/TrailElevationExplorer.jsx` into your project's `src/components/` directory
2. Replace your existing `src/pages/LiveTrackerPage.jsx` with the modified version

No new dependencies are needed — the component uses only React hooks and the Canvas API.
It loads the same `/data/queenstown-marathon.kml` file already in your `public/data/` folder.
