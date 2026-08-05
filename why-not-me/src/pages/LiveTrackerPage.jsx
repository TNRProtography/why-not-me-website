import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { trackLiveTrackerView, trackLiveTrackerMapInteraction, trackSplitMarkerClick, trackElevationProfileInteraction, trackTrackerDataStatus, trackMapZoomChange } from '../utils/analytics'
import './LiveTrackerPage.css'

const API_BASE = 'https://marathon-tracking-proxy.why-not-me-nicole-white.workers.dev'
const API_ENDPOINT = `${API_BASE}/live.json`
const POLL_INTERVAL = 3000
const KML_ROUTE_URL = '/data/queenstown-marathon.kml'

// Queenstown Marathon start area - default when no tracker data
const DEFAULT_CENTER = [-45.0312, 168.6626]
const DEFAULT_ZOOM = 13

const SITE_COLORS = {
  gold: '#A88E5D',
  warm: '#CBB299',
  white: '#F5F3EC',
}

const BASEMAPS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    label: 'Dark',
    className: 'basemap-dark',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    label: 'Satellite',
    className: 'basemap-satellite',
    maxZoom: 19,
  },
}
const BASEMAP = BASEMAPS.dark

const MARATHON_DISTANCE_KM = 42.2
const SPLIT_MARKERS_KM = [1, 5, 10, 15, 20, 21.1, 25, 30, 35, 40]
const SPECTATOR_ZONES = [
  { id: 'zone-1', label: 'Spectator Zone 1', lat: -44.988056, lng: 168.811444 },
  { id: 'zone-2', label: 'Spectator Zone 2', lat: -44.997111, lng: 168.756722 },
  { id: 'zone-3', label: 'Spectator Zone 3', lat: -45.030639, lng: 168.659472 },
  { id: 'zone-4', label: 'Spectator Zone 4', lat: -45.029111, lng: 168.66 },
]

function formatAge(seconds) {
  if (seconds == null) return ''
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`
  return `${Math.round(seconds / 86400)}d ago`
}

function formatDuration(startedAt, now = Date.now()) {
  if (!startedAt) return '--'
  const ms = now - new Date(startedAt).getTime()
  if (ms < 0) return '--'
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatClockTime(date) {
  if (!date) return '--'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDateTime(date) {
  if (!date) return '--'
  return date.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function normalizeTimestamp(value) {
  if (value == null || value === '') return null

  let ms = null
  if (typeof value === 'number') {
    ms = value < 1000000000000 ? value * 1000 : value
  } else if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const numeric = Number(trimmed)
    if (Number.isFinite(numeric) && /^\d+(\.\d+)?$/.test(trimmed)) {
      ms = numeric < 1000000000000 ? numeric * 1000 : numeric
    } else {
      const parsed = Date.parse(trimmed)
      if (Number.isFinite(parsed)) ms = parsed
    }
  }

  return Number.isFinite(ms) && ms > 0 ? ms : null
}

// When the phone loses reception, OwnTracks queues points and replays them once
// signal returns. Every replayed point arrives stamped with the CURRENT time, so
// arrival time says a 20-minute-old position is the newest thing we have. Ordering
// by arrival makes the marker jump backwards down the course and scribbles the
// trail over ground already covered.
//
// GPS time is when the runner was actually at that spot, so that is what orders
// position. Arrival time is still useful, but only for answering "how long since
// the server last heard anything" — that lives in getPointArrivalTimeMs below.
function getPointReceivedTimeMs(point) {
  if (!point) return null

  const candidates = [
    point.gpsTimestamp,
    point.time,
    point.location?.timestamp,
    point.timestamp,
    point.ownTracks?.tst,
    // Fall back to arrival only when the point carries no GPS time at all.
    point.receivedAt,
    point.lastReceivedAt,
    point.ingestedAt,
    point.location?.receivedAt,
    point.location?.lastReceivedAt,
    point.ownTracks?.receivedAt,
  ]

  for (const candidate of candidates) {
    const ms = normalizeTimestamp(candidate)
    if (ms != null) return ms
  }

  return null
}

// Arrival time — when the server received this point, regardless of when the GPS
// fix was taken. Used for connection health, never for ordering positions.
function getPointArrivalTimeMs(point) {
  if (!point) return null

  const candidates = [
    point.receivedAt,
    point.lastReceivedAt,
    point.ingestedAt,
    point.location?.receivedAt,
    point.location?.lastReceivedAt,
    point.ownTracks?.receivedAt,
    point.gpsTimestamp,
    point.time,
    point.timestamp,
  ]

  for (const candidate of candidates) {
    const ms = normalizeTimestamp(candidate)
    if (ms != null) return ms
  }

  return null
}

// True when this point was recorded well before it reached the server — i.e. it
// came out of the phone's offline queue rather than arriving live.
function isBackloggedPoint(point, thresholdSeconds = 120) {
  if (point?.backlogged === true) return true

  const gpsMs = normalizeTimestamp(
    point?.gpsTimestamp ?? point?.time ?? point?.timestamp
  )
  const arrivalMs = normalizeTimestamp(point?.receivedAt ?? point?.lastReceivedAt)

  if (gpsMs == null || arrivalMs == null) return false
  return (arrivalMs - gpsMs) / 1000 > thresholdSeconds
}

function getLatestReceivedAt(data, history) {
  const times = []

  const pushTime = (value) => {
    const ms = normalizeTimestamp(value)
    if (ms != null) times.push(ms)
  }

  // Connection health question: when did the server last hear ANYTHING?
  // That is arrival time, including points replayed out of the offline queue.
  pushTime(data?.lastReceivedAt)
  pushTime(data?.receivedAt)
  pushTime(data?.location?.receivedAt)
  pushTime(data?.ownTracks?.receivedAt)
  pushTime(data?.ownTracks?.tst)
  pushTime(data?.gpsTimestamp)
  pushTime(data?.location?.timestamp)
  pushTime(data?.timestamp)

  if (Array.isArray(history)) {
    history.forEach((point) => {
      const ms = getPointArrivalTimeMs(point)
      if (ms != null) times.push(ms)
    })
  }

  if (!times.length) return null
  return new Date(Math.max(...times))
}

// Merge a delta batch into the history we already hold.
// Deduped on gps timestamp, so a replayed point that we already received
// replaces rather than duplicates, and the result stays in GPS order.
function mergeHistory(existing, incoming) {
  if (!incoming?.length) return existing
  if (!existing?.length) return sortHistory(incoming)

  const byKey = new Map()

  const keyOf = (p) => {
    const ms = getPointReceivedTimeMs(p)
    if (ms != null) return `t:${ms}`
    return `c:${p?.location?.lat},${p?.location?.lng}`
  }

  for (const p of existing) byKey.set(keyOf(p), p)
  for (const p of incoming) byKey.set(keyOf(p), p)

  return sortHistory([...byKey.values()])
}

function sortHistory(points) {
  if (!Array.isArray(points)) return []
  return [...points].sort((a, b) => {
    const aTime = getPointReceivedTimeMs(a)
    const bTime = getPointReceivedTimeMs(b)
    if (aTime == null && bTime == null) return 0
    if (aTime == null) return 1
    if (bTime == null) return -1
    return aTime - bTime
  })
}

function getSpeedKmh(point) {
  // Prefer calculated speed (full precision) over OwnTracks vel (integer)
  if (point?.speed?.calculatedKmh != null) return point.speed.calculatedKmh
  if (point?.speed?.kmh != null) return point.speed.kmh
  return null
}

function speedLabel(kmh) {
  if (kmh == null || kmh <= 0) return 'Stopped'
  if (kmh <= 2) return 'Stationary'
  if (kmh <= 5) return 'Walking'
  if (kmh <= 8) return 'Jogging'
  if (kmh <= 12) return 'Running'
  if (kmh <= 16) return 'Fast run'
  return 'Sprint'
}

function speedColor(kmh) {
  // Cool-to-hot progression: slate → teal → brand gold → amber → orange → red.
  // Extra range makes speed immediately visible on the dark map and progress bar.
  if (kmh == null || kmh < 2) return '#4A5870'  // near-stationary: cool slate
  if (kmh < 5) return '#5E8A78'                  // walking: teal-green
  if (kmh < 8) return '#A88E5D'                  // jogging: brand gold
  if (kmh < 11) return '#D4A020'                 // running: bright amber
  if (kmh < 14) return '#D96030'                 // fast run: warm orange
  return '#C83838'                                // sprint: deep red
}

function formatMinPerKm(kmh) {
  if (!kmh || kmh <= 0.5) return null
  const minutesPerKm = 60 / kmh
  const minutes = Math.floor(minutesPerKm)
  const seconds = Math.round((minutesPerKm - minutes) * 60)
  // Handle edge case where rounding pushes seconds to 60
  if (seconds >= 60) return `${minutes + 1}:00`
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatSpeedKmh(kmh) {
  if (kmh == null) return '--'
  const num = Number(kmh)
  if (!Number.isFinite(num)) return '--'
  // Show 1 decimal for display, but keep full value for pace calc
  return num.toFixed(1)
}

function haversineKm(a, b) {
  if (!a || !b) return 0
  const latA = a.lat ?? a[0]
  const lngA = a.lng ?? a[1]
  const latB = b.lat ?? b[0]
  const lngB = b.lng ?? b[1]
  if (![latA, lngA, latB, lngB].every(Number.isFinite)) return 0

  const R = 6371
  const dLat = ((latB - latA) * Math.PI) / 180
  const dLng = ((lngB - lngA) * Math.PI) / 180
  const lat1 = (latA * Math.PI) / 180
  const lat2 = (latB * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function nearestKmlElevation(lat, lng, kmlPoints) {
  let bestDist = Infinity, bestElev = null
  for (const kp of kmlPoints) {
    if (kp.elevation == null) continue
    const d = haversineKm({ lat, lng }, kp)
    if (d < bestDist) { bestDist = d; bestElev = kp.elevation }
  }
  return bestElev
}

function parseKmlRoute(kmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(kmlText, 'application/xml')
  const lineStrings = Array.from(doc.getElementsByTagName('LineString'))
  const routeLine = lineStrings.find(line => line.getAttribute('id') === 'Route') || lineStrings[0]
  const coordinatesNode = routeLine?.getElementsByTagName('coordinates')?.[0]

  if (!coordinatesNode?.textContent) return []

  return coordinatesNode.textContent
    .trim()
    .split(/\s+/)
    .map((point) => {
      const [lng, lat, elevation] = point.split(',').map(Number)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      return {
        lat,
        lng,
        elevation: Number.isFinite(elevation) ? elevation : null,
      }
    })
    .filter(Boolean)
}

function buildElevationProfile(routePoints) {
  const points = []
  let distanceKm = 0
  let minElevation = Infinity
  let maxElevation = -Infinity
  let elevationGain = 0
  let elevationLoss = 0
  let previousProfilePoint = null

  routePoints.forEach((point, index) => {
    if (index > 0) distanceKm += haversineKm(routePoints[index - 1], point)
    if (!Number.isFinite(point.elevation)) return

    if (previousProfilePoint) {
      const delta = point.elevation - previousProfilePoint.elevation
      if (delta > 0) elevationGain += delta
      if (delta < 0) elevationLoss += Math.abs(delta)
    }

    minElevation = Math.min(minElevation, point.elevation)
    maxElevation = Math.max(maxElevation, point.elevation)
    previousProfilePoint = point
    points.push({ distanceKm, elevation: point.elevation })
  })

  if (points.length < 2 || !Number.isFinite(minElevation) || !Number.isFinite(maxElevation)) return null

  const width = 1000
  const height = 190
  const padX = 24
  const padTop = 18
  const padBottom = 32
  const plotWidth = width - padX * 2
  const plotHeight = height - padTop - padBottom
  const totalDistanceKm = points[points.length - 1].distanceKm || 1
  const elevationRange = Math.max(1, maxElevation - minElevation)

  const svgPoints = points.map((point) => {
    const x = padX + (point.distanceKm / totalDistanceKm) * plotWidth
    const y = padTop + (1 - (point.elevation - minElevation) / elevationRange) * plotHeight
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')

  const firstX = padX
  const lastX = padX + plotWidth
  const baseY = height - padBottom
  const areaPoints = `${firstX},${baseY} ${svgPoints} ${lastX},${baseY}`

  return {
    points,
    svgPoints,
    areaPoints,
    width,
    height,
    totalDistanceKm,
    minElevation,
    maxElevation,
    elevationGain,
    elevationLoss,
  }
}

function createTileLayer(L, config) {
  return L.tileLayer(config.url, {
    attribution: config.attribution,
    maxZoom: config.maxZoom || 19,
    maxNativeZoom: config.maxNativeZoom,
  })
}

function createCourseMarkerIcon(L, label, type) {
  return L.divIcon({
    className: `course-marker-container course-marker-${type}`,
    html: `<div class="course-marker"><span>${label}</span></div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  })
}

