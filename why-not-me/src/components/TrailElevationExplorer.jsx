import { useState, useRef, useEffect, useMemo, useCallback } from "react";

/*
 * TrailElevationExplorer
 * ──────────────────────
 * A unified interactive trail path + elevation profile.
 *
 * The map IS the elevation chart — a single canvas draws the route
 * as a 3D-ish ribbon whose vertical position encodes altitude.
 * Hover/drag anywhere to scrub through the marathon. The elevation
 * chart below acts as a synchronized scrub bar.
 *
 * Paste this into your site as a drop-in replacement for the
 * separate static SVG elevation panel + static trail display.
 */

// ── helpers ──────────────────────────────────────────────────────
function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function parseKmlRoute(kmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlText, "application/xml");
  const lineStrings = Array.from(doc.getElementsByTagName("LineString"));
  const routeLine =
    lineStrings.find((l) => l.getAttribute("id") === "Route") || lineStrings[0];
  const coordsNode = routeLine?.getElementsByTagName("coordinates")?.[0];
  if (!coordsNode?.textContent) return [];

  return coordsNode.textContent
    .trim()
    .split(/\s+/)
    .map((pt) => {
      const [lng, lat, elevation] = pt.split(",").map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng, elevation: Number.isFinite(elevation) ? elevation : null };
    })
    .filter(Boolean);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// ── colours ──────────────────────────────────────────────────────
const GOLD = "#A88E5D";
const WARM = "#CBB299";
const WHITE = "#F5F3EC";
const BLACK = "#0D0D0D";

// elevation-based gradient stops
function elevationColor(t) {
  // t = 0 (lowest) → dark teal, t = 1 (highest) → bright gold
  const r = Math.round(lerp(42, 200, t));
  const g = Math.round(lerp(62, 168, t));
  const b = Math.round(lerp(55, 78, t));
  return `rgb(${r},${g},${b})`;
}

function elevationColorBright(t) {
  const r = Math.round(lerp(85, 245, t));
  const g = Math.round(lerp(120, 220, t));
  const b = Math.round(lerp(100, 140, t));
  return `rgb(${r},${g},${b})`;
}

// ── process route data ──────────────────────────────────────────
function buildProfile(routePoints) {
  let dist = 0;
  let minE = Infinity,
    maxE = -Infinity,
    gain = 0,
    loss = 0;
  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;
  let prev = null;

  const pts = routePoints.map((pt, i) => {
    if (i > 0) dist += haversineKm(routePoints[i - 1], pt);
    if (pt.elevation != null) {
      if (prev != null) {
        const d = pt.elevation - prev;
        if (d > 0) gain += d;
        else loss -= d;
      }
      minE = Math.min(minE, pt.elevation);
      maxE = Math.max(maxE, pt.elevation);
      prev = pt.elevation;
    }
    minLat = Math.min(minLat, pt.lat);
    maxLat = Math.max(maxLat, pt.lat);
    minLng = Math.min(minLng, pt.lng);
    maxLng = Math.max(maxLng, pt.lng);
    return { ...pt, distanceKm: dist };
  });

  const totalKm = dist;
  const elevRange = maxE - minE || 1;

  return {
    pts,
    totalKm,
    minE,
    maxE,
    gain,
    loss,
    elevRange,
    bounds: { minLat, maxLat, minLng, maxLng },
  };
}

// km markers
const KM_LABELS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 42.2];

