import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import './LiveTrackerPage.css'

const API_BASE = 'https://why-not-me-live-tracker.why-not-me-nicole-white.workers.dev'
const POLL_INTERVAL = 8000
const KML_ROUTE_URL = '/data/queenstown-marathon.kml'

// Queenstown Marathon start area — default when no tracker data
const DEFAULT_CENTER = [-45.0312, 168.6626]
const DEFAULT_ZOOM = 13

const BASEMAPS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    label: 'Dark',
    className: 'basemap-dark',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    label: 'Topo',
    className: 'basemap-topo',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    label: 'Satellite',
    className: 'basemap-satellite',
  },
}

// Speed → colour mapping for the trail
// Stationary/slow = dim gold, walking = warm amber, running = bright gold, fast = white-hot
function speedToColor(kmh) {
  if (kmh == null || kmh <= 0) return 'rgba(168,142,93,0.25)'
  if (kmh <= 2) return 'rgba(168,142,93,0.4)'     // stationary
  if (kmh <= 5) return 'rgba(185,160,110,0.7)'     // walking
  if (kmh <= 8) return 'rgba(203,178,153,0.85)'    // jogging
  if (kmh <= 12) return '#CBB299'                   // running
  if (kmh <= 16) return '#E8D5B8'                   // fast running
  return '#F5F3EC'                                   // sprinting
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

function formatAge(seconds) {
  if (seconds == null) return ''
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`
  return `${Math.round(seconds / 86400)}d ago`
}

function formatDuration(startedAt) {
  if (!startedAt) return '--'
  const ms = Date.now() - new Date(startedAt).getTime()
  if (ms < 0) return '--'
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function getSpeedKmh(point) {
  if (point?.speed?.kmh != null) return point.speed.kmh
  if (point?.speed?.calculatedKmh != null) return point.speed.calculatedKmh
  return null
}

function formatMinPerKm(kmh) {
  if (!kmh || kmh <= 0.5) return null
  const minutesPerKm = 60 / kmh
  const minutes = Math.floor(minutesPerKm)
  const seconds = Math.round((minutesPerKm - minutes) * 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
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
      const [lng, lat] = point.split(',').map(Number)
      return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null
    })
    .filter(Boolean)
}

export default function LiveTrackerPage() {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const tileLayerRef = useRef(null)
  const markerRef = useRef(null)
  const routeLayerRef = useRef(null)
  const trailLayerRef = useRef(null)
  const leafletReadyRef = useRef(false)
  const mapInitializedRef = useRef(false)

  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [kmlTrackPath, setKmlTrackPath] = useState([])
  const [mapReady, setMapReady] = useState(false)
  const [error, setError] = useState(null)
  const [apiStatus, setApiStatus] = useState('loading') // 'loading' | 'live' | 'waiting' | 'error'
  const [basemap, setBasemap] = useState('dark')
  const [sessionDuration, setSessionDuration] = useState('--')

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

  // ---- Data fetching ----
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/state?history=1&limit=2000`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      if (json.history) setHistory(json.history)
      setApiStatus(json.status === 'waiting' ? 'waiting' : 'live')
      setError(null)
    } catch (err) {
      setError(err.message)
      setApiStatus((prev) => prev === 'loading' ? 'error' : prev)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchData])

  // Session duration ticker
  useEffect(() => {
    if (!data?.session?.startedAt) return
    const tick = () => setSessionDuration(formatDuration(data.session.startedAt))
    tick()
    const interval = setInterval(tick, 10000)
    return () => clearInterval(interval)
  }, [data?.session?.startedAt])

  // ---- Load Leaflet from CDN ----
  useEffect(() => {
    if (window.L) {
      leafletReadyRef.current = true
      return
    }

    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => { leafletReadyRef.current = true }
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
      tileLayerRef.current = L.tileLayer(config.url, {
        attribution: config.attribution,
        maxZoom: 18,
      }).addTo(map)

      // Layer groups for the KML course and speed-coloured trail segments
      routeLayerRef.current = L.layerGroup().addTo(map)
      trailLayerRef.current = L.layerGroup().addTo(map)

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
    if (kmlTrackPath.length < 2) return

    const L = window.L
    const map = mapRef.current
    routeLayerRef.current.clearLayers()

    const coursePath = L.polyline(kmlTrackPath, {
      color: '#A88E5D',
      weight: 4,
      opacity: 0.72,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(routeLayerRef.current)

    if (!data?.location && history.length < 2) {
      map.fitBounds(coursePath.getBounds(), { padding: [36, 36], maxZoom: 13 })
    }
  }, [mapReady, kmlTrackPath, data?.location, history.length])

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

    // Build speed-coloured trail
    if (trailLayerRef.current) {
      trailLayerRef.current.clearLayers()

      const points = history.filter(p => p.location?.lat && p.location?.lng)
      if (points.length < 2) return

      // Draw segments between consecutive points, coloured by speed
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]
        const curr = points[i]
        const kmh = getSpeedKmh(curr)
        const color = speedToColor(kmh)

        const segment = L.polyline(
          [
            [prev.location.lat, prev.location.lng],
            [curr.location.lat, curr.location.lng],
          ],
          {
            color,
            weight: 3.5,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round',
          }
        )

        // Popup with speed info on click
        const label = speedLabel(kmh)
        const paceStr = formatMinPerKm(kmh)
        const time = curr.gpsTimestamp
          ? new Date(curr.gpsTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : ''
        segment.bindPopup(
          `<div style="font-family:Montserrat,sans-serif;font-size:12px;line-height:1.5;min-width:120px">
            <strong style="color:#A88E5D">${label}</strong><br/>
            ${kmh != null ? `${kmh.toFixed ? kmh.toFixed(1) : kmh} km/h` : 'No speed'}
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
        const kmh = getSpeedKmh(data)
        L.polyline(
          [
            [last.location.lat, last.location.lng],
            [data.location.lat, data.location.lng],
          ],
          {
            color: speedToColor(kmh),
            weight: 3.5,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round',
          }
        ).addTo(trailLayerRef.current)
      }
    }
  }, [data, history])

  // ---- Basemap switch ----
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current || !window.L) return
    const L = window.L
    const config = BASEMAPS[basemap]

    mapRef.current.removeLayer(tileLayerRef.current)
    tileLayerRef.current = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: 18,
    }).addTo(mapRef.current)

    const el = mapContainerRef.current
    if (el) {
      el.classList.remove('basemap-dark', 'basemap-topo', 'basemap-satellite')
      el.classList.add(config.className)
    }
  }, [basemap])

  // ---- Recenter ----
  const handleRecenter = () => {
    if (!mapRef.current) return
    if (data?.location) {
      mapRef.current.flyTo([data.location.lat, data.location.lng], 15, { duration: 1.2 })
    } else {
      mapRef.current.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1.2 })
    }
  }

  // ---- Fit trail bounds ----
  const handleFitTrail = () => {
    if (!mapRef.current || !window.L) return
    const historyPoints = history.filter(p => p.location?.lat && p.location?.lng)
    const routePoints = kmlTrackPath.length > 1
      ? kmlTrackPath
      : historyPoints.map(p => [p.location.lat, p.location.lng])

    if (routePoints.length < 2) return

    const bounds = window.L.latLngBounds(routePoints)
    historyPoints.forEach(p => bounds.extend([p.location.lat, p.location.lng]))
    if (data?.location) bounds.extend([data.location.lat, data.location.lng])
    mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, duration: 1 })
  }

  // ---- Derived display values ----
  const isLive = apiStatus === 'live'
  const isWaiting = apiStatus === 'waiting'
  const isStale = data?.ageSeconds > 120
  const isOffline = data?.ageSeconds > 600
  const statusClass = !isLive ? 'offline' : isOffline ? 'offline' : isStale ? 'stale' : ''
  const statusLabel = !isLive ? 'Waiting' : isOffline ? 'Offline' : isStale ? 'Stale' : 'Live'
  const speed = data?.speed || {}
  const movement = data?.movement || {}
  const phone = data?.phone || {}
  const session = data?.session || {}

  // Compute total distance from history
  const totalDistanceKm = (() => {
    const pts = history.filter(p => p.location?.lat && p.location?.lng)
    if (pts.length < 2) return null
    let dist = 0
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1].location
      const b = pts[i].location
      const R = 6371000
      const dLat = ((b.lat - a.lat) * Math.PI) / 180
      const dLng = ((b.lng - a.lng) * Math.PI) / 180
      const lat1 = (a.lat * Math.PI) / 180
      const lat2 = (b.lat * Math.PI) / 180
      const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
      dist += 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
    }
    return dist / 1000
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

        {/* Status bar */}
        <motion.div
          className="tracker-status-bar"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          <div className="tracker-stat">
            <span className={`live-pulse ${statusClass}`}>
              <span className="dot" />
              {statusLabel}
            </span>
            <span className="tracker-stat-label">
              {data?.ageSeconds != null ? formatAge(data.ageSeconds) : ''}
            </span>
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

          <div className="tracker-stat">
            <span className="tracker-stat-value">
              {movement.description || '--'}
            </span>
            <span className="tracker-stat-label">Status</span>
          </div>

          <div className="tracker-stat">
            <span className="tracker-stat-value">
              {phone.batteryPercent != null ? `${phone.batteryPercent}%` : '--'}
            </span>
            <span className="tracker-stat-label">Battery</span>
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

          {/* Map controls */}
          <div className="map-controls-right">
            <button className="recenter-btn" onClick={handleRecenter} title="Recenter on Nicole">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
              </svg>
            </button>
            {(kmlTrackPath.length > 1 || history.length > 1) && (
              <button className="recenter-btn" onClick={handleFitTrail} title="Fit entire route">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>
            )}
          </div>

          {/* Speed legend */}
          <div className="speed-legend">
            <span className="speed-legend-title">Speed</span>
            <div className="speed-legend-bar">
              <span className="speed-legend-label">Slow</span>
              <div className="speed-legend-gradient" />
              <span className="speed-legend-label">Fast</span>
            </div>
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
              {session.pointCount || 0} points tracked
            </div>
          </div>

          <div className="tracker-info-card">
            <div className="tracker-info-card-label">Speed Detail</div>
            <div className="tracker-info-card-value">
              {speed.friendly || 'No speed data'}
            </div>
            <div className="tracker-info-card-sub">
              Source: {speed.source || 'n/a'}
              {speed.calculatedKmh != null && speed.source === 'owntracks' && (
                <> · Calc: {speed.calculatedKmh} km/h</>
              )}
            </div>
          </div>

          <div className="tracker-info-card">
            <div className="tracker-info-card-label">Phone</div>
            <div className="tracker-info-card-value">
              {phone.batteryPercent != null ? `${phone.batteryPercent}% ${phone.batteryStatus || ''}` : 'No data'}
            </div>
            <div className="tracker-info-card-sub">
              {phone.connection || 'Unknown connection'}
              {data?.ownTracks?.triggerText && <> · {data.ownTracks.triggerText}</>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="tracker-footer-spacer">
          <p style={{ color: 'var(--white-30)', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
            Updates every {POLL_INTERVAL / 1000} seconds · Click trail segments for speed data
          </p>
          {error && (
            <p style={{ color: 'var(--warm)', fontSize: 12, marginTop: 8 }}>
              Connection issue: {error} — map still works, retrying...
            </p>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
