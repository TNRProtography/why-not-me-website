import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import './TrailElevationExplorer.css'

/*
 * TrailElevationExplorer
 * ──────────────────────
 * A unified Leaflet map + canvas elevation profile with:
 *   • Working basemap switching (Dark / Light / Streets)
 *   • Interactive hover-scrub between map and elevation
 *   • GPS replay animation of Nicole's actual race-day trail
 *
 * Loads Leaflet from CDN (same approach as LiveTrackerPage).
 * Loads KML course data from /data/queenstown-marathon.kml.
 * Accepts `history` prop — the sorted GPS history array from the tracker API.
 */

// ── constants ────────────────────────────────────────────────────
const GOLD = '#A88E5D'
const WARM = '#CBB299'
const WHITE = '#F5F3EC'
const BLACK = '#0D0D0D'

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

const DEFAULT_CENTER = [-45.0312, 168.6626]
const DEFAULT_ZOOM = 12
const KM_LABELS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 42.2]

// Replay speed multiplier: real-time × this
const REPLAY_SPEED_OPTIONS = [
  { label: '50×', value: 50 },
  { label: '200×', value: 200 },
  { label: '500×', value: 500 },
  { label: '1000×', value: 1000 },
]

// ── helpers ──────────────────────────────────────────────────────
function haversineKm(a, b) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function parseKmlRoute(kmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(kmlText, 'application/xml')
  const lineStrings = Array.from(doc.getElementsByTagName('LineString'))
  const routeLine = lineStrings.find((l) => l.getAttribute('id') === 'Route') || lineStrings[0]
  const coordsNode = routeLine?.getElementsByTagName('coordinates')?.[0]
  if (!coordsNode?.textContent) return []

  return coordsNode.textContent
    .trim()
    .split(/\s+/)
    .map((pt) => {
      const [lng, lat, elevation] = pt.split(',').map(Number)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      return { lat, lng, elevation: Number.isFinite(elevation) ? elevation : null }
    })
    .filter(Boolean)
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

function elevationColorBright(t) {
  const r = Math.round(lerp(85, 245, t))
  const g = Math.round(lerp(120, 220, t))
  const b = Math.round(lerp(100, 140, t))
  return `rgb(${r},${g},${b})`
}

function normalizeTimestamp(value) {
  if (value == null || value === '') return null
  let ms = null
  if (typeof value === 'number') {
    ms = value < 1e12 ? value * 1000 : value
  } else if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const numeric = Number(trimmed)
    if (Number.isFinite(numeric) && /^\d+(\.\d+)?$/.test(trimmed)) {
      ms = numeric < 1e12 ? numeric * 1000 : numeric
    } else {
      const parsed = Date.parse(trimmed)
      if (Number.isFinite(parsed)) ms = parsed
    }
  }
  return Number.isFinite(ms) && ms > 0 ? ms : null
}

function getPointTimeMs(point) {
  if (!point) return null
  const candidates = [
    point.receivedAt, point.lastReceivedAt, point.ingestedAt,
    point.location?.receivedAt, point.location?.lastReceivedAt,
    point.ownTracks?.receivedAt, point.ownTracks?.tst,
    point.gpsTimestamp, point.location?.timestamp, point.timestamp,
  ]
  for (const c of candidates) {
    const ms = normalizeTimestamp(c)
    if (ms != null) return ms
  }
  return null
}