// ── main component ──────────────────────────────────────────────
export default function TrailElevationExplorer() {
  const [routePoints, setRoutePoints] = useState([]);
  const [hoverIdx, setHoverIdx] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const mapCanvasRef = useRef(null);
  const elevCanvasRef = useRef(null);
  const elevWrapRef = useRef(null);
  const mapWrapRef = useRef(null);
  const animFrameRef = useRef(null);

  // load KML
  useEffect(() => {
    fetch("/data/queenstown-marathon.kml")
      .then((r) => r.text())
      .then((kml) => {
        setRoutePoints(parseKmlRoute(kml));
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const profile = useMemo(
    () => (routePoints.length > 2 ? buildProfile(routePoints) : null),
    [routePoints]
  );

  // ── find closest index to a fractional progress ──
  const idxFromProgress = useCallback(
    (progress) => {
      if (!profile) return 0;
      const targetKm = progress * profile.totalKm;
      let closest = 0;
      let closestDiff = Infinity;
      for (let i = 0; i < profile.pts.length; i++) {
        const diff = Math.abs(profile.pts[i].distanceKm - targetKm);
        if (diff < closestDiff) {
          closestDiff = diff;
          closest = i;
        }
      }
      return closest;
    },
    [profile]
  );

  // ── map projection ──
  const projectMap = useCallback(
    (pt, w, h, bounds, pad = 28) => {
      const { minLat, maxLat, minLng, maxLng } = bounds;
      const latRange = maxLat - minLat || 0.001;
      const lngRange = maxLng - minLng || 0.001;
      // correct aspect ratio with cos(midLat)
      const midLat = (minLat + maxLat) / 2;
      const cosLat = Math.cos((midLat * Math.PI) / 180);
      const effectiveLngRange = lngRange * cosLat;

      const scaleX = (w - pad * 2) / effectiveLngRange;
      const scaleY = (h - pad * 2) / latRange;
      const scale = Math.min(scaleX, scaleY);

      const cx = w / 2;
      const cy = h / 2;
      const midLng = (minLng + maxLng) / 2;

      const x = cx + (pt.lng - midLng) * cosLat * scale;
      const y = cy - (pt.lat - midLat) * scale;
      return { x, y };
    },
    []
  );

  // ── draw map canvas ──
  const drawMap = useCallback(
    (activeIdx) => {
      const canvas = mapCanvasRef.current;
      if (!canvas || !profile) return;
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, w, h);

      const { pts, bounds, minE, elevRange } = profile;

      // subtle grid
      ctx.strokeStyle = "rgba(168,142,93,0.04)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        const x = (w / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
        const y = (h / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // draw trail shadow
      ctx.beginPath();
      ctx.lineWidth = 8;
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      pts.forEach((pt, i) => {
        const { x, y } = projectMap(pt, w, h, bounds);
        if (i === 0) ctx.moveTo(x, y + 2);
        else ctx.lineTo(x, y + 2);
      });
      ctx.stroke();

      // draw trail — segment-by-segment with elevation color
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        const p1 = projectMap(prev, w, h, bounds);
        const p2 = projectMap(curr, w, h, bounds);

        const t =
          curr.elevation != null
            ? (curr.elevation - minE) / elevRange
            : 0.5;

        const isBeforeActive = activeIdx != null && i <= activeIdx;
        const alpha = isBeforeActive ? 1 : activeIdx != null ? 0.2 : 0.75;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineWidth = isBeforeActive ? 4 : 2.5;
        ctx.strokeStyle = isBeforeActive
          ? elevationColorBright(t)
          : `rgba(168,142,93,${alpha * 0.65})`;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      // traversed glow
      if (activeIdx != null && activeIdx > 0) {
        ctx.beginPath();
        ctx.lineWidth = 10;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (let i = 0; i <= activeIdx && i < pts.length; i++) {
          const { x, y } = projectMap(pts[i], w, h, bounds);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "rgba(168,142,93,0.12)";
        ctx.stroke();
      }

      // start marker
      const sp = projectMap(pts[0], w, h, bounds);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#55604D";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = WHITE;
      ctx.stroke();
      ctx.font = "bold 7px Montserrat, sans-serif";
      ctx.fillStyle = WHITE;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("S", sp.x, sp.y + 0.5);

      // finish marker
      const fp = projectMap(pts[pts.length - 1], w, h, bounds);
      ctx.beginPath();
      ctx.arc(fp.x, fp.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = GOLD;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = WHITE;
      ctx.stroke();
      ctx.font = "bold 7px Montserrat, sans-serif";
      ctx.fillStyle = BLACK;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("F", fp.x, fp.y + 0.5);

      // active position marker
      if (activeIdx != null && pts[activeIdx]) {
        const apt = pts[activeIdx];
        const { x, y } = projectMap(apt, w, h, bounds);

        // outer glow
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 24);
        grad.addColorStop(0, "rgba(168,142,93,0.35)");
        grad.addColorStop(1, "rgba(168,142,93,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(x - 24, y - 24, 48, 48);

        // pulsing ring
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(168,142,93,0.4)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // dot
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = WHITE;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = GOLD;
        ctx.stroke();
      }

      // km labels along route
      const labelKms = [5, 10, 15, 20, 25, 30, 35, 40];
      labelKms.forEach((km) => {
        const idx = pts.findIndex((p) => p.distanceKm >= km);
        if (idx < 0) return;
        const { x, y } = projectMap(pts[idx], w, h, bounds);
        ctx.font = "bold 8px Montserrat, sans-serif";
        ctx.fillStyle = "rgba(245,243,236,0.3)";
        ctx.textAlign = "center";
        ctx.fillText(`${km}`, x, y - 12);
      });
    },
    [profile, projectMap]
  );

  // ── draw elevation chart ──
  const drawElevation = useCallback(
    (activeIdx) => {
      const canvas = elevCanvasRef.current;
      if (!canvas || !profile) return;
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, w, h);

      const { pts, totalKm, minE, maxE, elevRange } = profile;
      const padL = 0;
      const padR = 0;
      const padTop = 20;
      const padBot = 28;
      const plotW = w - padL - padR;
      const plotH = h - padTop - padBot;

      const toX = (km) => padL + (km / totalKm) * plotW;
      const toY = (elev) =>
        padTop + (1 - (elev - minE) / elevRange) * plotH;

      // filled area — gradient by elevation
      ctx.beginPath();
      ctx.moveTo(toX(0), h - padBot);
      pts.forEach((pt) => {
        if (pt.elevation != null) ctx.lineTo(toX(pt.distanceKm), toY(pt.elevation));
      });
      ctx.lineTo(toX(pts[pts.length - 1].distanceKm), h - padBot);
      ctx.closePath();

      const areaGrad = ctx.createLinearGradient(0, padTop, 0, h - padBot);
      areaGrad.addColorStop(0, "rgba(168,142,93,0.18)");
      areaGrad.addColorStop(0.5, "rgba(168,142,93,0.08)");
      areaGrad.addColorStop(1, "rgba(168,142,93,0.02)");
      ctx.fillStyle = areaGrad;
      ctx.fill();

      // traversed fill
      if (activeIdx != null && activeIdx > 0) {
        ctx.beginPath();
        ctx.moveTo(toX(0), h - padBot);
        for (let i = 0; i <= activeIdx && i < pts.length; i++) {
          const pt = pts[i];
          if (pt.elevation != null)
            ctx.lineTo(toX(pt.distanceKm), toY(pt.elevation));
        }
        const lastPt = pts[Math.min(activeIdx, pts.length - 1)];
        ctx.lineTo(toX(lastPt.distanceKm), h - padBot);
        ctx.closePath();

        const travGrad = ctx.createLinearGradient(0, padTop, 0, h - padBot);
        travGrad.addColorStop(0, "rgba(168,142,93,0.35)");
        travGrad.addColorStop(1, "rgba(168,142,93,0.05)");
        ctx.fillStyle = travGrad;
        ctx.fill();
      }

      // elevation line — segment colored by elevation
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        if (prev.elevation == null || curr.elevation == null) continue;

        const t = (curr.elevation - minE) / elevRange;
        const isActive = activeIdx != null && i <= activeIdx;

        ctx.beginPath();
        ctx.moveTo(toX(prev.distanceKm), toY(prev.elevation));
        ctx.lineTo(toX(curr.distanceKm), toY(curr.elevation));
        ctx.lineWidth = isActive ? 3 : 2;
        ctx.strokeStyle = isActive
          ? elevationColorBright(t)
          : `rgba(168,142,93,${activeIdx != null ? 0.25 : 0.55})`;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      // active line glow
      if (activeIdx != null && pts[activeIdx]?.elevation != null) {
        ctx.beginPath();
        ctx.lineWidth = 8;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (let i = 0; i <= activeIdx && i < pts.length; i++) {
          const pt = pts[i];
          if (pt.elevation == null) continue;
          if (i === 0) ctx.moveTo(toX(pt.distanceKm), toY(pt.elevation));
          else ctx.lineTo(toX(pt.distanceKm), toY(pt.elevation));
        }
        ctx.strokeStyle = "rgba(168,142,93,0.10)";
        ctx.stroke();
      }

      // km tick marks
      KM_LABELS.forEach((km) => {
        if (km > totalKm) return;
        const x = toX(km);
        ctx.beginPath();
        ctx.moveTo(x, h - padBot);
        ctx.lineTo(x, h - padBot + 5);
        ctx.strokeStyle = "rgba(245,243,236,0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = "bold 8px Montserrat, sans-serif";
        ctx.fillStyle = "rgba(245,243,236,0.25)";
        ctx.textAlign = "center";
        ctx.fillText(km === 42.2 ? "42.2" : `${km}`, x, h - padBot + 16);
      });

      // elevation axis labels
      const eTicks = 5;
      for (let i = 0; i <= eTicks; i++) {
        const elev = minE + (elevRange / eTicks) * i;
        const y = toY(elev);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(w - padR, y);
        ctx.strokeStyle = "rgba(245,243,236,0.04)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // cursor line + info tooltip
      if (activeIdx != null && pts[activeIdx]) {
        const pt = pts[activeIdx];
        const x = toX(pt.distanceKm);

        // vertical cursor
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, h - padBot);
        ctx.strokeStyle = "rgba(245,243,236,0.2)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        if (pt.elevation != null) {
          const y = toY(pt.elevation);

          // dot on line
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fillStyle = WHITE;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = GOLD;
          ctx.stroke();
        }
      }
    },
    [profile]
  );

  // ── unified draw ──
  const draw = useCallback(
    (idx) => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(() => {
        drawMap(idx);
        drawElevation(idx);
      });
    },
    [drawMap, drawElevation]
  );

  // redraw on changes
  useEffect(() => {
    draw(hoverIdx);
  }, [hoverIdx, draw]);

  // resize handler
  useEffect(() => {
    const onResize = () => draw(hoverIdx);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw, hoverIdx]);

  // ── interaction handlers ──
  const handleElevInteraction = useCallback(
    (e) => {
      if (!profile || !elevWrapRef.current) return;
      const rect = elevWrapRef.current.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const progress = clamp(x / rect.width, 0, 1);
      setHoverIdx(idxFromProgress(progress));
    },
    [profile, idxFromProgress]
  );

  const handleMapInteraction = useCallback(
    (e) => {
      if (!profile || !mapWrapRef.current) return;
      const canvas = mapCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const my = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      const w = rect.width;
      const h = rect.height;

      // find nearest point on map
      let bestIdx = 0;
      let bestDist = Infinity;
      profile.pts.forEach((pt, i) => {
        const { x, y } = projectMap(pt, w, h, profile.bounds);
        const d = (mx - x) ** 2 + (my - y) ** 2;
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      });
      if (bestDist < 2500) setHoverIdx(bestIdx);
    },
    [profile, projectMap]
  );

  const stopDrag = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mouseup", stopDrag);
      window.addEventListener("touchend", stopDrag);
      return () => {
        window.removeEventListener("mouseup", stopDrag);
        window.removeEventListener("touchend", stopDrag);
      };
    }
  }, [isDragging, stopDrag]);

  // active point data
  const activePoint =
    profile && hoverIdx != null ? profile.pts[hoverIdx] : null;

  const gradientPercent =
    profile && activePoint
      ? ((activePoint.elevation - profile.minE) / profile.elevRange) * 100
      : 0;

  if (isLoading) {
    return (
      <section style={styles.wrapper}>
        <div style={styles.loading}>
          <div style={styles.loadingSpinner} />
          <span style={styles.loadingText}>Loading course data</span>
        </div>
      </section>
    );
  }

  if (!profile) return null;

  return (
    <section style={styles.wrapper}>
      {/* header */}
      <div style={styles.header}>
        <div>
          <p style={styles.kicker}>Queenstown Marathon</p>
          <h2 style={styles.title}>Explore the course</h2>
          <p style={styles.subtitle}>
            Scrub across the elevation profile or hover the trail to explore every
            metre of the marathon route. The map and chart move together.
          </p>
        </div>
        <div style={styles.statsRow}>
          <span style={styles.statBadge}>
            {profile.totalKm.toFixed(1)} km
          </span>
          <span style={styles.statBadge}>
            {Math.round(profile.minE)}–{Math.round(profile.maxE)} m
          </span>
          <span style={styles.statBadge}>
            +{Math.round(profile.gain)} m gain
          </span>
          <span style={styles.statBadge}>
            −{Math.round(profile.loss)} m loss
          </span>
        </div>
      </div>

      {/* tooltip */}
      <div
        style={{
          ...styles.tooltip,
          opacity: activePoint ? 1 : 0,
          transform: activePoint ? "translateY(0)" : "translateY(6px)",
        }}
      >
        <div style={styles.tooltipInner}>
          <span style={styles.tooltipElev}>
            {activePoint?.elevation != null
              ? `${Math.round(activePoint.elevation)} m`
              : "—"}
          </span>
          <span style={styles.tooltipDist}>
            {activePoint
              ? `${activePoint.distanceKm.toFixed(1)} km`
              : ""}
          </span>
          <span style={styles.tooltipCoord}>
            {activePoint
              ? `${activePoint.lat.toFixed(4)}, ${activePoint.lng.toFixed(4)}`
              : ""}
          </span>
        </div>
        <div
          style={{
            ...styles.tooltipBar,
            background: `linear-gradient(90deg, ${elevationColorBright(0)} 0%, ${elevationColorBright(1)} 100%)`,
          }}
        >
          <div
            style={{
              ...styles.tooltipBarFill,
              width: `${gradientPercent}%`,
            }}
          />
        </div>
      </div>

      {/* map canvas */}
      <div
        ref={mapWrapRef}
        style={styles.mapWrap}
        onMouseMove={(e) => {
          if (isDragging) handleMapInteraction(e);
          else handleMapInteraction(e);
        }}
        onMouseDown={(e) => {
          setIsDragging(true);
          handleMapInteraction(e);
        }}
        onTouchStart={(e) => {
          setIsDragging(true);
          handleMapInteraction(e);
        }}
        onTouchMove={handleMapInteraction}
        onMouseLeave={() => {
          if (!isDragging) setHoverIdx(null);
        }}
      >
        <canvas ref={mapCanvasRef} style={styles.canvas} />
        <div style={styles.mapLabel}>Trail Map</div>
      </div>

      {/* elevation chart */}
      <div
        ref={elevWrapRef}
        style={styles.elevWrap}
        onMouseMove={(e) => handleElevInteraction(e)}
        onMouseDown={(e) => {
          setIsDragging(true);
          handleElevInteraction(e);
        }}
        onTouchStart={(e) => {
          setIsDragging(true);
          handleElevInteraction(e);
        }}
        onTouchMove={handleElevInteraction}
        onMouseLeave={() => {
          if (!isDragging) setHoverIdx(null);
        }}
      >
        <canvas ref={elevCanvasRef} style={styles.canvas} />
        <div style={styles.elevLabel}>Elevation Profile</div>
      </div>

      {/* legend */}
      <div style={styles.legend}>
        <div style={styles.legendGradient}>
          <span style={styles.legendLabelLeft}>{Math.round(profile.minE)} m</span>
          <div style={styles.legendBar} />
          <span style={styles.legendLabelRight}>{Math.round(profile.maxE)} m</span>
        </div>
        <span style={styles.legendCaption}>
          Colour encodes elevation — interact anywhere to explore
        </span>
      </div>
    </section>
  );
}

