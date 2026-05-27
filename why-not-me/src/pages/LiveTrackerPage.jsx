import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import TrailElevationExplorer from '../components/TrailElevationExplorer'
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
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    label: 'Satellite',
    className: 'basemap-satellite',
    maxZoom: 19,
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
  const tileLayersRef = useRef({})
  const currentBasemapRef = useRef(null)
  const markerRef = useRef(null)
  const routeLayerRef = useRef(null)
  const trailLayerRef = useRef(null)
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
  const [now, setNow] = useState(Date.now())

  const routeLatLngs = useMemo(() => kmlTrackPath.map(point => [point.lat, point.lng]), [kmlTrackPath])
  const sortedHistory = useMemo(() => sortHistory(history), [history])
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

    // Hard timeout — if the request hangs, abort after 12 seconds
    const timeoutId = setTimeout(() => controller.abort(), 12000)

    try {
      // Double cache-bust: query param + unique header to defeat CDN/edge/browser caches
      const cacheBust = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const res = await fetch(`${API_BASE}/api/state?history=1&_=${cacheBust}`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
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
      })

      const config = BASEMAPS[basemap]

      // Pre-create all tile layers, show only the active one
      Object.entries(BASEMAPS).forEach(([key, cfg]) => {
        const layer = createTileLayer(L, cfg).addTo(map)
        if (key !== basemap) layer.setOpacity(0)
        tileLayersRef.current[key] = layer
      })
      currentBasemapRef.current = basemap

      routeLayerRef.current = L.layerGroup().addTo(map)
      trailLayerRef.current = L.layerGroup().addTo(map)

      mapRef.current = map
      mapInitializedRef.current = true
      setMapReady(true)

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
      tileLayersRef.current = {}
      currentBasemapRef.current = null
      routeLayerRef.current = null
      trailLayerRef.current = null
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
      map.fitBounds(coursePath.getBounds(), { padding: [36, 36], maxZoom: 13 })
    }
  }, [mapReady, routeLatLngs, showStartEnd, data?.location, sortedHistory.length])

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

      // Pan to Nicole's position on first data load
      map.setView([lat, lng], Math.max(map.getZoom(), 14), { animate: true })
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
        const kmhDisplay = kmh != null ? Number(kmh) : null
        segment.bindPopup(
          `<div style="font-family:Montserrat,sans-serif;font-size:12px;line-height:1.5;min-width:120px">
            <strong style="color:${SITE_COLORS.gold}">${label}</strong><br/>
            ${kmhDisplay != null ? `${kmhDisplay.toFixed(1)} km/h` : 'No speed'}
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
  }, [mapReady, data, sortedHistory])

  // ---- Basemap switch ----
  useEffect(() => {
    if (!mapRef.current || !window.L) return
    if (currentBasemapRef.current === basemap) return

    // Hide all layers, show the selected one
    Object.entries(tileLayersRef.current).forEach(([key, layer]) => {
      layer.setOpacity(key === basemap ? 1 : 0)
    })
    currentBasemapRef.current = basemap

    // Update container class for CSS filter overrides
    const el = mapContainerRef.current
    if (el) {
      Object.values(BASEMAPS).forEach(({ className }) => el.classList.remove(className))
      el.classList.add(BASEMAPS[basemap].className)
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

  // Compute speed and pace with full precision from raw data
  // Prefer calculatedKmh (higher precision) over worker-rounded kmh
  const rawKmh = speed.calculatedKmh ?? speed.kmh ?? null
  const rawKmhNum = rawKmh != null ? Number(rawKmh) : null
  const displayKmh = rawKmhNum != null && Number.isFinite(rawKmhNum) ? rawKmhNum : null
  const displayPace = formatMinPerKm(displayKmh)

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
              {displayPace || '--'}
            </span>
            <span className="tracker-stat-label">Pace</span>
          </div>

          <div className="tracker-stat">
            <span className="tracker-stat-value">
              {displayKmh != null ? `${formatSpeedKmh(displayKmh)} km/h` : '--'}
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
              {displayKmh != null ? `${formatSpeedKmh(displayKmh)} km/h — ${speedLabel(displayKmh)}` : 'No speed data'}
            </div>
            <div className="tracker-info-card-sub">
              {displayPace ? `Pace: ${displayPace} /km` : 'Awaiting speed data'}
              {speed.calculatedKmh != null ? ` · Raw: ${Number(speed.calculatedKmh).toFixed(4)} km/h` : ''}
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

        <TrailElevationExplorer history={sortedHistory} />

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