export default function LiveTrackerPage() {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const tileLayerRef = useRef(null)
  const markerRef = useRef(null)
  const routeLayerRef = useRef(null)
  const trailLayerRef = useRef(null)
  const mapInitializedRef = useRef(false)
  const fetchInFlightRef = useRef(false)
  const fetchControllerRef = useRef(null)
  const refreshTimeoutRef = useRef(null)
  const elevCanvasRef = useRef(null)
  const elevWrapRef = useRef(null)
  const hoverMarkerRef = useRef(null)
  const splitLayerRef = useRef(null)
  const spectatorLayerRef = useRef(null)
  const userLocationRef = useRef({ marker: null, accuracy: null })
  const nicoleElevImgRef = useRef(null)

  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  // Number of queued (offline) points that arrived in the last 90s. Non-zero
  // means the phone is draining its backlog after regaining reception.
  const [backlogCount, setBacklogCount] = useState(0)
  // Arrival-time watermark: the newest point the server has already given us.
  // Sent back as ?since= so each poll only carries what we are missing.
  const syncTokenRef = useRef(0)
  // Mirror of `history` that fetchData can read without re-creating itself.
  const historyRef = useRef([])
  // Set when we detect we are missing points; next poll refetches everything.
  const needsResyncRef = useRef(false)
  // Server's total point count, so we can spot a desync and resync in full.
  const serverTotalRef = useRef(null)
  const [kmlTrackPath, setKmlTrackPath] = useState([])
  const [kmlSourceName, setKmlSourceName] = useState('queenstown-marathon.kml')
  const [kmlError, setKmlError] = useState(null)
  const [mapReady, setMapReady] = useState(false)
  const [error, setError] = useState(null)
  const [apiStatus, setApiStatus] = useState('loading') // 'loading' | 'live' | 'waiting' | 'error'
  const [showMarkers, setShowMarkers] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [elevHoverIdx, setElevHoverIdx] = useState(null)
  const hasInitialPanRef = useRef(false)
  const lastGpsTimestampRef = useRef(null)
  const [trackingStatus, setTrackingStatus] = useState('waiting') // 'live' | 'stale' | 'dead' | 'waiting'
  const [summaryNow, setSummaryNow] = useState(Date.now())

  const routeLatLngs = useMemo(() => kmlTrackPath.map(point => [point.lat, point.lng]), [kmlTrackPath])
  const sortedHistory = useMemo(() => sortHistory(history), [history])
  const raceProgress = useMemo(() => {
    const points = sortedHistory.filter((p) => p?.location?.lat != null && p?.location?.lng != null)
    if (points.length < 2) return { started: false, startTimeMs: null, progressKm: 0, splitTimes: {} }

    const startTimeMs = getPointReceivedTimeMs(points[0])
    let cumKm = 0
    let nextIdx = 0
    const out = {}
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const segKm = haversineKm({ lat: prev.location.lat, lng: prev.location.lng }, { lat: curr.location.lat, lng: curr.location.lng })
      // Skip GPS spikes (impossible jumps)
      if (segKm > 1) continue
      cumKm += segKm
      while (nextIdx < SPLIT_MARKERS_KM.length && cumKm >= SPLIT_MARKERS_KM[nextIdx]) {
        out[SPLIT_MARKERS_KM[nextIdx]] = getPointReceivedTimeMs(curr)
        nextIdx += 1
      }
    }
    return {
      started: true,
      startTimeMs,
      progressKm: Math.min(MARATHON_DISTANCE_KM, cumKm),
      splitTimes: out,
    }
  }, [sortedHistory])
  const splitTimes = raceProgress.splitTimes
  const lastReceivedAt = useMemo(() => getLatestReceivedAt(data, sortedHistory), [data, sortedHistory])
  const lastReceivedAgeSeconds = lastReceivedAt
    ? Math.max(0, Math.floor((now - lastReceivedAt.getTime()) / 1000))
    : null
  const progressKm = raceProgress.progressKm
  const progressPct = Math.max(0, Math.min(100, (progressKm / MARATHON_DISTANCE_KM) * 100))

  // ---- Elevation profile from KML ----
  const elevProfile = useMemo(() => {
    const profile = buildElevationProfile(kmlTrackPath)
    if (!profile) return null
    return {
      pts: kmlTrackPath.map((pt, idx) => ({ ...pt, distanceKm: profile.points[idx]?.distanceKm ?? 0 })),
      totalKm: profile.totalDistanceKm,
      minE: profile.minElevation,
      maxE: profile.maxElevation,
      gain: profile.elevationGain,
      loss: profile.elevationLoss,
      elevRange: Math.max(1, profile.maxElevation - profile.minElevation),
    }
  }, [kmlTrackPath])

  // ---- KML course path ----
  const loadKmlFromText = useCallback((kmlText, sourceName) => {
    const parsed = parseKmlRoute(kmlText)
    if (parsed.length < 2) throw new Error('KML must contain a LineString with at least 2 coordinates.')
    setKmlTrackPath(parsed)
    setKmlSourceName(sourceName)
    setKmlError(null)
    setElevHoverIdx(null)
  }, [])

  useEffect(() => {
    let isMounted = true
    trackLiveTrackerView()

    fetch(KML_ROUTE_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((kmlText) => {
        if (!isMounted) return
        loadKmlFromText(kmlText, 'queenstown-marathon.kml')
      })
      .catch((err) => {
        console.warn('Could not load Queenstown Marathon KML route', err)
        if (isMounted) setKmlError('Could not load default KML route.')
      })

    return () => {
      isMounted = false
    }
  }, [loadKmlFromText])

  // Keep relative received times honest while the page is open (1s cadence).
  const [nicoleImgLoaded, setNicoleImgLoaded] = useState(false)

  useEffect(() => {
    const img = new Image()
    img.src = '/images/lores/portrait-smile-square.jpg'
    img.onload = () => { nicoleElevImgRef.current = img; setNicoleImgLoaded(true) }
  }, [])

  useEffect(() => {
    const tick = () => {
      setNow(Date.now())
    }
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  // Tracking status is based on how old the last received location is.
  useEffect(() => {
    if (apiStatus === 'waiting' || !lastReceivedAt) {
      setTrackingStatus('waiting')
      return
    }
    if (lastReceivedAgeSeconds > 1800) {
      setTrackingStatus('dead') // 30+ minutes
    } else if (lastReceivedAgeSeconds > 600) {
      setTrackingStatus('stale') // 10+ minutes
    } else {
      setTrackingStatus('live')
    }
  }, [apiStatus, lastReceivedAt, lastReceivedAgeSeconds])

  // Track status changes for analytics
  useEffect(() => {
    if (trackingStatus === 'stale' || trackingStatus === 'dead') {
      trackTrackerDataStatus(trackingStatus, lastReceivedAgeSeconds)
    }
  }, [trackingStatus])

  useEffect(() => {
    const interval = setInterval(() => setSummaryNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  const recent1kmSummary = useMemo(() => {
    summaryNow
    const all = [...sortedHistory]
    if (data?.location?.lat != null && data?.location?.lng != null) all.push(data)
    const pts = all
      .map((p) => {
        const lat = p?.location?.lat
        const lng = p?.location?.lng
        // Use device altitude; fall back to nearest KML elevation if unavailable
        const altitudeM = p?.location?.altitudeM != null
          ? p.location.altitudeM
          : (Number.isFinite(lat) && Number.isFinite(lng) ? nearestKmlElevation(lat, lng, kmlTrackPath) : null)
        return { lat, lng, altitudeM, timeMs: getPointReceivedTimeMs(p) }
      })
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.timeMs != null)
      .sort((a, b) => a.timeMs - b.timeMs)

    if (pts.length < 2) return null
    const kept = [pts[pts.length - 1]]
    let coveredKm = 0
    for (let i = pts.length - 2; i >= 0; i--) {
      const seg = haversineKm(pts[i], pts[i + 1])
      coveredKm += seg
      kept.unshift(pts[i])
      if (coveredKm >= 1.0) break
    }
    if (kept.length < 2) return null
    const first = kept[0]
    const last = kept[kept.length - 1]
    const durationSec = Math.max(1, (last.timeMs - first.timeMs) / 1000)
    let climbM = 0
    let descentM = 0
    for (let i = 1; i < kept.length; i++) {
      const a = kept[i - 1].altitudeM
      const b = kept[i].altitudeM
      if (Number.isFinite(a) && Number.isFinite(b)) {
        const delta = b - a
        if (delta > 0) climbM += delta
        else descentM += Math.abs(delta)
      }
    }
    const netElevationM = Number.isFinite(first.altitudeM) && Number.isFinite(last.altitudeM)
      ? last.altitudeM - first.altitudeM
      : null

    return {
      distanceM: coveredKm * 1000,
      avgSpeedKmh: (coveredKm / durationSec) * 3600,
      climbM,
      descentM,
      totalChangeM: climbM + descentM,
      netElevationM,
    }
  }, [sortedHistory, data, summaryNow, kmlTrackPath])

  // ---- Data fetching (pull every 10s, detect new vs stale vs dead) ----
  const fetchData = useCallback(async ({ force = false, fullResync = false } = {}) => {
    if (fetchInFlightRef.current && !force) return
    if (force && fetchControllerRef.current) {
      fetchControllerRef.current.supersededByForce = true
      fetchControllerRef.current.abort()
    }

    const controller = new AbortController()
    const startedAt = Date.now()
    fetchControllerRef.current = controller
    fetchInFlightRef.current = true
    setIsRefreshing(true)

    // 30s, not 12s. A first load on a weak connection is a large payload and
    // aborting it early meant the tracker silently never updated at all.
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    try {
      const cacheBust = `${Date.now()}-${Math.random().toString(36).slice(2)}`

      // Ask only for what we do not already hold. `fullResync` forces a
      // complete refetch (first load, or after we detect we are missing points).
      const since = fullResync ? 0 : syncTokenRef.current
      const sinceParam = since > 0 ? `&since=${since}` : ''

      const res = await fetch(`${API_ENDPOINT}?_=${cacheBust}${sinceParam}`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const payload = await res.json()
      const latest = payload?.latest && typeof payload.latest === 'object' ? payload.latest : null
      const incomingHistory = Array.isArray(payload?.history) ? payload.history : []
      const isDelta = payload?.delta === true

      // Merge deltas into what we have; a full response replaces outright.
      const normalizedHistory = isDelta
        ? mergeHistory(historyRef.current, incomingHistory)
        : sortHistory(incomingHistory)

      historyRef.current = normalizedHistory

      // Advance the watermark so the next poll starts from here.
      if (Number.isFinite(payload?.syncToken) && payload.syncToken > 0) {
        syncTokenRef.current = payload.syncToken
      }

      // If the server holds more points than we do, we have drifted out of
      // sync (a dropped response, a cache edge). Resync fully on the next tick.
      const serverTotal = payload?.stats?.historyPoints
      serverTotalRef.current = Number.isFinite(serverTotal) ? serverTotal : null
      if (
        isDelta &&
        Number.isFinite(serverTotal) &&
        normalizedHistory.length < serverTotal
      ) {
        needsResyncRef.current = true
      }

      // Freshest by GPS TIME, not by arrival. During a backlog replay the
      // last-arrived point is usually the OLDEST position in the queue.
      const freshestHistoryPoint = [...normalizedHistory]
        .filter((p) => p?.location?.lat != null && p?.location?.lng != null)
        .sort((a, b) => (getPointReceivedTimeMs(b) ?? 0) - (getPointReceivedTimeMs(a) ?? 0))[0] ?? null

      const normalizedData = (() => {
        if (!latest) return freshestHistoryPoint
        if (!freshestHistoryPoint) return latest
        const latestTs = getPointReceivedTimeMs(latest) ?? 0
        const historyTs = getPointReceivedTimeMs(freshestHistoryPoint) ?? 0
        // Strictly greater: ties keep `latest`, which the ingest worker already
        // guarantees never moves backwards.
        return historyTs > latestTs ? freshestHistoryPoint : latest
      })()

      // Detect a draining offline queue so the UI can say "catching up" instead
      // of showing a frozen marker that claims to be live.
      const nowMs = Date.now()
      const backlogPoints = normalizedHistory.filter((p) => isBackloggedPoint(p))
      const recentlyArrivedBacklog = backlogPoints.filter((p) => {
        const arrival = getPointArrivalTimeMs(p)
        return arrival != null && (nowMs - arrival) < 90000
      })
      setBacklogCount(recentlyArrivedBacklog.length)

      if (payload?.status === 'waiting' || !normalizedData) {
        setData(null)
        setHistory([])
        setBacklogCount(0)
        historyRef.current = []
        syncTokenRef.current = 0
        setApiStatus('waiting')
        setTrackingStatus('waiting')
        setError(null)
        setNow(Date.now())
        return
      }

      // Keep last timestamp reference for debugging/consistency checks.
      const incomingGpsTimestamp = normalizedData?.gpsTimestamp || normalizedData?.time || null
      if (incomingGpsTimestamp) lastGpsTimestampRef.current = incomingGpsTimestamp

      setData(normalizedData)
      setHistory(normalizedHistory)
      setApiStatus('live')
      setError(null)
      setNow(Date.now())
    } catch (err) {
      if (err.name === 'AbortError') {
        // Previously swallowed. On a slow connection every fetch timed out and
        // the page just stopped updating with no explanation -- which reads as
        // "the runner stopped" rather than "your connection is struggling".
        if (!controller.supersededByForce) {
          setError('Slow connection - still trying')
        }
      } else {
        setError(err.message)
        setApiStatus((prev) => prev === 'loading' ? 'error' : prev)
      }
    } finally {
      clearTimeout(timeoutId)
      const isCurrentRequest = fetchControllerRef.current === controller

      if (isCurrentRequest) {
        fetchControllerRef.current = null
        fetchInFlightRef.current = false

        if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
        const remaining = Math.max(250, 650 - (Date.now() - startedAt))
        refreshTimeoutRef.current = setTimeout(() => {
          setIsRefreshing(false)
        }, remaining)
      }
    }
  }, [])

  useEffect(() => {
    fetchData({ force: true, fullResync: true })
    let cancelled = false
    let timeoutId = null

    const scheduleNextPoll = () => {
      if (cancelled) return
      timeoutId = setTimeout(async () => {
        const resync = needsResyncRef.current
        needsResyncRef.current = false
        await fetchData({ fullResync: resync })
        scheduleNextPoll()
      }, POLL_INTERVAL)
    }
    scheduleNextPoll()

    const recover = () => {
      setNow(Date.now())
      if (document.visibilityState !== 'hidden') {
        fetchData({ force: true })
        if (mapRef.current) setTimeout(() => mapRef.current.invalidateSize(), 150)
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') recover()
    }

    window.addEventListener('focus', recover)
    window.addEventListener('online', recover)
    window.addEventListener('pageshow', recover)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
      window.removeEventListener('focus', recover)
      window.removeEventListener('online', recover)
      window.removeEventListener('pageshow', recover)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (fetchControllerRef.current) fetchControllerRef.current.abort()
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
    }
  }, [fetchData])

  // ---- Load Leaflet from CDN (guard against duplicate injection) ----
  useEffect(() => {
    if (!document.querySelector('link[href*="leaflet@1.9"]')) {
      const css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(css)
    }

    if (!document.querySelector('script[src*="leaflet@1.9"]')) {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      document.head.appendChild(script)
    }
  }, [])

  // ---- Initialize map ----
  useEffect(() => {
    if (!mapContainerRef.current) return

    const container = mapContainerRef.current
    let map = null
    let cancelled = false
    let interval = null
    let timeout = null

    const tryInit = () => {
      if (cancelled) return true
      if (!window.L) return false
      // Prevent double-init on same DOM node
      if (container._leaflet_id) return true
      const L = window.L

      map = L.map(container, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
        dragging: !L.Browser.mobile,
        tap: false,
        touchZoom: true,
      })

      // ── Scroll/touch guard overlays ──
      // Desktop: show "Use Ctrl + scroll to zoom" on wheel
      // Mobile: show "Use two fingers to move the map" on single-finger drag
      const guardOverlay = document.createElement('div')
      guardOverlay.className = 'map-scroll-guard'
      guardOverlay.style.cssText = 'position:absolute;inset:0;z-index:1100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.55);opacity:0;pointer-events:none;transition:opacity 0.25s;'
      const guardMsg = document.createElement('span')
      guardMsg.style.cssText = 'color:#F5F3EC;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:1px;padding:10px 20px;background:rgba(0,0,0,0.7);border:1px solid #A88E5D;'
      guardOverlay.appendChild(guardMsg)
      container.style.position = 'relative'
      container.appendChild(guardOverlay)

      let guardTimer = null
      const showGuard = (msg) => {
        guardMsg.textContent = msg
        guardOverlay.style.opacity = '1'
        clearTimeout(guardTimer)
        guardTimer = setTimeout(() => { guardOverlay.style.opacity = '0' }, 1600)
      }

      // Desktop: intercept wheel events, only zoom if Ctrl held
      container.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          map.scrollWheelZoom.enable()
          // One-shot: disable again after a pause
          clearTimeout(container._wheelResetTimer)
          container._wheelResetTimer = setTimeout(() => map.scrollWheelZoom.disable(), 400)
          // Forward the zoom manually
          const delta = e.deltaY > 0 ? -1 : 1
          map.setZoom(map.getZoom() + delta, { animate: true })
        } else {
          showGuard('Use Ctrl + scroll to zoom the map')
        }
      }, { passive: false })

      // Mobile: detect single-finger touch and show hint
      if (L.Browser.mobile) {
        let touchCount = 0
        container.addEventListener('touchstart', (e) => {
          touchCount = e.touches.length
          if (touchCount >= 2) {
            map.dragging.enable()
          }
        }, { passive: true })
        container.addEventListener('touchmove', (e) => {
          if (touchCount < 2) {
            showGuard('Use two fingers to move the map')
          }
        }, { passive: true })
        container.addEventListener('touchend', () => {
          touchCount = 0
          map.dragging.disable()
        }, { passive: true })
      }

      const layer = createTileLayer(L, BASEMAP).addTo(map)
      tileLayerRef.current = layer

      routeLayerRef.current = L.layerGroup().addTo(map)
      trailLayerRef.current = L.layerGroup().addTo(map)
      splitLayerRef.current = L.layerGroup().addTo(map)
      spectatorLayerRef.current = L.layerGroup().addTo(map)

      mapRef.current = map
      mapInitializedRef.current = true
      setMapReady(true)

      // Track zoom changes (debounced to avoid spam during pinch-zoom)
      let zoomTimeout = null
      map.on('zoomend', () => {
        clearTimeout(zoomTimeout)
        zoomTimeout = setTimeout(() => {
          trackMapZoomChange(map.getZoom(), 'zoom')
        }, 500)
      })

      setTimeout(() => { if (!cancelled) map.invalidateSize() }, 200)
      setTimeout(() => { if (!cancelled) map.invalidateSize() }, 800)
      return true
    }

    if (!tryInit()) {
      interval = setInterval(() => {
        if (tryInit()) clearInterval(interval)
      }, 150)
      timeout = setTimeout(() => { if (interval) clearInterval(interval) }, 10000)
    }

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
      if (timeout) clearTimeout(timeout)
      if (map) {
        map.remove()
        map = null
      }
      mapRef.current = null
      mapInitializedRef.current = false
      tileLayerRef.current = null
      routeLayerRef.current = null
      trailLayerRef.current = null
      splitLayerRef.current = null
      spectatorLayerRef.current = null
      setMapReady(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Draw KML course path ----
  useEffect(() => {
    if (!mapRef.current || !routeLayerRef.current || !window.L) return
    if (routeLatLngs.length < 2) return

    const L = window.L
    const map = mapRef.current
    routeLayerRef.current.clearLayers()

    L.polyline(routeLatLngs, {
      color: SITE_COLORS.gold,
      weight: 10,
      opacity: 0.16,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: false,
    }).addTo(routeLayerRef.current)

    const coursePath = L.polyline(routeLatLngs, {
      color: SITE_COLORS.gold,
      weight: 4,
      opacity: 0.92,
      lineCap: 'round',
      lineJoin: 'round',
      className: 'marathon-course-line',
    }).addTo(routeLayerRef.current)

    if (showMarkers) {
      const startPoint = routeLatLngs[0]
      const endPoint = routeLatLngs[routeLatLngs.length - 1]
      L.marker(startPoint, {
        icon: createCourseMarkerIcon(L, 'S', 'start'),
        zIndexOffset: 700,
      }).bindTooltip('Start', { direction: 'top', offset: [0, -14], className: 'course-tooltip' }).addTo(routeLayerRef.current)

      L.marker(endPoint, {
        icon: createCourseMarkerIcon(L, 'F', 'finish'),
        zIndexOffset: 700,
      }).bindTooltip('Finish', { direction: 'top', offset: [0, -14], className: 'course-tooltip' }).addTo(routeLayerRef.current)
    }

    if (!data?.location && sortedHistory.length < 2) {
      map.fitBounds(coursePath.getBounds(), { padding: [36, 36], maxZoom: 13 })
    }
  }, [mapReady, routeLatLngs, showMarkers, data?.location, sortedHistory.length])

  useEffect(() => {
    if (!mapReady || !window.L || !splitLayerRef.current || !routeLatLngs.length) return
    const L = window.L
    splitLayerRef.current.clearLayers()
    if (!showMarkers) return
    const routePts = kmlTrackPath
    if (routePts.length < 2) return
    const sessionStart = raceProgress.startTimeMs
    let cumKm = 0
    let nextIdx = 0
    let prevSplitKm = 0
    let prevSplitTime = sessionStart
    for (let i = 1; i < routePts.length && nextIdx < SPLIT_MARKERS_KM.length; i++) {
      const a = routePts[i - 1]
      const b = routePts[i]
      cumKm += haversineKm(a, b)
      while (nextIdx < SPLIT_MARKERS_KM.length && cumKm >= SPLIT_MARKERS_KM[nextIdx]) {
        const splitKm = SPLIT_MARKERS_KM[nextIdx]
        const label = splitKm === 21.1 ? 'Half' : `${splitKm}`
        const shortLabel = splitKm === 21.1 ? 'Half' : `${splitKm}`
        const t = splitTimes[splitKm]

        // Build popup content with elapsed time and pace
        let popupHtml = `<div style="font-family:Montserrat,sans-serif;font-size:12px;line-height:1.7;min-width:170px">`
        popupHtml += `<strong style="color:#A88E5D;font-size:14px">${label} km</strong><br/>`
        if (t) {
          const clockTime = new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          popupHtml += `Reached: ${clockTime}<br/>`
          if (sessionStart) {
            const elapsedMs = t - sessionStart
            const elapsedMin = Math.floor(elapsedMs / 60000)
            const elapsedH = Math.floor(elapsedMin / 60)
            const elapsedM = elapsedMin % 60
            const elapsedS = Math.floor((elapsedMs % 60000) / 1000)
            const elapsed = elapsedH > 0
              ? `${elapsedH}h ${String(elapsedM).padStart(2, '0')}m ${String(elapsedS).padStart(2, '0')}s`
              : `${elapsedM}m ${String(elapsedS).padStart(2, '0')}s`
            popupHtml += `Elapsed: ${elapsed}<br/>`

            // Average pace & speed for this split segment
            const segKm = splitKm - prevSplitKm
            const segMs = prevSplitTime ? t - prevSplitTime : null
            if (segMs && segMs > 0 && segKm > 0) {
              const segHours = segMs / 3600000
              const avgSpeedKmh = segKm / segHours
              const minPerKm = 60 / avgSpeedKmh
              const paceMin = Math.floor(minPerKm)
              const paceSec = Math.round((minPerKm - paceMin) * 60)
              popupHtml += `<span style="color:#A88E5D">Avg pace: ${paceMin}:${String(paceSec >= 60 ? 0 : paceSec).padStart(2, '0')} /km</span><br/>`
              popupHtml += `<span style="color:#A88E5D">Avg speed: ${avgSpeedKmh.toFixed(1)} km/h</span>`
            }
          }
          prevSplitKm = splitKm
          prevSplitTime = t
        } else {
          popupHtml += `<span style="opacity:0.5">Pending</span>`
        }
        popupHtml += `</div>`

        const marker = L.marker([b.lat, b.lng], {
          icon: createCourseMarkerIcon(L, shortLabel, 'split'),
          zIndexOffset: 650,
        })
        marker.bindPopup(popupHtml, { className: 'tracker-popup', closeButton: false, autoPan: false })
        marker.on('click', () => trackSplitMarkerClick(splitKm, !!t))
        marker.bindTooltip(
          t ? `${shortLabel} km · tap for details` : `${shortLabel} km · pending`,
          { direction: 'top', offset: [0, -14], className: 'course-tooltip' }
        )
        marker.addTo(splitLayerRef.current)
        nextIdx += 1
      }
    }
  }, [mapReady, kmlTrackPath, splitTimes, raceProgress.startTimeMs, showMarkers])

  useEffect(() => {
    if (!mapReady || !window.L || !spectatorLayerRef.current) return
    const L = window.L
    spectatorLayerRef.current.clearLayers()
    if (!showMarkers) return
    SPECTATOR_ZONES.forEach((zone) => {
      L.marker([zone.lat, zone.lng], {
        icon: createCourseMarkerIcon(L, '👥', 'split'),
        zIndexOffset: 620,
      }).bindTooltip(zone.label, { direction: 'top', offset: [0, -14], className: 'course-tooltip' })
        .addTo(spectatorLayerRef.current)
    })
  }, [mapReady, showMarkers])

  // ---- Update marker + trail when data changes ----
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.L) return
    const L = window.L
    const map = mapRef.current

    // Add / update Nicole marker
    if (data?.location) {
      const { lat, lng } = data.location

      if (!markerRef.current) {
        const markerIcon = L.divIcon({
          className: 'nicole-marker-container',
          html: `
            <div class="nicole-marker">
              <div class="nicole-marker-pulse"></div>
              <div class="nicole-marker-pin">
                <img class="nicole-marker-img" src="/images/lores/portrait-smile-square.jpg" alt="Nicole" />
              </div>
              <div class="nicole-marker-shadow"></div>
            </div>
          `,
          iconSize: [52, 68],
          iconAnchor: [26, 62],
        })
        markerRef.current = L.marker([lat, lng], { icon: markerIcon, zIndexOffset: 1000 }).addTo(map)
      } else {
        markerRef.current.setLatLng([lat, lng])
      }

      // Only pan to Nicole's position on the very first data load
      if (!hasInitialPanRef.current) {
        map.setView([lat, lng], Math.max(map.getZoom(), 14), { animate: true })
        hasInitialPanRef.current = true
      }
    }

    // Build live trail from fresh worker history.
    if (trailLayerRef.current) {
      trailLayerRef.current.clearLayers()

      const points = sortedHistory.filter(p => p.location?.lat && p.location?.lng)
      if (points.length < 2) return

      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]
        const curr = points[i]

        // Client-side speed: haversine distance / time between points
        const prevTime = getPointReceivedTimeMs(prev)
        const currTime = getPointReceivedTimeMs(curr)
        let segKmh = null
        let segKm = 0
        if (prevTime && currTime) {
          const seconds = (currTime - prevTime) / 1000
          if (seconds > 0.5 && seconds <= 300) {
            segKm = haversineKm(
              { lat: prev.location.lat, lng: prev.location.lng },
              { lat: curr.location.lat, lng: curr.location.lng }
            )
            segKmh = (segKm / seconds) * 3600
            if (segKmh > 35) segKmh = null // GPS spike
          }
        }
        // Fall back to worker-reported speed
        const kmh = segKmh ?? getSpeedKmh(curr)

        // Thicker + more opaque for faster speeds - makes speed immediately readable on the map
        const segWeight = kmh == null || kmh < 2 ? 2.5
          : kmh < 5 ? 3
          : kmh < 8 ? 4
          : kmh < 11 ? 5
          : 6
        const segOpacity = kmh == null || kmh < 2 ? 0.55
          : kmh < 5 ? 0.65
          : 0.9

        const segment = L.polyline(
          [
            [prev.location.lat, prev.location.lng],
            [curr.location.lat, curr.location.lng],
          ],
          {
            color: speedColor(kmh),
            weight: segWeight,
            opacity: segOpacity,
            lineCap: 'round',
            lineJoin: 'round',
          }
        )

        const label = speedLabel(kmh)
        const paceStr = formatMinPerKm(kmh)
        const pointTime = getPointReceivedTimeMs(curr)
        const time = pointTime
          ? new Date(pointTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : ''
        segment.bindPopup(
          `<div style="font-family:Montserrat,sans-serif;font-size:12px;line-height:1.5;min-width:140px">
            <strong style="color:${SITE_COLORS.gold}">${label}</strong><br/>
            ${kmh != null ? `${Number(kmh).toFixed(1)} km/h` : 'No speed'}
            ${paceStr ? ` · ${paceStr} /km` : ''}
            ${segKm > 0 ? `<br/><span style="opacity:0.5">${(segKm * 1000).toFixed(1)} m segment</span>` : ''}<br/>
            <span style="opacity:0.6">${time}</span>
          </div>`,
          { className: 'tracker-popup' }
        )

        segment.addTo(trailLayerRef.current)
      }

      // Add current position to the trail end
      if (data?.location && points.length > 0) {
        const last = points[points.length - 1]
        L.polyline(
          [
            [last.location.lat, last.location.lng],
            [data.location.lat, data.location.lng],
          ],
          {
            color: speedColor(displayKmh),
            weight: 3.5,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          }
        ).addTo(trailLayerRef.current)
      }
    }
  }, [mapReady, data, sortedHistory])

  // ---- Recenter ----
  const handleRecenter = () => {
    if (!mapRef.current) return
    trackLiveTrackerMapInteraction('recenter')
    fetchData({ force: true })
    if (data?.location) {
      mapRef.current.flyTo([data.location.lat, data.location.lng], 15, { duration: 1.2 })
    } else {
      mapRef.current.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1.2 })
    }
  }

  // ---- Fit trail bounds ----
  const handleFitTrail = () => {
    if (!mapRef.current || !window.L) return
    trackLiveTrackerMapInteraction('fit_trail')
    const historyPoints = sortedHistory.filter(p => p.location?.lat && p.location?.lng)
    const routePoints = routeLatLngs.length > 1
      ? routeLatLngs
      : historyPoints.map(p => [p.location.lat, p.location.lng])

    if (routePoints.length < 2) return

    const bounds = window.L.latLngBounds(routePoints)
    historyPoints.forEach(p => bounds.extend([p.location.lat, p.location.lng]))
    if (data?.location) bounds.extend([data.location.lat, data.location.lng])
    mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, duration: 1 })
  }

  const handleCenterOnMe = () => {
    if (!navigator.geolocation || !mapRef.current || !window.L) return
    trackLiveTrackerMapInteraction('center_on_me')
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude, accuracy } = pos.coords
      const L = window.L
      const map = mapRef.current
      if (!userLocationRef.current.marker) {
        userLocationRef.current.marker = L.circleMarker([latitude, longitude], {
          radius: 6, color: '#66A3FF', fillColor: '#66A3FF', fillOpacity: 1, weight: 2,
        }).addTo(map)
      } else userLocationRef.current.marker.setLatLng([latitude, longitude])
      if (!userLocationRef.current.accuracy) {
        userLocationRef.current.accuracy = L.circle([latitude, longitude], {
          radius: accuracy || 25, color: '#66A3FF', fillColor: '#66A3FF', fillOpacity: 0.12, weight: 1,
        }).addTo(map)
      } else {
        userLocationRef.current.accuracy.setLatLng([latitude, longitude])
        userLocationRef.current.accuracy.setRadius(accuracy || 25)
      }
      map.flyTo([latitude, longitude], Math.max(map.getZoom(), 14), { duration: 1 })
    })
  }

  // ---- Elevation canvas drawing ----
  const drawElevation = useCallback((activeIdx, nicoleIdx) => {
    const canvas = elevCanvasRef.current
    if (!canvas || !elevProfile) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.parentElement.getBoundingClientRect()
    const w = rect.width, h = rect.height
    canvas.width = w * dpr; canvas.height = h * dpr
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px'
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    const { pts, totalKm, minE, elevRange } = elevProfile
    const padTop = 14, padBot = 20
    const plotH = h - padTop - padBot
    const toX = (km) => (km / totalKm) * w
    const toY = (elev) => padTop + (1 - (elev - minE) / elevRange) * plotH

    // Filled area
    ctx.beginPath()
    ctx.moveTo(0, h - padBot)
    pts.forEach(pt => { if (pt.elevation != null) ctx.lineTo(toX(pt.distanceKm), toY(pt.elevation)) })
    ctx.lineTo(toX(pts[pts.length - 1].distanceKm), h - padBot)
    ctx.closePath()
    const grad = ctx.createLinearGradient(0, padTop, 0, h - padBot)
    grad.addColorStop(0, 'rgba(168,142,93,0.2)')
    grad.addColorStop(1, 'rgba(168,142,93,0.02)')
    ctx.fillStyle = grad
    ctx.fill()

    // Traversed fill (use Nicole's progress index for the shaded portion)
    const fillIdx = nicoleIdx ?? activeIdx
    if (fillIdx != null && fillIdx > 0) {
      ctx.beginPath()
      ctx.moveTo(0, h - padBot)
      for (let i = 0; i <= fillIdx && i < pts.length; i++) {
        if (pts[i].elevation != null) ctx.lineTo(toX(pts[i].distanceKm), toY(pts[i].elevation))
      }
      ctx.lineTo(toX(pts[Math.min(fillIdx, pts.length - 1)].distanceKm), h - padBot)
      ctx.closePath()
      const tGrad = ctx.createLinearGradient(0, padTop, 0, h - padBot)
      tGrad.addColorStop(0, 'rgba(168,142,93,0.4)')
      tGrad.addColorStop(1, 'rgba(168,142,93,0.05)')
      ctx.fillStyle = tGrad
      ctx.fill()
    }

    // Elevation line
    const lerp = (a, b, t) => a + (b - a) * t
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], curr = pts[i]
      if (prev.elevation == null || curr.elevation == null) continue
      const t = (curr.elevation - minE) / elevRange
      const isActive = fillIdx != null && i <= fillIdx
      const r = Math.round(lerp(85, 245, t)), g = Math.round(lerp(120, 220, t)), b2 = Math.round(lerp(100, 140, t))
      ctx.beginPath()
      ctx.moveTo(toX(prev.distanceKm), toY(prev.elevation))
      ctx.lineTo(toX(curr.distanceKm), toY(curr.elevation))
      ctx.lineWidth = isActive ? 2.5 : 1.5
      ctx.strokeStyle = isActive ? `rgb(${r},${g},${b2})` : `rgba(168,142,93,${fillIdx != null ? 0.2 : 0.5})`
      ctx.lineCap = 'round'
      ctx.stroke()
    }

    // Km ticks
    const kmLabels = [0, 5, 10, 15, 20, 25, 30, 35, 40, 42.2]
    kmLabels.forEach(km => {
      if (km > totalKm) return
      const x = toX(km)
      ctx.font = 'bold 7px Montserrat, sans-serif'
      ctx.fillStyle = 'rgba(245,243,236,0.2)'
      ctx.textAlign = 'center'
      ctx.fillText(km === 42.2 ? '42.2' : `${km}`, x, h - padBot + 12)
    })

    // Hover cursor (only when user is actively hovering)
    if (activeIdx != null && pts[activeIdx]?.elevation != null) {
      const pt = pts[activeIdx], x = toX(pt.distanceKm), y = toY(pt.elevation)
      ctx.beginPath(); ctx.moveTo(x, padTop); ctx.lineTo(x, h - padBot)
      ctx.strokeStyle = 'rgba(245,243,236,0.15)'; ctx.lineWidth = 1
      ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([])
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#F5F3EC'; ctx.fill()
      ctx.lineWidth = 2; ctx.strokeStyle = '#A88E5D'; ctx.stroke()
    }

    // Nicole marker on elevation profile
    if (nicoleIdx != null && pts[nicoleIdx]?.elevation != null) {
      const pt = pts[nicoleIdx]
      const nx = toX(pt.distanceKm)
      const ny = toY(pt.elevation)
      const img = nicoleElevImgRef.current
      const pinR = 12

      // Vertical drop-line from Nicole to baseline
      ctx.beginPath()
      ctx.moveTo(nx, ny + pinR + 2)
      ctx.lineTo(nx, h - padBot)
      ctx.strokeStyle = 'rgba(168,142,93,0.35)'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 3])
      ctx.stroke()
      ctx.setLineDash([])

      // Outer glow
      ctx.beginPath()
      ctx.arc(nx, ny, pinR + 4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(168,142,93,0.18)'
      ctx.fill()

      // Gold ring
      ctx.beginPath()
      ctx.arc(nx, ny, pinR + 1, 0, Math.PI * 2)
      ctx.fillStyle = '#A88E5D'
      ctx.fill()

      if (img) {
        // Clip portrait into circle (image is already face-cropped square)
        ctx.save()
        ctx.beginPath()
        ctx.arc(nx, ny, pinR, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(img, nx - pinR, ny - pinR, pinR * 2, pinR * 2)
        ctx.restore()
      } else {
        // Fallback: gold circle with runner icon
        ctx.beginPath()
        ctx.arc(nx, ny, pinR, 0, Math.PI * 2)
        ctx.fillStyle = '#1a1a1a'
        ctx.fill()
        ctx.font = '12px sans-serif'
        ctx.fillStyle = '#A88E5D'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('🏃‍♀️', nx, ny)
      }
    }
  }, [elevProfile])

  // ---- Elevation hover interaction ----
  const elevHoverTrackedRef = useRef(false)
  const handleElevHover = useCallback((e) => {
    if (!elevProfile || !elevWrapRef.current) return
    const rect = elevWrapRef.current.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const progress = Math.max(0, Math.min(1, x / rect.width))
    const targetKm = progress * elevProfile.totalKm
    let closest = 0, closestDiff = Infinity
    for (let i = 0; i < elevProfile.pts.length; i++) {
      const diff = Math.abs(elevProfile.pts[i].distanceKm - targetKm)
      if (diff < closestDiff) { closestDiff = diff; closest = i }
    }
    setElevHoverIdx(closest)

    // Track first hover per session
    if (!elevHoverTrackedRef.current) {
      elevHoverTrackedRef.current = true
      trackElevationProfileInteraction('hover_start', targetKm)
    }

    // Show marker on map
    if (mapRef.current && window.L) {
      const pt = elevProfile.pts[closest]
      if (pt) {
        const L = window.L
        if (!hoverMarkerRef.current) {
          hoverMarkerRef.current = L.circleMarker([pt.lat, pt.lng], {
            radius: 6, color: '#A88E5D', fillColor: '#F5F3EC', fillOpacity: 1, weight: 2, pane: 'markerPane',
          }).addTo(mapRef.current)
        } else {
          hoverMarkerRef.current.setLatLng([pt.lat, pt.lng])
        }
      }
    }
  }, [elevProfile])

  const handleElevLeave = useCallback(() => {
    elevHoverTrackedRef.current = false
    setElevHoverIdx(null)
    if (hoverMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(hoverMarkerRef.current)
      hoverMarkerRef.current = null
    }
  }, [])

  const elevHoverPoint = elevProfile && elevHoverIdx != null ? elevProfile.pts[elevHoverIdx] : null
  const elevProgressIdx = useMemo(() => {
    if (!elevProfile?.pts?.length) return null
    const targetKm = Math.max(0, Math.min(progressKm, elevProfile.totalKm || progressKm))
    let closest = 0
    let closestDiff = Infinity
    for (let i = 0; i < elevProfile.pts.length; i++) {
      const diff = Math.abs(elevProfile.pts[i].distanceKm - targetKm)
      if (diff < closestDiff) { closestDiff = diff; closest = i }
    }
    return closest
  }, [elevProfile, progressKm])

  // ---- Draw elevation on hover change ----
  useEffect(() => { drawElevation(elevHoverIdx, elevProgressIdx) }, [elevHoverIdx, elevProgressIdx, drawElevation, nicoleImgLoaded])

  // ---- Resize redraw ----
  useEffect(() => {
    const onResize = () => drawElevation(elevHoverIdx, elevProgressIdx)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [drawElevation, elevHoverIdx, elevProgressIdx])

  // ---- Derived display values ----
  const isWaiting = apiStatus === 'waiting' && !lastReceivedAt
  const signalClass = trackingStatus === 'dead' ? 'offline'
    : trackingStatus === 'stale' ? 'stale'
    : trackingStatus === 'live' ? ''
    : isWaiting ? 'offline'
    : lastReceivedAgeSeconds == null ? 'offline'
    : ''
  const signalLabel = isWaiting ? 'Waiting'
    : trackingStatus === 'dead' ? 'Tracking Lost'
    : trackingStatus === 'stale' ? 'Signal Stale'
    : trackingStatus === 'live' ? 'Live'
    : lastReceivedAgeSeconds == null ? 'No Signal'
    : 'Live'
  const speed = data?.speed || {}
  const session = data?.session || {}
  const sessionDuration = formatDuration(raceProgress.startTimeMs || session.startedAt, now)

  // Compute speed and pace with full precision from raw data
  // Prefer calculatedKmh (higher precision) over worker-rounded kmh
  const rawKmh = speed.calculatedKmh ?? speed.kmh ?? null
  const rawKmhNum = rawKmh != null ? Number(rawKmh) : null

  // ── Client-side speed computation from history GPS points ──
  const clientSpeed = useMemo(() => {
    const pts = sortedHistory.filter(p => p.location?.lat && p.location?.lng)
    if (pts.length < 2) return { current: null, rolling: null, average: null, fastest: null, totalKm: 0, segments: [] }

    // Build segments with distance and time between consecutive points
    const segments = []
    let totalKm = 0
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1]
      const curr = pts[i]
      const prevTime = getPointReceivedTimeMs(prev)
      const currTime = getPointReceivedTimeMs(curr)
      if (!prevTime || !currTime) continue

      const seconds = (currTime - prevTime) / 1000
      // Skip bad gaps (negative time, >5min gap, or <1s)
      if (seconds <= 0.5 || seconds > 300) continue

      const km = haversineKm(
        { lat: prev.location.lat, lng: prev.location.lng },
        { lat: curr.location.lat, lng: curr.location.lng }
      )
      const kmh = (km / seconds) * 3600
      // Skip GPS spikes
      if (kmh > 35) continue

      totalKm += km
      segments.push({ kmh, km, seconds, time: currTime })
    }

    if (segments.length === 0) return { current: null, rolling: null, average: null, fastest: null, totalKm: 0, segments: [] }

    // Current speed: latest segment
    const current = segments[segments.length - 1].kmh

    // Rolling average: last 30 seconds of segments for smoother reading
    const cutoff = Date.now() - 30000
    const recentSegs = segments.filter(s => s.time >= cutoff)
    let rolling = null
    if (recentSegs.length > 0) {
      const recentKm = recentSegs.reduce((sum, s) => sum + s.km, 0)
      const recentSec = recentSegs.reduce((sum, s) => sum + s.seconds, 0)
      rolling = recentSec > 0 ? (recentKm / recentSec) * 3600 : null
    }

    // Session average: total distance / total moving time
    const movingSegs = segments.filter(s => s.kmh > 1) // ignore stationary
    const movingTimeSec = movingSegs.reduce((sum, s) => sum + s.seconds, 0)
    const movingKm = movingSegs.reduce((sum, s) => sum + s.km, 0)
    const average = movingTimeSec > 0 ? (movingKm / movingTimeSec) * 3600 : null

    // Fastest single-segment speed recorded
    const fastest = segments.reduce((max, s) => s.kmh > max ? s.kmh : max, 0) || null

    return { current, rolling, average, fastest, totalKm, segments }
  }, [sortedHistory])

  // Use client-computed speed (rolling for smoothness), fall back to worker
  const displayKmh = clientSpeed.rolling ?? clientSpeed.current ?? (rawKmhNum != null && Number.isFinite(rawKmhNum) ? rawKmhNum : null)
  const displayPace = formatMinPerKm(displayKmh)
  const avgKmh = clientSpeed.average
  const avgPace = formatMinPerKm(avgKmh)

  const totalDistanceKm = clientSpeed.totalKm > 0 ? clientSpeed.totalKm : null
  // ── Estimated finish time prediction ──
  // Only activates after 1km. Uses observed speed-vs-elevation data and applies
  // a fatigue curve that increases with distance covered. Gets more accurate
  // as the race progresses and more data is available.
  const finishEstimate = useMemo(() => {
    const distDone = progressKm
    if (distDone < 1 || !raceProgress.startTimeMs || !elevProfile) {
      return null
    }

    // Build segments from history with elevation data
    const pts = sortedHistory.filter(p => p.location?.lat && p.location?.lng)
    if (pts.length < 3) return null

    const gradientBuckets = {} // key: rounded gradient%, value: { totalSec, totalKm }
    let cumKm = 0

    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1]
      const curr = pts[i]
      const prevTime = getPointReceivedTimeMs(prev)
      const currTime = getPointReceivedTimeMs(curr)
      if (!prevTime || !currTime) continue

      const seconds = (currTime - prevTime) / 1000
      if (seconds <= 0.5 || seconds > 300) continue

      const km = haversineKm(
        { lat: prev.location.lat, lng: prev.location.lng },
        { lat: curr.location.lat, lng: curr.location.lng }
      )
      const kmh = (km / seconds) * 3600
      if (kmh > 35 || km < 0.001) continue

      cumKm += km

      // Get elevation for this segment
      const prevElev = prev.location?.altitudeM ?? nearestKmlElevation(prev.location.lat, prev.location.lng, kmlTrackPath)
      const currElev = curr.location?.altitudeM ?? nearestKmlElevation(curr.location.lat, curr.location.lng, kmlTrackPath)

      let gradientKey = 0
      if (prevElev != null && currElev != null && km > 0) {
        const gradientPct = ((currElev - prevElev) / (km * 1000)) * 100
        // Bucket into 2% intervals: -10, -8, ..., 0, 2, 4, ...
        gradientKey = Math.round(gradientPct / 2) * 2
        gradientKey = Math.max(-12, Math.min(12, gradientKey))
      }

      const key = String(gradientKey)
      if (!gradientBuckets[key]) gradientBuckets[key] = { totalSec: 0, totalKm: 0 }
      gradientBuckets[key].totalSec += seconds
      gradientBuckets[key].totalKm += km
    }

    // Need at least some data
    const bucketEntries = Object.entries(gradientBuckets)
    if (bucketEntries.length === 0) return null

    // Overall average pace as fallback (sec/km)
    const totalMovingSec = bucketEntries.reduce((s, [, b]) => s + b.totalSec, 0)
    const totalMovingKm = bucketEntries.reduce((s, [, b]) => s + b.totalKm, 0)
    if (totalMovingKm < 0.5 || totalMovingSec < 30) return null
    const avgSecPerKm = totalMovingSec / totalMovingKm

    // Pace per gradient bucket (sec/km)
    const paceByGradient = {}
    for (const [key, bucket] of bucketEntries) {
      if (bucket.totalKm > 0.05) {
        paceByGradient[key] = bucket.totalSec / bucket.totalKm
      }
    }

    // Now predict remaining time using the KML elevation profile
    const remainingKm = MARATHON_DISTANCE_KM - distDone
    if (remainingKm <= 0) return { remainingSec: 0, finishTimeMs: Date.now(), confidence: 'high' }

    // Find where we are on the KML route
    const elevPts = elevProfile.pts
    let startIdx = 0
    let bestDist = Infinity
    for (let i = 0; i < elevPts.length; i++) {
      const d = Math.abs(elevPts[i].distanceKm - distDone)
      if (d < bestDist) { bestDist = d; startIdx = i }
    }

    // Walk through remaining route segments, applying gradient-aware pace
    let predictedSec = 0
    let segKmAccum = 0
    for (let i = startIdx + 1; i < elevPts.length; i++) {
      const prev = elevPts[i - 1]
      const curr = elevPts[i]
      const segKm = curr.distanceKm - prev.distanceKm
      if (segKm <= 0) continue
      segKmAccum += segKm
      if (segKmAccum > remainingKm) break

      // Calculate gradient for this route segment
      let gradientKey = 0
      if (prev.elevation != null && curr.elevation != null && segKm > 0) {
        const gradientPct = ((curr.elevation - prev.elevation) / (segKm * 1000)) * 100
        gradientKey = Math.round(gradientPct / 2) * 2
        gradientKey = Math.max(-12, Math.min(12, gradientKey))
      }

      // Use observed pace for this gradient, or fall back to average
      const basePace = paceByGradient[String(gradientKey)] ?? avgSecPerKm

      // Fatigue factor: runner slows down as the race progresses
      // Starts at 1.0, increases gently. By 30km adds ~8%, by 40km adds ~15%
      const kmAtPoint = distDone + segKmAccum
      const fatiguePct = kmAtPoint / MARATHON_DISTANCE_KM
      const fatigueFactor = 1 + Math.pow(fatiguePct, 2.5) * 0.20

      // Early-race uncertainty: weight toward average pace more when we have less data
      const dataWeight = Math.min(1, distDone / 10) // full confidence at 10km
      const adjustedPace = basePace * dataWeight + avgSecPerKm * (1 - dataWeight)

      predictedSec += adjustedPace * fatigueFactor * segKm
    }

    // If we didn't cover the full remaining distance via KML points, extrapolate
    if (segKmAccum < remainingKm * 0.9) {
      const uncoveredKm = remainingKm - segKmAccum
      const fatigueFactor = 1 + Math.pow(0.85, 2.5) * 0.20
      predictedSec += avgSecPerKm * fatigueFactor * uncoveredKm
    }

    const finishTimeMs = Date.now() + predictedSec * 1000
    const elapsedSec = (Date.now() - raceProgress.startTimeMs) / 1000
    const totalPredictedSec = elapsedSec + predictedSec

    // Confidence based on how far through the race
    let confidence = 'low'
    if (distDone >= 30) confidence = 'high'
    else if (distDone >= 15) confidence = 'medium'
    else if (distDone >= 5) confidence = 'building'

    return {
      remainingSec: Math.round(predictedSec),
      totalPredictedSec: Math.round(totalPredictedSec),
      finishTimeMs: Math.round(finishTimeMs),
      confidence,
    }
  }, [progressKm, raceProgress.startTimeMs, sortedHistory, elevProfile, kmlTrackPath])

  // Format finish estimate for display
  const finishDisplay = useMemo(() => {
    if (!finishEstimate) return null

    const { finishTimeMs, confidence } = finishEstimate

    // Remaining seconds counts down live between GPS updates
    const liveRemainingSec = Math.max(0, Math.round((finishTimeMs - Date.now()) / 1000))
    const liveElapsedSec = raceProgress.startTimeMs ? Math.round((Date.now() - raceProgress.startTimeMs) / 1000) : 0
    const liveTotalSec = liveElapsedSec + liveRemainingSec

    const finishDate = new Date(finishTimeMs)
    const finishTime = finishDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const totalH = Math.floor(liveTotalSec / 3600)
    const totalM = Math.floor((liveTotalSec % 3600) / 60)
    const totalFormatted = `${totalH}h ${totalM}m`

    const remH = Math.floor(liveRemainingSec / 3600)
    const remM = Math.floor((liveRemainingSec % 3600) / 60)
    const remainingFormatted = remH > 0 ? `${remH}h ${remM}m` : `${remM}m`

    const confidenceLabel = {
      low: 'Very early estimate',
      building: 'Building accuracy',
      medium: 'Getting accurate',
      high: 'High confidence',
    }[confidence]

    const confidenceIcon = {
      low: '◔',
      building: '◑',
      medium: '◕',
      high: '●',
    }[confidence]

    return { finishTime, totalFormatted, remainingFormatted, confidenceLabel, confidenceIcon, confidence }
  }, [finishEstimate, summaryNow, raceProgress.startTimeMs])

  const progressSpeedColor = speedColor(displayKmh)

  return (
    <PageTransition>
      <div className="tracker-page">
        {/* Hero */}
        <motion.div
          className="tracker-hero"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="tracker-hero-inner">
            <motion.p
              className="tracker-subtitle"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              Live Marathon Tracker
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              Track Nicole.
            </motion.h1>
          </div>
        </motion.div>
        {/* Live stats */}
        <motion.div
          className="tracker-status-bar"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          <div className="tracker-stat">
            <span className={`live-pulse ${signalClass}`}>
              <span className="dot" />
              {signalLabel}
            </span>
            <span className="tracker-stat-label">
              {lastReceivedAgeSeconds != null ? formatAge(lastReceivedAgeSeconds) : 'Awaiting signal'}
            </span>
          </div>

          <div className="tracker-stat">
            <span className="tracker-stat-value pace">
              {displayPace || '--'}
            </span>
            <span className="tracker-stat-label">Current Pace</span>
          </div>

          <div className="tracker-stat">
            <span className="tracker-stat-value">
              {displayKmh != null ? `${formatSpeedKmh(displayKmh)} km/h` : '--'}
            </span>
            <span className="tracker-stat-label">Current Speed</span>
          </div>

          <div className="tracker-stat">
            <span className="tracker-stat-value pace">
              {avgPace || '--'}
            </span>
            <span className="tracker-stat-label">Avg Pace</span>
          </div>

          <div className="tracker-stat">
            <span className="tracker-stat-value">
              {avgKmh != null ? `${formatSpeedKmh(avgKmh)} km/h` : '--'}
            </span>
            <span className="tracker-stat-label">Avg Speed</span>
          </div>

          <div className="tracker-stat">
            <span className="tracker-stat-value">
              {totalDistanceKm != null ? `${totalDistanceKm.toFixed(2)} km` : '--'}
            </span>
            <span className="tracker-stat-label">Distance</span>
          </div>

          <div className="tracker-stat">
            <span className="tracker-stat-value">
              {finishDisplay
                ? finishDisplay.finishTime
                : progressKm < 1
                  ? '--'
                  : '...'
              }
            </span>
            <span className="tracker-stat-label">Est. Finish</span>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <div className="tracker-disclaimer">
          These times are not official times. Actual times and speeds may differ from those displayed here.
        </div>

        {/* Map - always renders */}
        <motion.div
          className="tracker-map-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.45 }}
        >
          <div
            ref={mapContainerRef}
            className={`tracker-map ${BASEMAP.className}`}
          />

          {/* Refresh indicator */}
          {isRefreshing && (
            <div className="map-refresh-indicator" aria-live="polite">
              <span className="map-refresh-spinner" />
              <span>Refreshing</span>
            </div>
          )}

          {/* Tracking alert */}
          {(trackingStatus === 'stale' || trackingStatus === 'dead') && (
            <div className={`tracking-alert ${trackingStatus === 'dead' ? 'dead' : 'stale'}`}>
              <span className="tracking-alert-icon">{trackingStatus === 'dead' ? '⚠' : '⏳'}</span>
              <span className="tracking-alert-text">
                {trackingStatus === 'dead'
                  ? 'Tracking data may have failed or the race has finished - no location received for over 30 minutes'
                  : 'No new GPS data for over 10 minutes - signal may be weak'
                }
              </span>
            </div>
          )}

          {/* Map controls */}
          <div className="map-controls-right">
            <button className="recenter-btn" onClick={handleRecenter} title="Refresh and recenter on Nicole">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
              </svg>
            </button>
            {(routeLatLngs.length > 1 || sortedHistory.length > 1) && (
              <button className="recenter-btn" onClick={handleFitTrail} title="Fit entire route">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>
            )}
            <button className="recenter-btn" onClick={handleCenterOnMe} title="Centre on me">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v4m0 14v4M1 12h4m14 0h4" />
              </svg>
            </button>
          </div>

          {/* Elevation hover tooltip - stays on map */}
          {elevProfile && (
            <div className="elev-tooltip-overlay" style={{ opacity: elevHoverPoint ? 1 : 0 }}>
              <span className="elev-tooltip-alt">
                {elevHoverPoint?.elevation != null ? `${Math.round(elevHoverPoint.elevation)} m` : ''}
              </span>
              <span className="elev-tooltip-dist">
                {elevHoverPoint ? `${elevHoverPoint.distanceKm.toFixed(1)} km` : ''}
              </span>
            </div>
          )}

          {/* Waiting overlay on map */}
          {isWaiting && (
            <div className="map-waiting-overlay">
              <div className="map-waiting-content">
                <p className="map-waiting-heading">Queenstown, New Zealand</p>
                <p className="map-waiting-sub">Tracking will appear here on race day</p>
              </div>
            </div>
          )}
        </motion.div>

        <div className="map-interaction-hint">
          Use Ctrl + scroll to zoom · Click and drag to pan · Use the buttons on the right to recenter
        </div>

        {/* Elevation profile - own section below map */}
        {elevProfile && (
          <div className="elev-section">
            <div
              ref={elevWrapRef}
              className="elev-canvas-wrap"
              onMouseMove={handleElevHover}
              onTouchMove={handleElevHover}
              onMouseLeave={handleElevLeave}
            >
              <canvas ref={elevCanvasRef} className="elev-canvas" />
            </div>
            <div className="elev-section-footer">
              <div className="elev-legend-inline">
                <span>{Math.round(elevProfile.minE)} m</span>
                <div className="elev-legend-bar" />
                <span>{Math.round(elevProfile.maxE)} m</span>
              </div>
              <div className="elev-progress-text">
                {progressPct.toFixed(1)}% · {progressKm.toFixed(2)} km covered · {(MARATHON_DISTANCE_KM - progressKm).toFixed(2)} km remaining
              </div>
            </div>
          </div>
        )}

        {/* Route options - below elevation */}
        <div className="tracker-controls-bar">
          <label className="route-toggle-bar">
            <input
              type="checkbox"
              checked={showMarkers}
              onChange={(event) => { setShowMarkers(event.target.checked); trackLiveTrackerMapInteraction(event.target.checked ? 'show_markers' : 'hide_markers') }}
            />
            <span>Show markers</span>
          </label>
        </div>
        <div className="tracker-info-strip">
          <div className="tracker-info-card">
            <div className="tracker-info-card-label">Estimated Finish</div>
            <div className="tracker-info-card-value">
              {finishDisplay
                ? `${finishDisplay.finishTime} (${finishDisplay.totalFormatted} total)`
                : progressKm < 1
                  ? 'Kicks in after 1km'
                  : 'Calculating...'
              }
            </div>
            <div className="tracker-info-card-sub">
              {finishDisplay
                ? `${finishDisplay.remainingFormatted} remaining · ${finishDisplay.confidenceIcon} ${finishDisplay.confidenceLabel}`
                : progressKm < 1
                  ? 'Needs pace and elevation data to predict'
                  : 'Awaiting enough GPS data'
              }
            </div>
          </div>

          <div className="tracker-info-card">
            <div className="tracker-info-card-label">Session</div>
            <div className="tracker-info-card-value">{sessionDuration}</div>
            <div className="tracker-info-card-sub">
              {session.pointCount || sortedHistory.length || 0} points received
            </div>
          </div>

          <div className="tracker-info-card">
            <div className="tracker-info-card-label">Speed Detail</div>
            <div className="tracker-info-card-value">
              {displayKmh != null ? `${formatSpeedKmh(displayKmh)} km/h - ${speedLabel(displayKmh)}` : 'No speed data'}
            </div>
            <div className="tracker-info-card-sub">
              {displayPace ? `Current: ${displayPace} /km` : 'Awaiting GPS points'}
              {avgPace ? ` · Avg: ${avgPace} /km` : ''}
              {clientSpeed.segments.length > 0 ? ` · ${clientSpeed.segments.length} segments` : ''}
            </div>
          </div>

          <div className="tracker-info-card">
            <div className="tracker-info-card-label">Last 1km Summary</div>
            <div className="tracker-info-card-value">
              {recent1kmSummary
                ? `${Math.round(recent1kmSummary.distanceM)}m · ${formatMinPerKm(recent1kmSummary.avgSpeedKmh) ?? '--'} /km`
                : "--"}
            </div>
            <div className="tracker-info-card-sub">
              {recent1kmSummary
                ? `Rise +${Math.round(recent1kmSummary.climbM)}m · Fall -${Math.round(recent1kmSummary.descentM)}m · Total ${Math.round(recent1kmSummary.totalChangeM)}m`
                : "Awaiting enough recent points"}
            </div>
          </div>

          <div className="tracker-info-card">
            <div className="tracker-info-card-label">Last Received</div>
            <div className="tracker-info-card-value">
              {lastReceivedAt ? formatDateTime(lastReceivedAt) : 'No location received yet'}
            </div>
            <div className="tracker-info-card-sub">
              Map rechecks whenever the page is opened, focused, or brought back from lock.
            </div>
          </div>
        </div>


        {/* Footer */}
        <div className="tracker-footer-spacer">
          {backlogCount > 0 && (
            <p style={{ color: 'var(--warm)', fontSize: 12, marginTop: 8 }}>
              Catching up - {backlogCount} queued point{backlogCount === 1 ? '' : 's'} received
              after a reception gap. The trail is filling in; the marker stays at the
              most recent confirmed position.
            </p>
          )}
          {error && (
            <p style={{ color: 'var(--warm)', fontSize: 12, marginTop: 8 }}>
              Connection issue: {error} - map remains open and will retry automatically.
            </p>
          )}
        </div>
      </div>
    </PageTransition>
  )
}