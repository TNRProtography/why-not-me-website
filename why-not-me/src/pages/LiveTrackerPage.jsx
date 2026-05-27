import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import './LiveTrackerPage.css'

const API_BASE = 'https://why-not-me-live-tracker.why-not-me-nicole-white.workers.dev'
const POLL_INTERVAL = 8000

// Queenstown Marathon — centered between start (Millbrook) and finish (Queenstown Rec Ground)
const DEFAULT_CENTER = [-44.9950, 168.7750]
const DEFAULT_ZOOM = 12

const BASEMAPS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    label: 'Dark',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    label: 'Topo',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    label: 'Satellite',
  },
}

// ---- Queenstown Marathon full course (42.2km) ----
// Traced from the official course map: Millbrook Resort → Arrowtown → Lake Hayes →
// Frankton → Lake Wakatipu shoreline → Queenstown Rec Ground
const MARATHON_COURSE = [
  // Start: Millbrook Resort
  [-44.9382, 168.8242],
  // North through Millbrook toward Arrowtown
  [-44.9370, 168.8268],
  [-44.9345, 168.8310],
  [-44.9320, 168.8340],
  // Into Arrowtown — Buckingham St area
  [-44.9310, 168.8370],
  [-44.9295, 168.8398],
  [-44.9278, 168.8420],
  // Aid 1 (~3km) — Arrowtown
  [-44.9268, 168.8435],
  // South along Centennial Ave
  [-44.9285, 168.8445],
  [-44.9310, 168.8448],
  [-44.9340, 168.8430],
  // Down toward Arrow Junction / Morven Ferry area
  [-44.9375, 168.8400],
  [-44.9420, 168.8370],
  [-44.9460, 168.8350],
  // Aid 2 (~7km) — Arrowtown-Lake Hayes Rd
  [-44.9500, 168.8330],
  [-44.9545, 168.8295],
  [-44.9580, 168.8260],
  [-44.9620, 168.8210],
  [-44.9660, 168.8170],
  // Along Hogans Gully Rd toward Lake Hayes
  [-44.9700, 168.8130],
  [-44.9740, 168.8080],
  // Aid 3 (~10.5km)
  [-44.9760, 168.8040],
  [-44.9790, 168.7980],
  [-44.9815, 168.7930],
  // East side of Lake Hayes — Arrowtown-Lake Hayes Rd
  [-44.9840, 168.7875],
  [-44.9870, 168.7830],
  [-44.9900, 168.7790],
  // Aid 4 (~13.5km) — turning south of Lake Hayes
  [-44.9930, 168.7750],
  [-44.9960, 168.7700],
  [-44.9985, 168.7650],
  // Rounding southern end of Lake Hayes
  [-45.0010, 168.7600],
  [-45.0030, 168.7550],
  [-45.0045, 168.7500],
  // West side of Lake Hayes heading north
  [-45.0030, 168.7445],
  [-45.0005, 168.7400],
  // Aid 5 (~18km) — Speargrass Flat Rd area
  [-44.9975, 168.7370],
  [-44.9940, 168.7350],
  [-44.9910, 168.7325],
  // Heading west along Speargrass Flat Rd / domain area
  [-44.9890, 168.7280],
  [-44.9885, 168.7230],
  // Aid 6 (~22.5km) — Lower Shotover area
  [-44.9888, 168.7175],
  [-44.9900, 168.7120],
  [-44.9920, 168.7070],
  // South along Lower Shotover Rd
  [-44.9950, 168.7030],
  [-44.9980, 168.6990],
  // Aid 7 (~26.5km)
  [-45.0010, 168.6955],
  [-45.0040, 168.6930],
  [-45.0070, 168.6920],
  // Along Frankton-Ladies Mile Hwy toward Frankton
  [-45.0100, 168.6910],
  [-45.0130, 168.6895],
  [-45.0160, 168.6870],
  // Aid 8 (~29.5km) — Frankton area / Kawarau River
  [-45.0190, 168.6840],
  [-45.0215, 168.6800],
  [-45.0235, 168.6760],
  [-45.0250, 168.6720],
  // Through Frankton toward the waterfront
  [-45.0260, 168.6680],
  [-45.0270, 168.6640],
  // Aid 9 (~32km) — Frankton south
  [-45.0275, 168.6600],
  [-45.0270, 168.6555],
  [-45.0258, 168.6510],
  // Frankton Arm Walkway along Lake Wakatipu
  [-45.0240, 168.6470],
  [-45.0225, 168.6430],
  [-45.0210, 168.6395],
  // Aid 10 (~35.5km)
  [-45.0195, 168.6355],
  [-45.0178, 168.6310],
  [-45.0165, 168.6270],
  [-45.0150, 168.6230],
  // Along the lakefront toward Queenstown
  [-45.0135, 168.6195],
  [-45.0118, 168.6165],
  [-45.0100, 168.6140],
  // Queenstown Gardens area
  [-45.0085, 168.6120],
  [-45.0075, 168.6105],
  // Aid 11 (~39km)
  [-45.0065, 168.6090],
  [-45.0050, 168.6085],
  [-45.0038, 168.6095],
  // Final stretch to Queenstown Rec Ground
  [-45.0030, 168.6110],
  [-45.0025, 168.6125],
  // Finish: Queenstown Recreational Ground
  [-45.0020, 168.6140],
]

