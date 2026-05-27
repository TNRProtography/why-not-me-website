import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import './LiveTrackerPage.css'

const API_BASE = 'https://why-not-me-live-tracker.why-not-me-nicole-white.workers.dev'
const POLL_INTERVAL = 8000
const KML_ROUTE_URL = '/data/queenstown-marathon.kml'

// Queenstown Marathon start area — default when no tracker data
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
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    label: 'Satellite',
    className: 'basemap-satellite',
    maxZoom: 19,
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | Map style &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    label: 'Terrain',
    className: 'basemap-terrain',
    maxZoom: 17,
    maxNativeZoom: 17,
  },
}

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

function getPointReceivedTimeMs(point) {
  if (!point) return null

  const candidates = [
    point.receivedAt,
    point.lastReceivedAt,
    point.ingestedAt,
    point.location?.receivedAt,
    point.location?.lastReceivedAt,
    point.ownTracks?.receivedAt,
    point.ownTracks?.tst,
    point.gpsTimestamp,
    point.location?.timestamp,
    point.timestamp,
  ]

  for (const candidate of candidates) {
    const ms = normalizeTimestamp(candidate)
    if (ms != null) return ms
  }

  return null
}

function getLatestReceivedAt(data, history) {
  const times = []

  const pushTime = (value) => {
    const ms = normalizeTimestamp(value)
    if (ms != null) times.push(ms)
  }

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
      const ms = getPointReceivedTimeMs(point)
      if (ms != null) times.push(ms)
    })
  }

  if (!times.length) return null
  return new Date(Math.max(...times))
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
  if (point?.speed?.kmh != null) return point.speed.kmh
  if (point?.speed?.calculatedKmh != null) return point.speed.calculatedKmh
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

