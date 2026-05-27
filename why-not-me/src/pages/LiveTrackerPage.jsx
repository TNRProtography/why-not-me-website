import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import './LiveTrackerPage.css'

const API_BASE = 'https://marathon-tracking-proxy.why-not-me-nicole-white.workers.dev'
const API_ENDPOINT = `${API_BASE}/live.json`
const POLL_INTERVAL = 10000
const KML_ROUTE_URL = '/data/queenstown-marathon.kml'

// Queenstown Marathon start area — default when no tracker data
const DEFAULT_CENTER = [-45.0312, 168.6626]
const DEFAULT_ZOOM = 13

const SITE_COLORS = {
  gold: '#A88E5D',
  warm: '#CBB299',
  white: '#F5F3EC',
}

const BASEMAP = {
  url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  className: 'basemap-dark',
  maxZoom: 19,
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

  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [kmlTrackPath, setKmlTrackPath] = useState([])
  const [mapReady, setMapReady] = useState(false)
  const [error, setError] = useState(null)
  const [apiStatus, setApiStatus] = useState('loading') // 'loading' | 'live' | 'waiting' | 'error'
  const [showStartEnd, setShowStartEnd] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [elevHoverIdx, setElevHoverIdx] = useState(null)
  const hasInitialPanRef = useRef(false)
  const lastGpsTimestampRef = useRef(null)
  const lastNewDataTimeRef = useRef(null)
  const [trackingStatus, setTrackingStatus] = useState('waiting') // 'live' | 'stale' | 'dead' | 'waiting'
  const [summaryNow, setSummaryNow] = useState(Date.now())

  const routeLatLngs = useMemo(() => kmlTrackPath.map(point => [point.lat, point.lng]), [kmlTrackPath])
  const sortedHistory = useMemo(() => sortHistory(history), [history])
  const lastReceivedAt = useMemo(() => getLatestReceivedAt(data, sortedHistory), [data, sortedHistory])
  const lastReceivedAgeSeconds = lastReceivedAt
    ? Math.max(0, Math.floor((now - lastReceivedAt.getTime()) / 1000))
    : null

  // ---- Elevation profile from KML ----
  const elevProfile = useMemo(() => {
    if (kmlTrackPath.length < 2) return null
    let dist = 0, minE = Infinity, maxE = -Infinity, gain = 0, loss = 0, prev = null
    const pts = kmlTrackPath.map((pt, i) => {
      if (i > 0) dist += haversineKm(kmlTrackPath[i - 1], pt)
      if (pt.elevation != null) {
        if (prev != null) {
          const d = pt.elevation - prev
          if (d > 0) gain += d; else loss -= d
        }
        minE = Math.min(minE, pt.elevation)
        maxE = Math.max(maxE, pt.elevation)
        prev = pt.elevation
      }
      return { ...pt, distanceKm: dist }
    })
    const elevRange = (maxE - minE) || 1
    return { pts, totalKm: dist, minE, maxE, gain, loss, elevRange }
  }, [kmlTrackPath])

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

  // Keep relative received times and tracking status honest while the page is open.
  useEffect(() => {
    const tick = () => {
      setNow(Date.now())
      // Update tracking status based on time since last new data
      const timeSinceNew = lastNewDataTimeRef.current ? Date.now() - lastNewDataTimeRef.current : null
      if (timeSinceNew != null) {
        if (timeSinceNew > 120000) setTrackingStatus('dead')
        else if (timeSinceNew > 60000) setTrackingStatus('stale')
      }
    }
    const interval = setInterval(tick, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setSummaryNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  const recent500mSummary = useMemo(() => {
    summaryNow
    const all = [...sortedHistory]
    if (data?.location?.lat != null && data?.location?.lng != null) all.push(data)
    const pts = all
      .map((p) => ({
        lat: p?.location?.lat,
        lng: p?.location?.lng,
        altitudeM: p?.location?.altitudeM,
        timeMs: getPointReceivedTimeMs(p),
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.timeMs != null)
      .sort((a, b) => a.timeMs - b.timeMs)

    if (pts.length < 2) return null
    const kept = [pts[pts.length - 1]]
    let coveredKm = 0
    for (let i = pts.length - 2; i >= 0; i--) {
      const seg = haversineKm(pts[i], pts[i + 1])
      coveredKm += seg
      kept.unshift(pts[i])
      if (coveredKm >= 0.5) break
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
      netElevationM,
    }
  }, [sortedHistory, data, summaryNow])

  // ---- Data fetching (pull every 10s, detect new vs stale vs dead) ----
  const fetchData = useCallback(async ({ force = false } = {}) => {
    if (fetchInFlightRef.current && !force) return
    if (force && fetchControllerRef.current) fetchControllerRef.current.abort()

    const controller = new AbortController()
    const startedAt = Date.now()
    fetchControllerRef.current = controller
    fetchInFlightRef.current = true
    setIsRefreshing(true)

    const timeoutId = setTimeout(() => controller.abort(), 12000)

    try {
      const cacheBust = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const res = await fetch(`${API_ENDPOINT}?_=${cacheBust}`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const payload = await res.json()
      const latest = payload?.latest && typeof payload.latest === 'object' ? payload.latest : null
      const normalizedData = latest
      const normalizedHistory = Array.isArray(payload?.history) ? payload.history : []

      if (payload?.status === 'waiting' || !normalizedData) {
        setData(null)
        setHistory([])
        setApiStatus('waiting')
        setTrackingStatus('waiting')
        setError(null)
        setNow(Date.now())
        return
      }

      // Detect whether this is genuinely new GPS data
      const incomingGpsTimestamp = normalizedData?.gpsTimestamp || normalizedData?.time || null
      const previousGpsTimestamp = lastGpsTimestampRef.current

      const isNewData = incomingGpsTimestamp && incomingGpsTimestamp !== previousGpsTimestamp

      if (isNewData) {
        lastGpsTimestampRef.current = incomingGpsTimestamp
        lastNewDataTimeRef.current = Date.now()
        setTrackingStatus('live')
      } else {
        // Same GPS timestamp — phone hasn't sent a new location
        const timeSinceLastNew = lastNewDataTimeRef.current
          ? Date.now() - lastNewDataTimeRef.current
          : null

        if (timeSinceLastNew != null && timeSinceLastNew > 120000) {
          setTrackingStatus('dead') // 2+ minutes: tracking has stopped
        } else if (timeSinceLastNew != null && timeSinceLastNew > 60000) {
          setTrackingStatus('stale') // 1+ minute: something might be wrong
        }
        // else keep current status
      }

      setData(normalizedData)
      setHistory(normalizedHistory)
      setApiStatus('live')
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

      const layer = createTileLayer(L, BASEMAP).addTo(map)
      tileLayerRef.current = layer

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
      tileLayerRef.current = null
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

  // ---- Elevation canvas drawing ----
  const drawElevation = useCallback((activeIdx) => {
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

    // Traversed fill
    if (activeIdx != null && activeIdx > 0) {
      ctx.beginPath()
      ctx.moveTo(0, h - padBot)
      for (let i = 0; i <= activeIdx && i < pts.length; i++) {
        if (pts[i].elevation != null) ctx.lineTo(toX(pts[i].distanceKm), toY(pts[i].elevation))
      }
      ctx.lineTo(toX(pts[Math.min(activeIdx, pts.length - 1)].distanceKm), h - padBot)
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
      const isActive = activeIdx != null && i <= activeIdx
      const r = Math.round(lerp(85, 245, t)), g = Math.round(lerp(120, 220, t)), b2 = Math.round(lerp(100, 140, t))
      ctx.beginPath()
      ctx.moveTo(toX(prev.distanceKm), toY(prev.elevation))
      ctx.lineTo(toX(curr.distanceKm), toY(curr.elevation))
      ctx.lineWidth = isActive ? 2.5 : 1.5
      ctx.strokeStyle = isActive ? `rgb(${r},${g},${b2})` : `rgba(168,142,93,${activeIdx != null ? 0.2 : 0.5})`
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

    // Cursor
    if (activeIdx != null && pts[activeIdx]?.elevation != null) {
      const pt = pts[activeIdx], x = toX(pt.distanceKm), y = toY(pt.elevation)
      ctx.beginPath(); ctx.moveTo(x, padTop); ctx.lineTo(x, h - padBot)
      ctx.strokeStyle = 'rgba(245,243,236,0.15)'; ctx.lineWidth = 1
      ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([])
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#F5F3EC'; ctx.fill()
      ctx.lineWidth = 2; ctx.strokeStyle = '#A88E5D'; ctx.stroke()
    }
  }, [elevProfile])

  // ---- Elevation hover interaction ----
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
    setElevHoverIdx(null)
    if (hoverMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(hoverMarkerRef.current)
      hoverMarkerRef.current = null
    }
  }, [])

  // ---- Draw elevation on hover change ----
  useEffect(() => { drawElevation(elevHoverIdx) }, [elevHoverIdx, drawElevation])

  // ---- Resize redraw ----
  useEffect(() => {
    const onResize = () => drawElevation(elevHoverIdx)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [drawElevation, elevHoverIdx])

  const elevHoverPoint = elevProfile && elevHoverIdx != null ? elevProfile.pts[elevHoverIdx] : null

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
  const sessionDuration = formatDuration(session.startedAt, now)

  // Compute speed and pace with full precision from raw data
  // Prefer calculatedKmh (higher precision) over worker-rounded kmh
  const rawKmh = speed.calculatedKmh ?? speed.kmh ?? null
  const rawKmhNum = rawKmh != null ? Number(rawKmh) : null

  // ── Client-side speed computation from history GPS points ──
  const clientSpeed = useMemo(() => {
    const pts = sortedHistory.filter(p => p.location?.lat && p.location?.lng)
    if (pts.length < 2) return { current: null, rolling: null, average: null, totalKm: 0, segments: [] }

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

    if (segments.length === 0) return { current: null, rolling: null, average: null, totalKm: 0, segments: [] }

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

    return { current, rolling, average, totalKm, segments }
  }, [sortedHistory])

  // Use client-computed speed (rolling for smoothness), fall back to worker
  const displayKmh = clientSpeed.rolling ?? clientSpeed.current ?? (rawKmhNum != null && Number.isFinite(rawKmhNum) ? rawKmhNum : null)
  const displayPace = formatMinPerKm(displayKmh)
  const avgKmh = clientSpeed.average
  const avgPace = formatMinPerKm(avgKmh)

  const totalDistanceKm = clientSpeed.totalKm > 0 ? clientSpeed.totalKm : null

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
                  ? 'Tracking has stopped — no new GPS data received for over 2 minutes'
                  : 'No new GPS data for over 1 minute — signal may be weak'
                }
              </span>
            </div>
          )}

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

          {/* Elevation overlay — bottom of map */}
          {elevProfile && (
            <>
              <div className="elev-tooltip-overlay" style={{ opacity: elevHoverPoint ? 1 : 0 }}>
                <span className="elev-tooltip-alt">
                  {elevHoverPoint?.elevation != null ? `${Math.round(elevHoverPoint.elevation)} m` : ''}
                </span>
                <span className="elev-tooltip-dist">
                  {elevHoverPoint ? `${elevHoverPoint.distanceKm.toFixed(1)} km` : ''}
                </span>
              </div>
              <div className="elev-overlay">
                <div
                  ref={elevWrapRef}
                  className="elev-canvas-wrap"
                  onMouseMove={handleElevHover}
                  onTouchMove={handleElevHover}
                  onMouseLeave={handleElevLeave}
                >
                  <canvas ref={elevCanvasRef} className="elev-canvas" />
                </div>
                <div className="elev-legend-inline">
                  <span>{Math.round(elevProfile.minE)} m</span>
                  <div className="elev-legend-bar" />
                  <span>{Math.round(elevProfile.maxE)} m</span>
                </div>
              </div>
            </>
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
              {displayPace ? `Current: ${displayPace} /km` : 'Awaiting GPS points'}
              {avgPace ? ` · Avg: ${avgPace} /km` : ''}
              {clientSpeed.segments.length > 0 ? ` · ${clientSpeed.segments.length} segments` : ''}
            </div>
          </div>

          <div className="tracker-info-card">
            <div className="tracker-info-card-label">Last 500m Summary</div>
            <div className="tracker-info-card-value">
              {recent500mSummary
                ? `${Math.round(recent500mSummary.distanceM)}m · ${recent500mSummary.avgSpeedKmh.toFixed(1)} km/h`
                : "--"}
            </div>
            <div className="tracker-info-card-sub">
              {recent500mSummary
                ? `Net ${recent500mSummary.netElevationM == null ? "--" : `${recent500mSummary.netElevationM >= 0 ? "+" : ""}${Math.round(recent500mSummary.netElevationM)}m`} · Climb ${Math.round(recent500mSummary.climbM)}m · Descent ${Math.round(recent500mSummary.descentM)}m`
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