// Aid stations with km markers
const AID_STATIONS = [
  { km: 0, label: 'Start', sublabel: 'Millbrook Resort', pos: [-44.9382, 168.8242], type: 'start' },
  { km: 3, label: 'Aid 1', sublabel: '3 km', pos: [-44.9268, 168.8435] },
  { km: 7, label: 'Aid 2', sublabel: '7 km', pos: [-44.9500, 168.8330] },
  { km: 10.5, label: 'Aid 3', sublabel: '10.5 km', pos: [-44.9760, 168.8040] },
  { km: 13.5, label: 'Aid 4', sublabel: '13.5 km', pos: [-44.9930, 168.7750] },
  { km: 18, label: 'Aid 5', sublabel: '18 km', pos: [-44.9975, 168.7370] },
  { km: 22.5, label: 'Aid 6', sublabel: '22.5 km', pos: [-44.9888, 168.7175] },
  { km: 26.5, label: 'Aid 7', sublabel: '26.5 km', pos: [-45.0010, 168.6955] },
  { km: 29.5, label: 'Aid 8', sublabel: '29.5 km', pos: [-45.0190, 168.6840] },
  { km: 32, label: 'Aid 9', sublabel: '32 km', pos: [-45.0275, 168.6600] },
  { km: 35.5, label: 'Aid 10', sublabel: '35.5 km', pos: [-45.0195, 168.6355] },
  { km: 39, label: 'Aid 11', sublabel: '39 km', pos: [-45.0065, 168.6090] },
  { km: 42.2, label: 'Finish', sublabel: 'Rec Ground', pos: [-45.0020, 168.6140], type: 'finish' },
]

