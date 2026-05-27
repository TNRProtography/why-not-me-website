import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import './LiveTrackerPage.css'

const API_BASE = 'https://why-not-me-live-tracker.why-not-me-nicole-white.workers.dev'
const POLL_INTERVAL = 8000
const TRAIL_COLOR = '#A88E5D'
const TRAIL_GLOW = '#CBB299'

const BASEMAPS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    label: 'Dark',
    className: 'basemap-dark',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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

function formatAge(seconds) {
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`
  return `${Math.round(seconds / 86400)}d ago`
}

function formatDuration(startedAt) {
  if (!startedAt) return '--'
  const ms = Date.now() - new Date(startedAt).getTime()
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function LiveTrackerPage() {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const tileLayerRef = useRef(null)
  const markerRef = useRef(null)
  const trailRef = useRef(null)
  const historyDotsRef = useRef(null)
  const leafletLoadedRef = useRef(false)

  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [basemap, setBasemap] = useState('dark')
  const [sessionDuration, setSessionDuration] = useState('--')

  // Fetch live state + history
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/state?history=1&limit=2000`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      if (json.history) setHistory(json.history)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll
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

  // Load Leaflet from CDN
  useEffect(() => {
    if (leafletLoadedRef.current) return
    if (window.L) { leafletLoadedRef.current = true; return }

    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => { leafletLoadedRef.current = true }
    document.head.appendChild(script)
  }, [])

  // Initialize map once we have Leaflet + data + container
  useEffect(() => {
    if (mapRef.current) return
    if (!data?.location) return
    if (!mapContainerRef.current) return

    const tryInit = () => {
      if (!window.L) return false

      const L = window.L
      const { lat, lng } = data.location

      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 14,
        zoomControl: true,
        attributionControl: true,
      })

      const basemapConfig = BASEMAPS[basemap]
      tileLayerRef.current = L.tileLayer(basemapConfig.url, {
        attribution: basemapConfig.attribution,
        maxZoom: 18,
      }).addTo(map)

      // Custom Nicole marker
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

      markerRef.current = L.marker([lat, lng], { icon: markerIcon }).addTo(map)

      // Trail polyline
      trailRef.current = L.polyline([], {
        color: TRAIL_COLOR,
        weight: 3,
        opacity: 0.8,
        smoothFactor: 1.5,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)

      // History dot layer
      historyDotsRef.current = L.layerGroup().addTo(map)

      mapRef.current = map

      // Slight delay for tile rendering
      setTimeout(() => map.invalidateSize(), 200)
      return true
    }

    if (!tryInit()) {
      const interval = setInterval(() => {
        if (tryInit()) clearInterval(interval)
      }, 150)
      return () => clearInterval(interval)
    }
  }, [data, basemap])

  // Update marker position + trail when data/history changes
  useEffect(() => {
    if (!mapRef.current || !data?.location || !window.L) return

    const L = window.L
    const { lat, lng } = data.location

    // Update marker
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    }

    // Update trail from history
    if (trailRef.current && history.length > 0) {
      const coords = history
        .filter(p => p.location?.lat && p.location?.lng)
        .map(p => [p.location.lat, p.location.lng])

      // Add current position to trail
      coords.push([lat, lng])
      trailRef.current.setLatLngs(coords)
    }

    // Update history dots
    if (historyDotsRef.current) {
      historyDotsRef.current.clearLayers()

      // Show dots every N points depending on count
      const points = history.filter(p => p.location?.lat && p.location?.lng)
      const step = points.length > 200 ? 10 : points.length > 80 ? 5 : 2

      points.forEach((p, i) => {
        if (i % step !== 0) return
        const isRecent = i > points.length - 6
        L.circleMarker([p.location.lat, p.location.lng], {
          radius: isRecent ? 3.5 : 2,
          color: 'transparent',
          fillColor: isRecent ? TRAIL_GLOW : TRAIL_COLOR,
          fillOpacity: isRecent ? 0.8 : 0.35,
        }).addTo(historyDotsRef.current)
      })
    }
  }, [data, history])

  // Basemap switch
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current || !window.L) return
    const L = window.L
    const config = BASEMAPS[basemap]

    mapRef.current.removeLayer(tileLayerRef.current)
    tileLayerRef.current = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: 18,
    }).addTo(mapRef.current)

    // Update container class for satellite filter
    const el = mapContainerRef.current
    if (el) {
      el.classList.remove('basemap-dark', 'basemap-topo', 'basemap-satellite')
      el.classList.add(config.className)
    }
  }, [basemap])

  // Recenter
  const handleRecenter = () => {
    if (!mapRef.current || !data?.location) return
    mapRef.current.flyTo([data.location.lat, data.location.lng], 15, {
      duration: 1.2,
    })
  }

  // ---- Render states ----

  if (loading) {
    return (
      <PageTransition>
        <div className="tracker-page">
          <div className="tracker-hero">
            <div className="tracker-hero-inner">
              <p className="tracker-subtitle">Live Marathon Tracker</p>
              <h1>Track Nicole.</h1>
            </div>
          </div>
          <div className="tracker-loading">
            <div className="tracker-loading-spinner" />
            <p className="tracker-loading-text">Connecting to tracker</p>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (data?.status === 'waiting') {
    return (
      <PageTransition>
        <div className="tracker-page">
          <div className="tracker-hero">
            <div className="tracker-hero-inner">
              <p className="tracker-subtitle">Live Marathon Tracker</p>
              <h1>Track Nicole.</h1>
            </div>
          </div>
          <div className="tracker-waiting">
            <h2>Tracking hasn't started yet.</h2>
            <p>
              Nicole's live location will appear here on race day. Check back when the marathon begins
              — you'll see her position, speed, and route in real time.
            </p>
            <div style={{ marginTop: 40 }}>
              <motion.a
                href="/queenstown-marathon"
                className="btn-outline"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                About the Marathon
              </motion.a>
            </div>
          </div>
        </div>
      </PageTransition>
    )
  }

  const isStale = data?.ageSeconds > 120
  const isOffline = data?.ageSeconds > 600
  const statusClass = isOffline ? 'offline' : isStale ? 'stale' : ''
  const statusLabel = isOffline ? 'Offline' : isStale ? 'Stale' : 'Live'
  const speed = data?.speed || {}
  const movement = data?.movement || {}
  const phone = data?.phone || {}
  const session = data?.session || {}

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
              {speed.minPerKm || speed.friendly || '--'}
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

        {/* Map */}
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

          {/* Recenter button */}
          <button className="recenter-btn" onClick={handleRecenter} title="Recenter on Nicole">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
            </svg>
          </button>
        </motion.div>

        {/* Info cards below map */}
        <div className="tracker-info-strip">
          <div className="tracker-info-card">
            <div className="tracker-info-card-label">Coordinates</div>
            <div className="tracker-info-card-value">
              {data?.location ? `${data.location.lat.toFixed(5)}, ${data.location.lng.toFixed(5)}` : '--'}
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

        {/* Bottom spacer */}
        <div className="tracker-footer-spacer">
          <p style={{ color: 'var(--white-30)', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
            Updates every {POLL_INTERVAL / 1000} seconds
          </p>
          {error && (
            <p style={{ color: 'var(--warm)', fontSize: 12, marginTop: 8 }}>
              Connection issue: {error}
            </p>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