function formatMinPerKm(kmh) {
  if (!kmh || kmh <= 0.5) return null
  const minutesPerKm = 60 / kmh
  const minutes = Math.floor(minutesPerKm)
  const seconds = Math.round((minutesPerKm - minutes) * 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
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

function buildRouteSegments(routePoints) {
  if (!Array.isArray(routePoints) || routePoints.length < 2) return []

  const elevations = routePoints
    .map(point => point.elevation)
    .filter(Number.isFinite)
  const minElevation = elevations.length ? Math.min(...elevations) : 0
  const maxElevation = elevations.length ? Math.max(...elevations) : 1
  const elevationRange = Math.max(1, maxElevation - minElevation)

  let distanceKm = 0
  const segments = []

  for (let i = 1; i < routePoints.length; i++) {
    const from = routePoints[i - 1]
    const to = routePoints[i]
    distanceKm += haversineKm(from, to)
    const elevation = Number.isFinite(to.elevation) ? to.elevation : null
    const elevationNorm = elevation == null ? 0.35 : (elevation - minElevation) / elevationRange

    segments.push({
      index: i,
      from,
      to,
      latLngs: [[from.lat, from.lng], [to.lat, to.lng]],
      distanceKm,
      elevation,
      elevationNorm,
    })
  }

  return segments
}

function getNearestRoutePointByDistance(routePoints, distanceKm) {
  if (!Array.isArray(routePoints) || !routePoints.length) return null
  let travelled = 0
  let bestPoint = routePoints[0]
  let bestIndex = 0
  let bestDelta = Math.abs(distanceKm)
  let bestDistanceKm = 0

  for (let i = 1; i < routePoints.length; i++) {
    travelled += haversineKm(routePoints[i - 1], routePoints[i])
    const delta = Math.abs(travelled - distanceKm)
    if (delta < bestDelta) {
      bestDelta = delta
      bestPoint = routePoints[i]
      bestIndex = i
      bestDistanceKm = travelled
    }
  }

  return { ...bestPoint, index: bestIndex, distanceKm: bestDistanceKm }
}


function createTileLayer(L, config) {
  return L.tileLayer(config.url, {
    attribution: config.attribution,
    maxZoom: config.maxZoom || 19,
    maxNativeZoom: config.maxNativeZoom,
    keepBuffer: 3,
    updateWhenIdle: true,
    updateWhenZooming: false,
    subdomains: config.subdomains,
    noWrap: false,
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
  const currentBasemapRef = useRef(null)
  const markerRef = useRef(null)
  const routeLayerRef = useRef(null)
  const trailLayerRef = useRef(null)
  const hoverLayerRef = useRef(null)
  const mapInitializedRef = useRef(false)
  const fetchInFlightRef = useRef(false)
  const fetchControllerRef = useRef(null)
  const refreshTimeoutRef = useRef(null)

  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [kmlTrackPath, setKmlTrackPath] = useState([])
  const [mapReady, setMapReady] = useState(false)
  const [error, setError] = useState(null)
  const [apiStatus, setApiStatus] = useState('loading') // 'loading' | 'live' | 'waiting' | 'error'
  const [basemap, setBasemap] = useState('dark')
  const [showStartEnd, setShowStartEnd] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hoverPoint, setHoverPoint] = useState(null)
  const [now, setNow] = useState(Date.now())

  const routeLatLngs = useMemo(() => kmlTrackPath.map(point => [point.lat, point.lng]), [kmlTrackPath])
  const routeSegments = useMemo(() => buildRouteSegments(kmlTrackPath), [kmlTrackPath])
  const sortedHistory = useMemo(() => sortHistory(history), [history])
  const elevationProfile = useMemo(() => buildElevationProfile(kmlTrackPath), [kmlTrackPath])
  const lastReceivedAt = useMemo(() => getLatestReceivedAt(data, sortedHistory), [data, sortedHistory])
  const lastReceivedAgeSeconds = lastReceivedAt
    ? Math.max(0, Math.floor((now - lastReceivedAt.getTime()) / 1000))
    : null

  // ---- KML course path ----
  useEffect(() => {
    let isMounted = true

    fetch(KML_ROUTE_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((kmlText) => {
        if (isMounted) setKmlTrackPath(parseKmlRoute(kmlText))
      })
      .catch((err) => console.warn('Could not load Queenstown Marathon KML route', err))

    return () => {
      isMounted = false
    }
  }, [])

  // Keep relative received times honest while the page is open.
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const interval = setInterval(tick, 15000)
    return () => clearInterval(interval)
  }, [])

  // ---- Data fetching ----
  const fetchData = useCallback(async ({ force = false } = {}) => {
    if (fetchInFlightRef.current && !force) return
    if (force && fetchControllerRef.current) fetchControllerRef.current.abort()

    const controller = new AbortController()
    const startedAt = Date.now()
    fetchControllerRef.current = controller
    fetchInFlightRef.current = true
    setIsRefreshing(true)

    try {
      const cacheBust = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const res = await fetch(`${API_BASE}/api/state?history=1&limit=2000&_=${cacheBust}`, {
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, max-age=0',
          Pragma: 'no-cache',
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()

      setData(json)
      setHistory(Array.isArray(json.history) ? json.history : [])
      setApiStatus(json.status === 'waiting' ? 'waiting' : 'live')
      setError(null)
      setNow(Date.now())
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message)
        setApiStatus((prev) => prev === 'loading' ? 'error' : prev)
      }
    } finally {
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
    fetchData({ force: true })
    const interval = setInterval(() => fetchData(), POLL_INTERVAL)

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
      clearInterval(interval)
      window.removeEventListener('focus', recover)
      window.removeEventListener('online', recover)
      window.removeEventListener('pageshow', recover)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (fetchControllerRef.current) fetchControllerRef.current.abort()
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
    }
  }, [fetchData])

  // ---- Load Leaflet from CDN ----
  useEffect(() => {
    if (window.L) return

    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    document.head.appendChild(script)
  }, [])

  // ---- Initialize map (always, even without data) ----
  useEffect(() => {
    if (mapInitializedRef.current) return
    if (!mapContainerRef.current) return

    const tryInit = () => {
      if (!window.L) return false
      const L = window.L

      const center = data?.location
        ? [data.location.lat, data.location.lng]
        : DEFAULT_CENTER

      const zoom = data?.location ? 14 : DEFAULT_ZOOM

      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: true,
        attributionControl: true,
      })

      const config = BASEMAPS[basemap]
      tileLayerRef.current = createTileLayer(L, config).addTo(map)
      currentBasemapRef.current = basemap

      routeLayerRef.current = L.layerGroup().addTo(map)
      trailLayerRef.current = L.layerGroup().addTo(map)
      hoverLayerRef.current = L.layerGroup().addTo(map)

      mapRef.current = map
      mapInitializedRef.current = true
      setMapReady(true)

      setTimeout(() => map.invalidateSize(), 200)
      setTimeout(() => map.invalidateSize(), 800)
      return true
    }

    if (!tryInit()) {
      const interval = setInterval(() => {
        if (tryInit()) clearInterval(interval)
      }, 150)
      const timeout = setTimeout(() => clearInterval(interval), 10000)
      return () => { clearInterval(interval); clearTimeout(timeout) }
    }
  }, [data, basemap])

  // ---- Draw KML course path ----
  useEffect(() => {
    if (!mapRef.current || !routeLayerRef.current || !window.L) return
    if (routeLatLngs.length < 2) return

    const L = window.L
    const map = mapRef.current
    routeLayerRef.current.clearLayers()

    L.polyline(routeLatLngs, {
      color: SITE_COLORS.gold,
      weight: 12,
      opacity: 0.12,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: false,
    }).addTo(routeLayerRef.current)

    routeSegments.forEach((segment) => {
      const lineWeight = 3.2 + (segment.elevationNorm * 3.8)
      const segmentOpacity = 0.72 + (segment.elevationNorm * 0.22)

      L.polyline(segment.latLngs, {
        color: segment.elevationNorm > 0.68 ? SITE_COLORS.white : segment.elevationNorm > 0.34 ? SITE_COLORS.warm : SITE_COLORS.gold,
        weight: lineWeight,
        opacity: segmentOpacity,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
        className: 'marathon-course-line',
      }).addTo(routeLayerRef.current)

      L.polyline(segment.latLngs, {
        color: SITE_COLORS.gold,
        weight: 18,
        opacity: 0,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: true,
        bubblingMouseEvents: false,
      })
        .on('mouseover mousemove', () => setHoverPoint({
          lat: segment.to.lat,
          lng: segment.to.lng,
          elevation: segment.elevation,
          distanceKm: segment.distanceKm,
          index: segment.index,
          source: 'map',
        }))
        .on('mouseout', () => setHoverPoint(null))
        .addTo(routeLayerRef.current)
    })

    if (showStartEnd) {
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
      const courseBounds = L.latLngBounds(routeLatLngs)
      map.fitBounds(courseBounds, { padding: [36, 36], maxZoom: 13 })
    }
  }, [mapReady, routeLatLngs, routeSegments, showStartEnd, data?.location, sortedHistory.length])

  // ---- Linked map/elevation hover marker ----
  useEffect(() => {
    if (!mapRef.current || !hoverLayerRef.current || !window.L) return
    const L = window.L
    hoverLayerRef.current.clearLayers()
    if (!hoverPoint) return

    L.circleMarker([hoverPoint.lat, hoverPoint.lng], {
      radius: 7,
      color: SITE_COLORS.white,
      weight: 2,
      fillColor: SITE_COLORS.gold,
      fillOpacity: 0.9,
      className: 'course-hover-marker',
    })
      .bindTooltip(
        `${hoverPoint.distanceKm?.toFixed ? hoverPoint.distanceKm.toFixed(1) : '--'} km${Number.isFinite(hoverPoint.elevation) ? ` · ${Math.round(hoverPoint.elevation)} m` : ''}`,
        { direction: 'top', offset: [0, -10], className: 'course-tooltip', permanent: false }
      )
      .addTo(hoverLayerRef.current)
  }, [hoverPoint])

  // ---- Update marker + trail when data changes ----
  useEffect(() => {
    if (!mapRef.current || !window.L) return
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
                <img class="nicole-marker-img" src="/images/lores/portrait-smile.jpg" alt="Nicole" />
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
    }

    // Build live trail from fresh worker history.
    if (trailLayerRef.current) {
      trailLayerRef.current.clearLayers()

      const points = sortedHistory.filter(p => p.location?.lat && p.location?.lng)
      if (points.length < 2) return

      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]
        const curr = points[i]
        const kmh = getSpeedKmh(curr)

        const segment = L.polyline(
          [
            [prev.location.lat, prev.location.lng],
            [curr.location.lat, curr.location.lng],
          ],
          {
            color: SITE_COLORS.warm,
            weight: 3.5,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          }
        )

        const label = speedLabel(kmh)
        const paceStr = formatMinPerKm(kmh)
        const pointTime = getPointReceivedTimeMs(curr)
        const time = pointTime
          ? new Date(pointTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : ''
        segment.bindPopup(
          `<div style="font-family:Montserrat,sans-serif;font-size:12px;line-height:1.5;min-width:120px">
            <strong style="color:${SITE_COLORS.gold}">${label}</strong><br/>
            ${kmh != null ? `${Number(kmh).toFixed ? Number(kmh).toFixed(1) : kmh} km/h` : 'No speed'}
            ${paceStr ? ` · ${paceStr} /km` : ''}<br/>
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
            color: SITE_COLORS.warm,
            weight: 3.5,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          }
        ).addTo(trailLayerRef.current)
      }
    }
  }, [data, sortedHistory])

  // ---- Basemap switch ----
  useEffect(() => {
    if (!mapRef.current || !window.L) return
    if (currentBasemapRef.current === basemap) return

    const L = window.L
    const map = mapRef.current
    const config = BASEMAPS[basemap]
    const previousLayer = tileLayerRef.current
    const nextLayer = createTileLayer(L, config)

    nextLayer.addTo(map)
    tileLayerRef.current = nextLayer
    currentBasemapRef.current = basemap

    const removePrevious = () => {
      if (previousLayer && map.hasLayer(previousLayer)) map.removeLayer(previousLayer)
    }

    nextLayer.once('load', removePrevious)
    setTimeout(removePrevious, 1800)

    const el = mapContainerRef.current
    if (el) {
      Object.values(BASEMAPS).forEach(({ className }) => el.classList.remove(className))
      el.classList.add(config.className)
    }
  }, [basemap])

  // ---- Recenter ----
  const handleRecenter = () => {
    if (!mapRef.current) return
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

  // ---- Derived display values ----
  const isWaiting = apiStatus === 'waiting' && !lastReceivedAt
  const signalClass = lastReceivedAgeSeconds == null
    ? 'offline'
    : lastReceivedAgeSeconds > 600
      ? 'offline'
      : lastReceivedAgeSeconds > 120
        ? 'stale'
        : ''
  const signalLabel = isWaiting
    ? 'Waiting'
    : lastReceivedAgeSeconds == null
      ? 'No Signal'
      : lastReceivedAgeSeconds > 600
        ? 'Signal Old'
        : lastReceivedAgeSeconds > 120
          ? 'Recent'
          : 'Live'
  const speed = data?.speed || {}
  const session = data?.session || {}
  const sessionDuration = formatDuration(session.startedAt, now)

  // Compute total distance from received history
  const totalDistanceKm = (() => {
    const pts = sortedHistory.filter(p => p.location?.lat && p.location?.lng)
    if (pts.length < 2) return null
    let dist = 0
    for (let i = 1; i < pts.length; i++) {
      dist += haversineKm(
        { lat: pts[i - 1].location.lat, lng: pts[i - 1].location.lng },
        { lat: pts[i].location.lat, lng: pts[i].location.lng }
      )
    }
    return dist
  })()

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
            <span className="tracker-stat-value">
              {lastReceivedAt ? formatClockTime(lastReceivedAt) : '--'}
            </span>
            <span className="tracker-stat-label">Last Received</span>
          </div>

          <div className="tracker-stat">
            <span className="tracker-stat-value pace">
              {speed.minPerKm || '--'}
            </span>
            <span className="tracker-stat-label">Pace</span>
          </div>

          <div className="tracker-stat">
            <span className="tracker-stat-value">
              {speed.kmh != null ? `${speed.kmh} km/h` : '--'}
            </span>
            <span className="tracker-stat-label">Speed</span>
          </div>

          <div className="tracker-stat">
            <span className="tracker-stat-value">
              {totalDistanceKm != null ? `${totalDistanceKm.toFixed(2)} km` : '--'}
            </span>
            <span className="tracker-stat-label">Distance</span>
          </div>
        </motion.div>

        {/* Map — always renders */}
        <motion.div
          className="tracker-map-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.45 }}
        >
          <div
            ref={mapContainerRef}
            className={`tracker-map ${BASEMAPS[basemap].className}`}
          />

          {/* Refresh indicator */}
          {isRefreshing && (
            <div className="map-refresh-indicator" aria-live="polite">
              <span className="map-refresh-spinner" />
              <span>Refreshing</span>
            </div>
          )}

          {/* Basemap toggle */}
          <div className="basemap-toggle">
            {Object.entries(BASEMAPS).map(([key, config]) => (
              <button
                key={key}
                className={`basemap-btn ${basemap === key ? 'active' : ''}`}
                onClick={() => setBasemap(key)}
              >
                {config.label}
              </button>
            ))}
          </div>

          {/* Route options */}
          <label className="route-toggle">
            <input
              type="checkbox"
              checked={showStartEnd}
              onChange={(event) => setShowStartEnd(event.target.checked)}
            />
            <span>Show start &amp; finish</span>
          </label>

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
          </div>

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

        {elevationProfile && (
          <section className="elevation-panel" aria-label="Queenstown Marathon elevation profile">
            <div className="elevation-panel-header">
              <div>
                <p className="elevation-kicker">Queenstown Marathon</p>
                <h2>Elevation profile</h2>
              </div>
              <div className="elevation-stats">
                <span>{elevationProfile.totalDistanceKm.toFixed(1)} km</span>
                <span>{Math.round(elevationProfile.minElevation)}–{Math.round(elevationProfile.maxElevation)} m</span>
                <span>+{Math.round(elevationProfile.elevationGain)} m</span>
              </div>
            </div>

            <div className="elevation-chart-wrap">
              <svg
                className="elevation-chart"
                viewBox={`0 0 ${elevationProfile.width} ${elevationProfile.height}`}
                role="img"
                aria-label={`Elevation profile from ${Math.round(elevationProfile.minElevation)} metres to ${Math.round(elevationProfile.maxElevation)} metres`}
                preserveAspectRatio="none"
                onMouseMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect()
                  const xRatio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
                  const distanceKm = xRatio * elevationProfile.totalDistanceKm
                  const nearest = getNearestRoutePointByDistance(kmlTrackPath, distanceKm)
                  if (nearest) setHoverPoint({ ...nearest, source: 'profile' })
                }}
                onMouseLeave={() => setHoverPoint(null)}
              >
                <polygon className="elevation-area" points={elevationProfile.areaPoints} />
                <polyline className="elevation-line" points={elevationProfile.svgPoints} />
                <line className="elevation-axis" x1="24" y1="158" x2="976" y2="158" />
                {hoverPoint && (
                  <>
                    <line
                      className="elevation-hover-line"
                      x1={24 + (Math.min(elevationProfile.totalDistanceKm, Math.max(0, hoverPoint.distanceKm || 0)) / elevationProfile.totalDistanceKm) * 952}
                      x2={24 + (Math.min(elevationProfile.totalDistanceKm, Math.max(0, hoverPoint.distanceKm || 0)) / elevationProfile.totalDistanceKm) * 952}
                      y1="18"
                      y2="158"
                    />
                    <circle
                      className="elevation-hover-dot"
                      cx={24 + (Math.min(elevationProfile.totalDistanceKm, Math.max(0, hoverPoint.distanceKm || 0)) / elevationProfile.totalDistanceKm) * 952}
                      cy={18 + (1 - ((Number.isFinite(hoverPoint.elevation) ? hoverPoint.elevation : elevationProfile.minElevation) - elevationProfile.minElevation) / Math.max(1, elevationProfile.maxElevation - elevationProfile.minElevation)) * 140}
                      r="6"
                    />
                  </>
                )}
              </svg>
              <div className="elevation-axis-labels">
                <span>Start</span>
                <span>Finish</span>
              </div>
            </div>
          </section>
        )}

        {/* Info cards below map */}
        <div className="tracker-info-strip">
          <div className="tracker-info-card">
            <div className="tracker-info-card-label">Coordinates</div>
            <div className="tracker-info-card-value">
              {data?.location ? `${data.location.lat.toFixed(5)}, ${data.location.lng.toFixed(5)}` : 'Awaiting signal'}
            </div>
            {data?.location?.altitudeM != null && (
              <div className="tracker-info-card-sub">Altitude: {Math.round(data.location.altitudeM)}m</div>
            )}
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
              {speed.friendly || 'No speed data'}
            </div>
            <div className="tracker-info-card-sub">
              {speed.calculatedKmh != null && speed.source === 'owntracks' ? `Calculated: ${speed.calculatedKmh} km/h` : 'Based on latest received point'}
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
          <p style={{ color: 'var(--white-30)', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
            Checks every {POLL_INTERVAL / 1000} seconds · Location requests bypass browser cache
          </p>
          {error && (
            <p style={{ color: 'var(--warm)', fontSize: 12, marginTop: 8 }}>
              Connection issue: {error} — map remains open and will retry automatically.
            </p>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