// ── styles ──────────────────────────────────────────────────────
const styles = {
  wrapper: {
    padding: "46px 40px 32px",
    background:
      "radial-gradient(ellipse at 50% 0%, rgba(168,142,93,0.08), transparent 62%), #0D0D0D",
    borderTop: "1px solid rgba(168,142,93,0.1)",
    fontFamily: "'Montserrat', sans-serif",
    color: "#F5F3EC",
    userSelect: "none",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: 300,
    gap: 16,
  },
  loadingSpinner: {
    width: 28,
    height: 28,
    border: "2px solid rgba(168,142,93,0.15)",
    borderTopColor: GOLD,
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: "rgba(245,243,236,0.3)",
    fontWeight: 700,
  },
  header: {
    maxWidth: 1180,
    margin: "0 auto 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: 16,
  },
  kicker: {
    color: GOLD,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: {
    fontFamily: "'Damion', cursive",
    fontSize: "clamp(28px, 4vw, 48px)",
    lineHeight: 1,
    margin: "0 0 8px",
    color: WHITE,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 1.7,
    color: "rgba(245,243,236,0.45)",
    maxWidth: 480,
  },
  statsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
  statBadge: {
    padding: "8px 10px",
    borderRadius: 999,
    background: "rgba(168,142,93,0.1)",
    border: "1px solid rgba(168,142,93,0.13)",
    color: "rgba(245,243,236,0.7)",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  tooltip: {
    maxWidth: 1180,
    margin: "0 auto 12px",
    transition: "opacity 0.2s, transform 0.2s",
    pointerEvents: "none",
  },
  tooltipInner: {
    display: "flex",
    alignItems: "baseline",
    gap: 16,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  tooltipElev: {
    fontSize: 28,
    fontWeight: 700,
    color: WHITE,
    fontFamily: "'Montserrat', sans-serif",
  },
  tooltipDist: {
    fontSize: 14,
    fontWeight: 700,
    color: GOLD,
    letterSpacing: 1,
  },
  tooltipCoord: {
    fontSize: 11,
    color: "rgba(245,243,236,0.3)",
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },
  tooltipBar: {
    height: 3,
    borderRadius: 2,
    position: "relative",
    overflow: "hidden",
    opacity: 0.6,
  },
  tooltipBarFill: {
    position: "absolute",
    left: 0,
    top: 0,
    height: "100%",
    background: "rgba(245,243,236,0.6)",
    borderRadius: 2,
    transition: "width 0.1s ease-out",
  },
  mapWrap: {
    maxWidth: 1180,
    margin: "0 auto",
    height: 420,
    borderRadius: "14px 14px 0 0",
    background: "rgba(13,13,13,0.68)",
    border: "1px solid rgba(168,142,93,0.1)",
    borderBottom: "none",
    position: "relative",
    cursor: "crosshair",
    overflow: "hidden",
    touchAction: "none",
  },
  elevWrap: {
    maxWidth: 1180,
    margin: "0 auto",
    height: 180,
    borderRadius: "0 0 14px 14px",
    background: "rgba(13,13,13,0.68)",
    border: "1px solid rgba(168,142,93,0.1)",
    borderTop: "1px solid rgba(168,142,93,0.06)",
    position: "relative",
    cursor: "col-resize",
    overflow: "hidden",
    touchAction: "none",
  },
  canvas: {
    display: "block",
    width: "100%",
    height: "100%",
  },
  mapLabel: {
    position: "absolute",
    top: 12,
    left: 14,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: "rgba(245,243,236,0.2)",
    pointerEvents: "none",
  },
  elevLabel: {
    position: "absolute",
    top: 6,
    left: 14,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: "rgba(245,243,236,0.2)",
    pointerEvents: "none",
  },
  legend: {
    maxWidth: 1180,
    margin: "16px auto 0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  legendGradient: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  legendBar: {
    width: 80,
    height: 4,
    borderRadius: 2,
    background: `linear-gradient(90deg, ${elevationColorBright(0)}, ${elevationColorBright(0.5)}, ${elevationColorBright(1)})`,
  },
  legendLabelLeft: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1,
    color: "rgba(245,243,236,0.3)",
  },
  legendLabelRight: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1,
    color: "rgba(245,243,236,0.3)",
  },
  legendCaption: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "rgba(245,243,236,0.18)",
  },
};