function buildProfile(routePoints) {
  let dist = 0, minE = Infinity, maxE = -Infinity, gain = 0, loss = 0
  let prev = null

  const pts = routePoints.map((pt, i) => {
    if (i > 0) dist += haversineKm(routePoints[i - 1], pt)
    if (pt.elevation != null) {
      if (prev != null) {
        const d = pt.elevation - prev
        if (d > 0) gain += d
        else loss -= d
      }
      minE = Math.min(minE, pt.elevation)
      maxE = Math.max(maxE, pt.elevation)
      prev = pt.elevation
    }
    return { ...pt, distanceKm: dist }
  })

  return {
    pts,
    totalKm: dist,
    minE, maxE,
    gain, loss,
    elevRange: (maxE - minE) || 1,
  }
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '--'
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

// ── main component ──────────────────────────────────────────────
export default function TrailElevationExplorer({ history = [] }) {
  // KML route
  const [routePoints, setRoutePoints] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Map
  const [basemap, setBasemap] = useState('dark')
  const [mapReady, setMapReady] = useState(false)
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const tileLayerRef = useRef(null)
  const currentBasemapRef = useRef(null)
  const routeLayerRef = useRef(null)
  const mapInitRef = useRef(false)

  // Elevation hover
  const [hoverIdx, setHoverIdx] = useState(null)
  const elevCanvasRef = useRef(null)
  const elevWrapRef = useRef(null)
  const hoverMarkerRef = useRef(null)

  // Replay
  const [replayState, setReplayState] = useState('idle') // idle | playing | paused
  const [replayProgress, setReplayProgress] = useState(0) // 0–1
  const [replaySpeed, setReplaySpeed] = useState(200)
  const replayMarkerRef = useRef(null)
  const replayTrailRef = useRef(null)
  const replayAnimRef = useRef(null)
  const replayStartRef = useRef(null)
  const replayPausedAtRef = useRef(0)

  // ── process data ──
  const profile = useMemo(
    () => (routePoints.length > 2 ? buildProfile(routePoints) : null),
    [routePoints]
  )

  const replayPoints = useMemo(() => {
    if (!history || !history.length) return []
    return history
      .filter((p) => p.location?.lat && p.location?.lng)
      .map((p) => ({
        lat: p.location.lat,
        lng: p.location.lng,
        time: getPointTimeMs(p),
      }))
      .filter((p) => p.time != null)
      .sort((a, b) => a.time - b.time)
  }, [history])

  const replayDuration = useMemo(() => {
    if (replayPoints.length < 2) return 0
    return replayPoints[replayPoints.length - 1].time - replayPoints[0].time
  }, [replayPoints])

  const hasReplayData = replayPoints.length >= 2

  // ── Load KML ──
  useEffect(() => {
    fetch('/data/queenstown-marathon.kml')
      .then((r) => r.text())
      .then((kml) => {
        setRoutePoints(parseKmlRoute(kml))
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [])

  // ── Load Leaflet (guard against duplicate injection) ──
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

  // ── Initialize map ──
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
      if (container._leaflet_id) return true
      const L = window.L

      map = L.map(container, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
        attributionControl: true,
      })

      const config = BASEMAPS[basemap]
      tileLayerRef.current = L.tileLayer(config.url, {
        attribution: config.attribution,
        maxZoom: config.maxZoom,
        keepBuffer: 3,
      }).addTo(map)
      currentBasemapRef.current = basemap

      routeLayerRef.current = L.layerGroup().addTo(map)
      replayTrailRef.current = L.layerGroup().addTo(map)

      mapRef.current = map
      mapInitRef.current = true
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
      mapInitRef.current = false
      tileLayerRef.current = null
      currentBasemapRef.current = null
      routeLayerRef.current = null
      replayTrailRef.current = null
      setMapReady(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Basemap switch ──
  useEffect(() => {
    if (!mapRef.current || !window.L) return
    if (currentBasemapRef.current === basemap) return

    const L = window.L
    const map = mapRef.current
    const config = BASEMAPS[basemap]

    // Remove old tile layer
    if (tileLayerRef.current && map.hasLayer(tileLayerRef.current)) {
      map.removeLayer(tileLayerRef.current)
    }

    // Add new tile layer
    tileLayerRef.current = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      keepBuffer: 3,
    }).addTo(map)
    currentBasemapRef.current = basemap

    // Update container class for CSS filter overrides
    const el = mapContainerRef.current
    if (el) {
      Object.values(BASEMAPS).forEach(({ className }) => el.classList.remove(className))
      el.classList.add(config.className)
    }
  }, [basemap])

  // ── Draw KML course route ──
  useEffect(() => {
    if (!mapReady || !routeLayerRef.current || !window.L) return
    if (routePoints.length < 2) return

    const L = window.L
    const map = mapRef.current
    routeLayerRef.current.clearLayers()

    const latLngs = routePoints.map((p) => [p.lat, p.lng])

    // Glow line
    L.polyline(latLngs, {
      color: GOLD,
      weight: 10,
      opacity: 0.16,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: false,
    }).addTo(routeLayerRef.current)

    // Course line
    const coursePath = L.polyline(latLngs, {
      color: GOLD,
      weight: 4,
      opacity: 0.92,
      lineCap: 'round',
      lineJoin: 'round',
      className: 'marathon-course-line',
    }).addTo(routeLayerRef.current)

    // Start marker
    L.marker(latLngs[0], {
      icon: L.divIcon({
        className: 'course-marker-container course-marker-start',
        html: '<div class="course-marker"><span>S</span></div>',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      }),
      zIndexOffset: 700,
    }).bindTooltip('Start', { direction: 'top', offset: [0, -14], className: 'course-tooltip' })
      .addTo(routeLayerRef.current)

    // Finish marker
    L.marker(latLngs[latLngs.length - 1], {
      icon: L.divIcon({
        className: 'course-marker-container course-marker-finish',
        html: '<div class="course-marker"><span>F</span></div>',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      }),
      zIndexOffset: 700,
    }).bindTooltip('Finish', { direction: 'top', offset: [0, -14], className: 'course-tooltip' })
      .addTo(routeLayerRef.current)

    map.fitBounds(coursePath.getBounds(), { padding: [36, 36], maxZoom: 13 })
  }, [mapReady, routePoints])

  // ── find closest KML index to a fractional progress ──
  const idxFromProgress = useCallback(
    (progress) => {
      if (!profile) return 0
      const targetKm = progress * profile.totalKm
      let closest = 0, closestDiff = Infinity
      for (let i = 0; i < profile.pts.length; i++) {
        const diff = Math.abs(profile.pts[i].distanceKm - targetKm)
        if (diff < closestDiff) { closestDiff = diff; closest = i }
      }
      return closest
    },
    [profile]
  )

  // ── Elevation chart: draw ──
  const drawElevation = useCallback(
    (activeIdx) => {
      const canvas = elevCanvasRef.current
      if (!canvas || !profile) return
      const ctx = canvas.getContext('2d')
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.parentElement.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)

      const { pts, totalKm, minE, elevRange } = profile
      const padTop = 20, padBot = 28
      const plotH = h - padTop - padBot

      const toX = (km) => (km / totalKm) * w
      const toY = (elev) => padTop + (1 - (elev - minE) / elevRange) * plotH

      // Filled area
      ctx.beginPath()
      ctx.moveTo(0, h - padBot)
      pts.forEach((pt) => {
        if (pt.elevation != null) ctx.lineTo(toX(pt.distanceKm), toY(pt.elevation))
      })
      ctx.lineTo(toX(pts[pts.length - 1].distanceKm), h - padBot)
      ctx.closePath()
      const areaGrad = ctx.createLinearGradient(0, padTop, 0, h - padBot)
      areaGrad.addColorStop(0, 'rgba(168,142,93,0.18)')
      areaGrad.addColorStop(0.5, 'rgba(168,142,93,0.08)')
      areaGrad.addColorStop(1, 'rgba(168,142,93,0.02)')
      ctx.fillStyle = areaGrad
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
        const travGrad = ctx.createLinearGradient(0, padTop, 0, h - padBot)
        travGrad.addColorStop(0, 'rgba(168,142,93,0.35)')
        travGrad.addColorStop(1, 'rgba(168,142,93,0.05)')
        ctx.fillStyle = travGrad
        ctx.fill()
      }

      // Elevation line segments
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1], curr = pts[i]
        if (prev.elevation == null || curr.elevation == null) continue
        const t = (curr.elevation - minE) / elevRange
        const isActive = activeIdx != null && i <= activeIdx
        ctx.beginPath()
        ctx.moveTo(toX(prev.distanceKm), toY(prev.elevation))
        ctx.lineTo(toX(curr.distanceKm), toY(curr.elevation))
        ctx.lineWidth = isActive ? 3 : 2
        ctx.strokeStyle = isActive ? elevationColorBright(t) : `rgba(168,142,93,${activeIdx != null ? 0.25 : 0.55})`
        ctx.lineCap = 'round'
        ctx.stroke()
      }

      // Km ticks
      KM_LABELS.forEach((km) => {
        if (km > totalKm) return
        const x = toX(km)
        ctx.beginPath()
        ctx.moveTo(x, h - padBot)
        ctx.lineTo(x, h - padBot + 5)
        ctx.strokeStyle = 'rgba(245,243,236,0.15)'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.font = 'bold 8px Montserrat, sans-serif'
        ctx.fillStyle = 'rgba(245,243,236,0.25)'
        ctx.textAlign = 'center'
        ctx.fillText(km === 42.2 ? '42.2' : `${km}`, x, h - padBot + 16)
      })

      // Elevation grid lines
      const eTicks = 5
      for (let i = 0; i <= eTicks; i++) {
        const y = toY(minE + (elevRange / eTicks) * i)
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.strokeStyle = 'rgba(245,243,236,0.04)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Cursor line + dot
      if (activeIdx != null && pts[activeIdx]) {
        const pt = pts[activeIdx]
        const x = toX(pt.distanceKm)
        ctx.beginPath()
        ctx.moveTo(x, padTop)
        ctx.lineTo(x, h - padBot)
        ctx.strokeStyle = 'rgba(245,243,236,0.2)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.stroke()
        ctx.setLineDash([])

        if (pt.elevation != null) {
          const y = toY(pt.elevation)
          ctx.beginPath()
          ctx.arc(x, y, 5, 0, Math.PI * 2)
          ctx.fillStyle = WHITE
          ctx.fill()
          ctx.lineWidth = 2
          ctx.strokeStyle = GOLD
          ctx.stroke()
        }
      }
    },
    [profile]
  )

  // ── Hover marker on Leaflet map ──
  const updateHoverMarker = useCallback(
    (idx) => {
      if (!mapRef.current || !window.L || !profile) return
      const L = window.L

      if (idx == null) {
        if (hoverMarkerRef.current) {
          mapRef.current.removeLayer(hoverMarkerRef.current)
          hoverMarkerRef.current = null
        }
        return
      }

      const pt = profile.pts[idx]
      if (!pt) return
      const latLng = [pt.lat, pt.lng]

      if (!hoverMarkerRef.current) {
        hoverMarkerRef.current = L.circleMarker(latLng, {
          radius: 7,
          color: GOLD,
          fillColor: WHITE,
          fillOpacity: 1,
          weight: 2,
          pane: 'markerPane',
        }).addTo(mapRef.current)
      } else {
        hoverMarkerRef.current.setLatLng(latLng)
      }
    },
    [profile]
  )

  // ── Elevation hover interaction ──
  const handleElevHover = useCallback(
    (e) => {
      if (!profile || !elevWrapRef.current) return
      const rect = elevWrapRef.current.getBoundingClientRect()
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
      const progress = clamp(x / rect.width, 0, 1)
      const idx = idxFromProgress(progress)
      setHoverIdx(idx)
      updateHoverMarker(idx)
    },
    [profile, idxFromProgress, updateHoverMarker]
  )

  const handleElevLeave = useCallback(() => {
    if (replayState !== 'idle') return // don't clear during replay
    setHoverIdx(null)
    updateHoverMarker(null)
  }, [replayState, updateHoverMarker])

  // ── Draw elevation on hover/replay change ──
  useEffect(() => {
    drawElevation(hoverIdx)
  }, [hoverIdx, drawElevation])

  // ── Resize ──
  useEffect(() => {
    const onResize = () => {
      drawElevation(hoverIdx)
      if (mapRef.current) setTimeout(() => mapRef.current.invalidateSize(), 100)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [drawElevation, hoverIdx])

  // ── Replay: interpolate position along GPS points ──
  const getReplayPosition = useCallback(
    (progress) => {
      if (!replayPoints.length) return null
      const startTime = replayPoints[0].time
      const endTime = replayPoints[replayPoints.length - 1].time
      const targetTime = startTime + progress * (endTime - startTime)

      let i = 0
      while (i < replayPoints.length - 1 && replayPoints[i + 1].time < targetTime) i++
      if (i >= replayPoints.length - 1) return replayPoints[replayPoints.length - 1]

      const a = replayPoints[i]
      const b = replayPoints[i + 1]
      const segDuration = b.time - a.time
      const t = segDuration > 0 ? (targetTime - a.time) / segDuration : 0

      return {
        lat: lerp(a.lat, b.lat, t),
        lng: lerp(a.lng, b.lng, t),
        time: targetTime,
        pointIdx: i,
      }
    },
    [replayPoints]
  )

  // ── Replay: find nearest KML index for elevation sync ──
  const nearestKmlIdx = useCallback(
    (lat, lng) => {
      if (!profile) return null
      let best = 0, bestDist = Infinity
      for (let i = 0; i < profile.pts.length; i++) {
        const d = (profile.pts[i].lat - lat) ** 2 + (profile.pts[i].lng - lng) ** 2
        if (d < bestDist) { bestDist = d; best = i }
      }
      return best
    },
    [profile]
  )

  // ── Replay: update markers on map ──
  const updateReplayVisuals = useCallback(
    (pos, progress) => {
      if (!mapRef.current || !window.L || !pos) return
      const L = window.L
      const map = mapRef.current

      // Nicole marker
      if (!replayMarkerRef.current) {
        replayMarkerRef.current = L.marker([pos.lat, pos.lng], {
          icon: L.divIcon({
            className: 'nicole-marker-container',
            html: `<div class="nicole-marker">
              <div class="nicole-marker-pulse"></div>
              <div class="nicole-marker-pin">
                <img class="nicole-marker-img" src="/images/lores/portrait-smile.jpg" alt="Nicole" />
              </div>
              <div class="nicole-marker-shadow"></div>
            </div>`,
            iconSize: [52, 68],
            iconAnchor: [26, 62],
          }),
          zIndexOffset: 1000,
        }).addTo(map)
      } else {
        replayMarkerRef.current.setLatLng([pos.lat, pos.lng])
      }

      // Trail line — draw traversed GPS points
      if (replayTrailRef.current) {
        replayTrailRef.current.clearLayers()
        const trailLatLngs = []
        for (let i = 0; i <= pos.pointIdx && i < replayPoints.length; i++) {
          trailLatLngs.push([replayPoints[i].lat, replayPoints[i].lng])
        }
        trailLatLngs.push([pos.lat, pos.lng])

        if (trailLatLngs.length > 1) {
          L.polyline(trailLatLngs, {
            color: WARM,
            weight: 4,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(replayTrailRef.current)

          // Glow
          L.polyline(trailLatLngs, {
            color: GOLD,
            weight: 10,
            opacity: 0.12,
            lineCap: 'round',
            lineJoin: 'round',
            interactive: false,
          }).addTo(replayTrailRef.current)
        }
      }

      // Smooth camera follow
      const targetZoom = progress < 0.05 || progress > 0.95 ? 14 : 15
      map.setView([pos.lat, pos.lng], targetZoom, { animate: true, duration: 0.3 })

      // Sync elevation chart
      const kmlIdx = nearestKmlIdx(pos.lat, pos.lng)
      setHoverIdx(kmlIdx)
    },
    [replayPoints, nearestKmlIdx]
  )

  // ── Replay: animation loop ──
  const replayTick = useCallback(() => {
    if (replayState !== 'playing' || !replayDuration) return

    const now = performance.now()
    const elapsed = now - replayStartRef.current
    const replayMs = elapsed * replaySpeed
    const progress = clamp(replayMs / replayDuration, 0, 1)

    setReplayProgress(progress)
    const pos = getReplayPosition(progress)
    updateReplayVisuals(pos, progress)

    if (progress < 1) {
      replayAnimRef.current = requestAnimationFrame(replayTick)
    } else {
      setReplayState('paused')
    }
  }, [replayState, replayDuration, replaySpeed, getReplayPosition, updateReplayVisuals])

  useEffect(() => {
    if (replayState === 'playing') {
      replayAnimRef.current = requestAnimationFrame(replayTick)
    }
    return () => {
      if (replayAnimRef.current) cancelAnimationFrame(replayAnimRef.current)
    }
  }, [replayState, replayTick])

  // ── Replay controls ──
  const startReplay = useCallback(() => {
    if (!hasReplayData) return
    // Clean up previous
    if (replayMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(replayMarkerRef.current)
      replayMarkerRef.current = null
    }
    if (replayTrailRef.current) replayTrailRef.current.clearLayers()

    replayStartRef.current = performance.now()
    replayPausedAtRef.current = 0
    setReplayProgress(0)
    setReplayState('playing')
  }, [hasReplayData])

  const pauseReplay = useCallback(() => {
    replayPausedAtRef.current = performance.now() - replayStartRef.current
    setReplayState('paused')
  }, [])

  const resumeReplay = useCallback(() => {
    replayStartRef.current = performance.now() - replayPausedAtRef.current
    setReplayState('playing')
  }, [])

  const stopReplay = useCallback(() => {
    setReplayState('idle')
    setReplayProgress(0)
    setHoverIdx(null)
    updateHoverMarker(null)
    if (replayMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(replayMarkerRef.current)
      replayMarkerRef.current = null
    }
    if (replayTrailRef.current) replayTrailRef.current.clearLayers()
    // Zoom back to route
    if (mapRef.current && routePoints.length > 1) {
      const latLngs = routePoints.map((p) => [p.lat, p.lng])
      mapRef.current.fitBounds(window.L.latLngBounds(latLngs), { padding: [36, 36], maxZoom: 13, duration: 1 })
    }
  }, [routePoints, updateHoverMarker])

  // ── Replay scrub bar click ──
  const handleScrubClick = useCallback(
    (e) => {
      if (!hasReplayData || replayState === 'idle') return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const progress = clamp(x / rect.width, 0, 1)

      setReplayProgress(progress)
      const pos = getReplayPosition(progress)
      updateReplayVisuals(pos, progress)

      // Adjust timing reference so animation continues from here
      replayPausedAtRef.current = (progress * replayDuration) / replaySpeed
      replayStartRef.current = performance.now() - replayPausedAtRef.current
    },
    [hasReplayData, replayState, replayDuration, replaySpeed, getReplayPosition, updateReplayVisuals]
  )

  // ── Active point data ──
  const activePoint = profile && hoverIdx != null ? profile.pts[hoverIdx] : null

  // Replay elapsed display
  const replayElapsed = replayDuration ? replayProgress * replayDuration : 0

  // ── Loading state ──
  if (isLoading) {
    return (
      <section className="explorer-wrapper">
        <div className="explorer-loading">
          <div className="explorer-loading-spinner" />
          <span className="explorer-loading-text">Loading course data</span>
        </div>
      </section>
    )
  }

  if (!profile) return null

  return (
    <section className="explorer-wrapper">
      {/* Header */}
      <div className="explorer-header">
        <div>
          <p className="explorer-kicker">Queenstown Marathon</p>
          <h2 className="explorer-title">Explore the course</h2>
          <p className="explorer-subtitle">
            {hasReplayData
              ? 'Replay Nicole\'s actual run or scrub the elevation to explore every metre.'
              : 'Hover the elevation profile to explore the marathon route in detail.'
            }
          </p>
        </div>
        <div className="explorer-stats">
          <span className="explorer-stat-badge">{profile.totalKm.toFixed(1)} km</span>
          <span className="explorer-stat-badge">{Math.round(profile.minE)}–{Math.round(profile.maxE)} m</span>
          <span className="explorer-stat-badge">+{Math.round(profile.gain)} m gain</span>
        </div>
      </div>

      {/* Tooltip */}
      <div className="explorer-tooltip" style={{ opacity: activePoint ? 1 : 0, transform: activePoint ? 'translateY(0)' : 'translateY(6px)' }}>
        <span className="explorer-tooltip-elev">
          {activePoint?.elevation != null ? `${Math.round(activePoint.elevation)} m` : '—'}
        </span>
        <span className="explorer-tooltip-dist">
          {activePoint ? `${activePoint.distanceKm.toFixed(1)} km` : ''}
        </span>
        <span className="explorer-tooltip-coord">
          {activePoint ? `${activePoint.lat.toFixed(4)}, ${activePoint.lng.toFixed(4)}` : ''}
        </span>
      </div>

      {/* Map */}
      <div className="explorer-map-container">
        <div
          ref={mapContainerRef}
          className={`explorer-map ${BASEMAPS[basemap].className}`}
        />

        {/* Basemap toggle */}
        <div className="explorer-basemap-toggle">
          {Object.entries(BASEMAPS).map(([key, config]) => (
            <button
              key={key}
              className={`explorer-basemap-btn ${basemap === key ? 'active' : ''}`}
              onClick={() => setBasemap(key)}
            >
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* Replay controls */}
      {hasReplayData && (
        <div className="explorer-replay-bar">
          <div className="explorer-replay-controls">
            {replayState === 'idle' && (
              <button className="explorer-replay-btn play" onClick={startReplay}>
                <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21" /></svg>
                <span>Replay Run</span>
              </button>
            )}
            {replayState === 'playing' && (
              <button className="explorer-replay-btn" onClick={pauseReplay}>
                <svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18" /><rect x="15" y="3" width="4" height="18" /></svg>
                <span>Pause</span>
              </button>
            )}
            {replayState === 'paused' && (
              <>
                <button className="explorer-replay-btn play" onClick={resumeReplay}>
                  <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21" /></svg>
                  <span>Resume</span>
                </button>
                <button className="explorer-replay-btn stop" onClick={stopReplay}>
                  <svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
                  <span>Stop</span>
                </button>
              </>
            )}

            {/* Speed selector */}
            {replayState !== 'idle' && (
              <div className="explorer-speed-selector">
                {REPLAY_SPEED_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`explorer-speed-btn ${replaySpeed === opt.value ? 'active' : ''}`}
                    onClick={() => {
                      const oldSpeed = replaySpeed
                      const elapsed = performance.now() - replayStartRef.current
                      // Adjust start time to maintain position at new speed
                      replayStartRef.current = performance.now() - (elapsed * oldSpeed) / opt.value
                      setReplaySpeed(opt.value)
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scrub bar */}
          {replayState !== 'idle' && (
            <div className="explorer-scrub-wrap">
              <div className="explorer-scrub-bar" onClick={handleScrubClick}>
                <div className="explorer-scrub-fill" style={{ width: `${replayProgress * 100}%` }} />
                <div className="explorer-scrub-handle" style={{ left: `${replayProgress * 100}%` }} />
              </div>
              <div className="explorer-scrub-labels">
                <span>{formatDuration(replayElapsed)}</span>
                <span>{formatDuration(replayDuration)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Elevation chart */}
      <div
        ref={elevWrapRef}
        className="explorer-elev-wrap"
        onMouseMove={handleElevHover}
        onTouchMove={handleElevHover}
        onMouseLeave={handleElevLeave}
      >
        <canvas ref={elevCanvasRef} className="explorer-canvas" />
        <div className="explorer-elev-label">Elevation Profile</div>
      </div>

      {/* Legend */}
      <div className="explorer-legend">
        <div className="explorer-legend-gradient">
          <span className="explorer-legend-label">{Math.round(profile.minE)} m</span>
          <div className="explorer-legend-bar" />
          <span className="explorer-legend-label">{Math.round(profile.maxE)} m</span>
        </div>
        <span className="explorer-legend-caption">Colour encodes elevation · Interact anywhere to explore</span>
      </div>
    </section>
  )
}
