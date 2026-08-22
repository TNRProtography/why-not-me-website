// Course definitions for the live tracker.
//
// Which course is active is controlled from the admin page
// (Marathon Tracker card -> Course). The value is stored in the
// site config as `tracker.course` and is one of the keys below.
//
// Everything the tracker page needs to know about a course lives here:
// the KML route file, the map's default view, the race distance, which
// split markers to drop on the route, and any spectator zones.

export const COURSES = {
  queenstown: {
    id: 'queenstown',
    label: 'Queenstown Marathon',
    // Kicker above the tracker page headline
    trackerLabel: 'Live Marathon Tracker',
    // Shown on the map's "waiting for race day" overlay
    locationName: 'Queenstown, New Zealand',
    kmlUrl: '/data/queenstown-marathon.kml',
    kmlSourceName: 'queenstown-marathon.kml',
    // Start area - used when there is no tracker data yet, and by "recenter"
    defaultCenter: [-45.0312, 168.6626],
    defaultZoom: 13,
    distanceKm: 42.2,
    // KML carries real per-point altitude, so the elevation profile is meaningful
    hasElevation: true,
    splitMarkersKm: [1, 5, 10, 15, 20, 21.1, 25, 30, 35, 40],
    // Tick labels along the bottom of the elevation profile
    elevationTicksKm: [0, 5, 10, 15, 20, 25, 30, 35, 40, 42.2],
    spectatorZones: [
      { id: 'zone-1', label: 'Spectator Zone 1', lat: -44.988056, lng: 168.811444 },
      { id: 'zone-2', label: 'Spectator Zone 2', lat: -44.997111, lng: 168.756722 },
      { id: 'zone-3', label: 'Spectator Zone 3', lat: -45.030639, lng: 168.659472 },
      { id: 'zone-4', label: 'Spectator Zone 4', lat: -45.029111, lng: 168.66 },
    ],
  },

  bottleLake: {
    id: 'bottleLake',
    label: 'Bottle Lake Half Marathon',
    trackerLabel: 'Live Half Marathon Tracker',
    locationName: 'Bottle Lake Forest, Christchurch',
    kmlUrl: '/data/bottle-lake-half-marathon.kml',
    kmlSourceName: 'bottle-lake-half-marathon.kml',
    defaultCenter: [-43.45465, 172.69981],
    defaultZoom: 13,
    distanceKm: 21.1,
    // The My Maps export has no altitude data (every point is 0m), so the
    // profile renders flat. Re-plot on plotaroute.com and swap the KML if a
    // real elevation profile is wanted here.
    hasElevation: false,
    splitMarkersKm: [1, 5, 10, 15, 20, 21.1],
    elevationTicksKm: [0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 21.1],
    spectatorZones: [],
  },
}

export const DEFAULT_COURSE_ID = 'queenstown'

export function getCourse(courseId) {
  return COURSES[courseId] || COURSES[DEFAULT_COURSE_ID]
}

// For the admin dropdown
export const COURSE_OPTIONS = Object.values(COURSES).map((c) => ({
  value: c.id,
  label: c.label,
}))