// Speed → colour
function speedToColor(kmh) {
  if (kmh == null || kmh <= 0) return 'rgba(168,142,93,0.25)'
  if (kmh <= 2) return 'rgba(168,142,93,0.4)'
  if (kmh <= 5) return 'rgba(185,160,110,0.7)'
  if (kmh <= 8) return 'rgba(203,178,153,0.85)'
  if (kmh <= 12) return '#CBB299'
  if (kmh <= 16) return '#E8D5B8'
  return '#F5F3EC'
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

export default function LiveTrackerPage() {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const tileLayerRef = useRef(null)
  const markerRef = useRef(null)
  const trailLayerRef = useRef(null)
  const courseLayerRef = useRef(null)
  const mapInitializedRef = useRef(false)

  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState(null)
  const [apiStatus, setApiStatus] = useState('loading')
  const [basemap, setBasemap] = useState('dark')

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

  // ---- Initialize map (always, immediately) ----
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

      // Initial tile layer
      const config = BASEMAPS[basemap]
      tileLayerRef.current = L.tileLayer(config.url, {
        attribution: config.attribution,
        maxZoom: 18,
      }).addTo(map)

      // Layer groups
      courseLayerRef.current = L.layerGroup().addTo(map)
      trailLayerRef.current = L.layerGroup().addTo(map)

      mapRef.current = map
      mapInitializedRef.current = true

      setTimeout(() => map.invalidateSize(), 200)
      setTimeout(() => map.invalidateSize(), 800)

      // Draw the marathon course immediately
      drawCourse(L, map)

      return true
    }

    if (!tryInit()) {
      const interval = setInterval(() => {
        if (tryInit()) clearInterval(interval)
      }, 150)
      const timeout = setTimeout(() => clearInterval(interval), 12000)
      return () => { clearInterval(interval); clearTimeout(timeout) }
    }
  }, [data, basemap])

  // ---- Draw the official marathon course ----
  function drawCourse(L, map) {
    if (!courseLayerRef.current) return

    // Course line — dashed, subtle
    L.polyline(MARATHON_COURSE, {
      color: 'rgba(85,96,77,0.6)',
      weight: 4,
      opacity: 1,
      dashArray: '8 6',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(courseLayerRef.current)

    // Thin bright core
    L.polyline(MARATHON_COURSE, {
      color: 'rgba(85,96,77,0.25)',
      weight: 8,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(courseLayerRef.current)

    // Aid station markers
    AID_STATIONS.forEach((station) => {
      const isEndpoint = station.type === 'start' || station.type === 'finish'
      const color = station.type === 'start' ? '#55604D' : station.type === 'finish' ? '#A88E5D' : 'rgba(245,243,236,0.5)'
      const radius = isEndpoint ? 7 : 4
      const weight = isEndpoint ? 2.5 : 1.5

      L.circleMarker(station.pos, {
        radius,
        color: 'rgba(13,13,13,0.8)',
        weight,
        fillColor: color,
        fillOpacity: isEndpoint ? 1 : 0.7,
      }).bindPopup(
        `<div style="font-family:Montserrat,sans-serif;font-size:12px;line-height:1.5">
          <strong style="color:${station.type === 'finish' ? '#A88E5D' : '#55604D'}">${station.label}</strong><br/>
          <span style="opacity:0.7">${station.sublabel}</span>
        </div>`,
        { className: 'tracker-popup' }
      ).addTo(courseLayerRef.current)

      // Km labels for endpoints
      if (isEndpoint) {
        L.marker(station.pos, {
          icon: L.divIcon({
            className: 'course-label',
            html: `<span class="course-label-text course-label-${station.type}">${station.label}</span>`,
            iconSize: [60, 20],
            iconAnchor: [30, -8],
          }),
        }).addTo(courseLayerRef.current)
      }
    })
  }

  // ---- Update Nicole marker + live trail when data changes ----
  useEffect(() => {
    if (!mapRef.current || !window.L) return
    const L = window.L

    // Nicole marker
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
          iconSize: [56, 72],
          iconAnchor: [28, 66],
        })
        markerRef.current = L.marker([lat, lng], { icon: markerIcon, zIndexOffset: 1000 }).addTo(mapRef.current)
      } else {
        markerRef.current.setLatLng([lat, lng])
      }
    }

    // Speed-coloured live trail
    if (trailLayerRef.current) {
      trailLayerRef.current.clearLayers()

      const points = history.filter(p => p.location?.lat && p.location?.lng)
      if (points.length >= 2) {
        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1]
          const curr = points[i]
          const kmh = getSpeedKmh(curr)

          const segment = L.polyline(
            [[prev.location.lat, prev.location.lng], [curr.location.lat, curr.location.lng]],
            { color: speedToColor(kmh), weight: 4.5, opacity: 1, lineCap: 'round', lineJoin: 'round' }
          )

          const label = speedLabel(kmh)
          const paceStr = formatMinPerKm(kmh)
          const time = curr.gpsTimestamp
            ? new Date(curr.gpsTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ''
          segment.bindPopup(
            `<div style="font-family:Montserrat,sans-serif;font-size:12px;line-height:1.5;min-width:100px">
              <strong style="color:#A88E5D">${label}</strong><br/>
              ${kmh != null ? `${typeof kmh === 'number' ? kmh.toFixed(1) : kmh} km/h` : 'No speed'}
              ${paceStr ? ` · ${paceStr} /km` : ''}<br/>
              <span style="opacity:0.6">${time}</span>
            </div>`,
            { className: 'tracker-popup' }
          )
          segment.addTo(trailLayerRef.current)
        }

        // Connect last history point to current position
        if (data?.location && points.length > 0) {
          const last = points[points.length - 1]
          L.polyline(
            [[last.location.lat, last.location.lng], [data.location.lat, data.location.lng]],
            { color: speedToColor(getSpeedKmh(data)), weight: 4.5, opacity: 1, lineCap: 'round', lineJoin: 'round' }
          ).addTo(trailLayerRef.current)
        }
      }
    }
  }, [data, history])

  // ---- Basemap switching (keep all layers cached) ----
  useEffect(() => {
    if (!mapRef.current || !window.L) return
    const L = window.L
    const map = mapRef.current
    const config = BASEMAPS[basemap]

    // Remove old tile layer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current)
    }

    // Create new tile layer
    tileLayerRef.current = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: 18,
      crossOrigin: true,
    }).addTo(map)

    // Ensure tile layer is behind other layers
    tileLayerRef.current.bringToBack()

    // Update filter class on container
    const el = mapContainerRef.current
    if (el) {
      el.className = `tracker-map basemap-${basemap}`
    }
  }, [basemap])

  // Recenter
  const handleRecenter = () => {
    if (!mapRef.current) return
    if (data?.location) {
      mapRef.current.flyTo([data.location.lat, data.location.lng], 15, { duration: 1.2 })
    } else {
      mapRef.current.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1.2 })
    }
  }

  // Fit route
  const handleFitRoute = () => {
    if (!mapRef.current || !window.L) return
    const bounds = window.L.latLngBounds(MARATHON_COURSE)
    if (data?.location) bounds.extend([data.location.lat, data.location.lng])
    mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, duration: 1 })
  }

  // ---- Derived values ----
  const isLive = apiStatus === 'live'
  const isWaiting = apiStatus === 'waiting'
  const isStale = data?.ageSeconds > 120
  const isOffline = data?.ageSeconds > 600
  const statusClass = !isLive ? 'offline' : isOffline ? 'offline' : isStale ? 'stale' : ''
  const statusLabel = !isLive ? 'Waiting' : isOffline ? 'Offline' : isStale ? 'Stale' : 'Live'
  const speed = data?.speed || {}
  const movement = data?.movement || {}

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
              Queenstown Marathon 2026
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
        </motion.div>

        {/* Map */}
        <motion.div
          className="tracker-map-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.45 }}
        >
          <div
            ref={mapContainerRef}
            className={`tracker-map basemap-${basemap}`}
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
            <button className="recenter-btn" onClick={handleFitRoute} title="Fit entire marathon route">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </button>
          </div>

          {/* Speed legend */}
          <div className="speed-legend">
            <span className="speed-legend-title">Nicole's Speed</span>
            <div className="speed-legend-bar">
              <span className="speed-legend-label">Slow</span>
              <div className="speed-legend-gradient" />
              <span className="speed-legend-label">Fast</span>
            </div>
            <div className="speed-legend-course">
              <span className="speed-legend-course-line" />
              <span className="speed-legend-label">Course</span>
            </div>
          </div>

          {/* Waiting overlay on map */}
          {(isWaiting || apiStatus === 'loading' || apiStatus === 'error') && (
            <div className="map-waiting-overlay">
              <div className="map-waiting-content">
                <p className="map-waiting-heading">Queenstown Marathon</p>
                <p className="map-waiting-sub">
                  {apiStatus === 'loading' ? 'Connecting to tracker...' :
                   apiStatus === 'error' ? 'Tracker offline — showing course' :
                   'Live tracking will appear on race day'}
                </p>
                <p className="map-waiting-course">42.2 km · Millbrook to Queenstown</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Info cards — removed phone/session, kept useful ones */}
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
            <div className="tracker-info-card-label">Speed Detail</div>
            <div className="tracker-info-card-value">
              {speed.friendly || 'No speed data'}
            </div>
            {speed.minPerKm && (
              <div className="tracker-info-card-sub">Pace: {speed.minPerKm}</div>
            )}
          </div>

          <div className="tracker-info-card">
            <div className="tracker-info-card-label">Course</div>
            <div className="tracker-info-card-value">Queenstown Marathon</div>
            <div className="tracker-info-card-sub">42.2 km · Millbrook Resort → Rec Ground</div>
          </div>

          <div className="tracker-info-card">
            <div className="tracker-info-card-label">Distance Covered</div>
            <div className="tracker-info-card-value">
              {totalDistanceKm != null ? `${totalDistanceKm.toFixed(2)} km` : 'Awaiting data'}
            </div>
            {totalDistanceKm != null && (
              <div className="tracker-info-card-sub">{Math.min(100, (totalDistanceKm / 42.2 * 100)).toFixed(1)}% of marathon</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="tracker-footer-spacer">
          <p style={{ color: 'var(--white-30)', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
            Auto-updates every {POLL_INTERVAL / 1000}s · Click trail for speed · Click markers for details
          </p>
          {error && (
            <p style={{ color: 'var(--warm)', fontSize: 12, marginTop: 8 }}>
              Connection issue: {error} — course map still visible, retrying...
            </p>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
