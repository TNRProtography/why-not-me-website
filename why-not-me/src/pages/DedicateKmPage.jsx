/*
 * ============================================================
 * DEDICATE A KILOMETRE PAGE - /dedicate
 * ============================================================
 * Interactive elevation profile of the Queenstown Marathon.
 * 42 claimable km with hover tooltips, confetti celebration,
 * and branded shareable card on claim.
 * ============================================================
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import PageTransition from '../components/PageTransition'
import RevealOnScroll from '../components/RevealOnScroll'
import './DedicateKmPage.css'

const TOTAL_KM = 42

const FINISH_DEDICATION = {
  name: 'Dean',
  dedicatedTo: 'Nicole',
  message: 'You are the strongest person I know and I\'m so incredibly proud of you. I love you always forever.',
}

// Approximate Queenstown Marathon elevation (metres above sea level)
const ELEVATIONS = [
  310, 318, 325, 335, 342, 348, 340, 328, 315, 308,
  312, 322, 338, 352, 368, 375, 378, 382, 388, 382,
  372, 358, 348, 338, 332, 328, 322, 318, 312, 308,
  305, 312, 322, 328, 332, 326, 318, 312, 308, 312,
  318, 310,
]

// ── SVG elevation helpers ─────────────────────────────────────
const SVG_W = 1500
const SVG_H = 320
const PAD_X = 50
const PAD_TOP = 60
const PAD_BOT = 60
const CHART_H = SVG_H - PAD_TOP - PAD_BOT

function getPoints() {
  const minE = Math.min(...ELEVATIONS) - 5
  const maxE = Math.max(...ELEVATIONS) + 5
  const rangeE = maxE - minE
  return ELEVATIONS.map((elev, i) => ({
    km: i + 1,
    x: PAD_X + (i / (TOTAL_KM - 1)) * (SVG_W - PAD_X * 2),
    y: PAD_TOP + CHART_H - ((elev - minE) / rangeE) * CHART_H,
    elev,
  }))
}

function smoothPath(pts) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const cpx = (pts[i].x + pts[i + 1].x) / 2
    d += ` C ${cpx} ${pts[i].y}, ${cpx} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`
  }
  return d
}

function filledPath(pts) {
  const line = smoothPath(pts)
  return line + ` L ${pts[pts.length - 1].x} ${SVG_H - PAD_BOT + 10} L ${pts[0].x} ${SVG_H - PAD_BOT + 10} Z`
}

const POINTS = getPoints()

// ── Confetti ──────────────────────────────────────────────────
function spawnConfetti() {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  const colors = ['#A88E5D', '#CBB299', '#F5F3EC', '#D4B96A', '#8B7748']
  const particles = Array.from({ length: 90 }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 260,
    y: canvas.height / 2 - 40,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 16 - 3,
    w: Math.random() * 8 + 3,
    h: Math.random() * 5 + 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    opacity: 1,
    rot: Math.random() * 360,
    rotV: (Math.random() - 0.5) * 10,
  }))
  let frame = 0
  ;(function tick() {
    if (frame++ > 130) { canvas.remove(); return }
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const p of particles) {
      p.x += p.vx; p.vy += 0.28; p.y += p.vy
      p.opacity = Math.max(0, p.opacity - 0.007)
      p.rot += p.rotV
      if (p.opacity <= 0) continue
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rot * Math.PI) / 180)
      ctx.globalAlpha = p.opacity
      ctx.fillStyle = p.color
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }
    requestAnimationFrame(tick)
  })()
}

// ── Share card generator ──────────────────────────────────────
function fitText(ctx, text, maxWidth, { maxSize, minSize, family, weight = '', style = '' }) {
  for (let size = maxSize; size >= minSize; size -= 2) {
    ctx.font = `${style} ${weight} ${size}px ${family}`.replace(/\s+/g, ' ').trim()
    if (ctx.measureText(text).width <= maxWidth) return size
  }
  return minSize
}

function wrapText(ctx, text, maxWidth, maxLines) {
  const words = text.split(' ')
  const lines = []
  let line = ''

  for (const word of words) {
    const test = `${line}${word} `
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line.trim())
      line = `${word} `
      if (lines.length === maxLines - 1) break
    } else {
      line = test
    }
  }

  if (line.trim() && lines.length < maxLines) lines.push(line.trim())
  return lines
}

async function generateShareCard(km, dedication) {
  const W = 1080, H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#0D0D0D'
  ctx.fillRect(0, 0, W, H)

  // Subtle gradient glow
  const glow = ctx.createRadialGradient(540, 455, 0, 540, 455, 560)
  glow.addColorStop(0, 'rgba(168,142,93,0.14)')
  glow.addColorStop(0.58, 'rgba(168,142,93,0.045)')
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // Gold borders
  ctx.strokeStyle = 'rgba(168,142,93,0.55)'
  ctx.lineWidth = 3
  ctx.strokeRect(28, 28, W - 56, H - 56)
  ctx.strokeStyle = 'rgba(168,142,93,0.18)'
  ctx.lineWidth = 1
  ctx.strokeRect(44, 44, W - 88, H - 88)

  // Load logo
  try {
    const logo = new Image()
    logo.src = '/images/logos/logo-white-transparent.png'
    await new Promise((res, rej) => { logo.onload = res; logo.onerror = rej })
    const lh = 128, lw = logo.width * (lh / logo.height)
    ctx.globalAlpha = 0.95
    ctx.drawImage(logo, (W - lw) / 2, 60, lw, lh)
    ctx.globalAlpha = 1
  } catch { /* logo failed, continue without */ }

  ctx.textAlign = 'center'

  ctx.fillStyle = '#A88E5D'
  fitText(ctx, `Km ${km}`, 760, { maxSize: 136, minSize: 86, family: 'Damion, cursive', style: 'italic' })
  ctx.fillText(`Km ${km}`, 540, 310)

  ctx.strokeStyle = '#A88E5D'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(350, 342); ctx.lineTo(730, 342); ctx.stroke()

  ctx.fillStyle = 'rgba(245,243,236,0.52)'
  ctx.font = '700 24px Montserrat, sans-serif'
  ctx.fillText('DEDICATED TO', 540, 405)

  ctx.fillStyle = '#F5F3EC'
  fitText(ctx, dedication.dedicatedTo, 840, { maxSize: 92, minSize: 54, family: 'Damion, cursive', style: 'italic' })
  ctx.fillText(dedication.dedicatedTo, 540, 500)

  if (dedication.message) {
    const quote = `"${dedication.message}"`
    const messageSize = fitText(ctx, quote, 860, { maxSize: 34, minSize: 24, family: 'Montserrat, sans-serif', style: 'italic' })
    ctx.font = `italic ${messageSize}px Montserrat, sans-serif`
    const lines = wrapText(ctx, quote, 860, 5)
    ctx.fillStyle = 'rgba(203,178,153,0.82)'
    const lineHeight = Math.max(38, messageSize * 1.35)
    const yStart = 585 - ((lines.length - 1) * lineHeight) / 2
    lines.forEach((line, index) => ctx.fillText(line, 540, yStart + index * lineHeight))
  }

  ctx.fillStyle = '#A88E5D'
  ctx.font = '800 24px Montserrat, sans-serif'
  ctx.fillText(`BY ${dedication.name.toUpperCase()}`, 540, 810)

  ctx.strokeStyle = 'rgba(168,142,93,0.38)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(390, 850); ctx.lineTo(690, 850); ctx.stroke()

  ctx.fillStyle = 'rgba(168,142,93,0.72)'
  ctx.font = '800 32px Montserrat, sans-serif'
  ctx.fillText('#WhyNotMe', 540, 915)

  ctx.fillStyle = 'rgba(245,243,236,0.34)'
  ctx.font = '18px Montserrat, sans-serif'
  ctx.fillText('Dedicate yours at whynotme.co.nz/dedicate', 540, 1000)

  return canvas
}

function downloadCanvas(canvas, filename) {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}

async function shareCard(canvas, km) {
  try {
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
    const file = new File([blob], `why-not-me-km-${km}.png`, { type: 'image/png' })
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `I dedicated Km ${km} — Why Not Me?`,
        text: `I just dedicated Kilometre ${km} of the Queenstown Marathon. Dedicate yours:`,
        url: 'https://whynotme.co.nz/dedicate',
      })
      return
    }
  } catch (e) {
    if (e.name === 'AbortError') return // user cancelled
  }
  // Fallback: download image + open Facebook share
  downloadCanvas(canvas, `why-not-me-km-${km}.png`)
  window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://whynotme.co.nz/dedicate')}`,
    '_blank', 'width=600,height=400'
  )
}

// ── Component ─────────────────────────────────────────────────
export default function DedicateKmPage() {
  const [dedications, setDedications] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedKm, setSelectedKm] = useState(null)
  const [viewingKm, setViewingKm] = useState(null)
  const [successKm, setSuccessKm] = useState(null)
  const [openMessageForm, setOpenMessageForm] = useState(false)
  const [genericMessages, setGenericMessages] = useState([])
  const [messageSuccess, setMessageSuccess] = useState(false)
  const [hoveredKm, setHoveredKm] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const [formData, setFormData] = useState({ name: '', dedicatedTo: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [shareCanvas, setShareCanvas] = useState(null)
  const svgWrapRef = useRef(null)

  const claimed = Object.keys(dedications).length
  const remaining = TOTAL_KM - claimed
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches

  const fetchDedications = useCallback(async () => {
    try {
      const res = await fetch('/api/dedications')
      if (res.ok) {
        const data = await res.json()
        setDedications(data.dedications || {})
        setGenericMessages(data.messages || [])
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchDedications() }, [fetchDedications])

  const handleOpen = (km) => {
    if (dedications[String(km)]) {
      setViewingKm(km)
    } else {
      setSelectedKm(km)
      setFormData({ name: '', dedicatedTo: '', message: '' })
      setError('')
    }
  }

  const handleClose = () => {
    setSelectedKm(null)
    setViewingKm(null)
    setSuccessKm(null)
    setOpenMessageForm(false)
    setMessageSuccess(false)
    setShareCanvas(null)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/dedications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ km: selectedKm, name: formData.name, dedicatedTo: formData.dedicatedTo, message: formData.message }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong.'); setSubmitting(false); return }

      const claimedKm = selectedKm
      setDedications(data.dedications || {})
      setSelectedKm(null)
      setSubmitting(false)

      // Celebration
      spawnConfetti()
      const dedication = (data.dedications || {})[String(claimedKm)]
      if (dedication) {
        setSuccessKm(claimedKm)
        try {
          const card = await generateShareCard(claimedKm, dedication)
          setShareCanvas(card)
        } catch { /* card gen failed, still show success */ }
      }
    } catch {
      setError('Could not connect. Please try again.')
      setSubmitting(false)
    }
  }


  const handleGenericMessageSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/dedications/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, dedicatedTo: formData.dedicatedTo, message: formData.message }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong.'); setSubmitting(false); return }
      setGenericMessages(data.messages || [])
      setFormData({ name: '', dedicatedTo: '', message: '' })
      setSubmitting(false)
      setOpenMessageForm(false)
      setMessageSuccess(true)
      spawnConfetti()
    } catch {
      setError('Could not connect. Please try again.')
      setSubmitting(false)
    }
  }

  const handleMarkerHover = (km, e) => {
    if (isMobile) return
    const dedication = dedications[String(km)]
    if (!dedication) { setHoveredKm(km); setTooltip(null); return }
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredKm(km)
    setTooltip({
      km,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      dedication,
    })
  }

  const handleMarkerLeave = () => {
    setHoveredKm(null)
    setTooltip(null)
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (loading) {
    return <PageTransition><div className="dedicate-loading">Loading dedications…</div></PageTransition>
  }

  return (
    <PageTransition>
      {/* Hero */}
      <section className="dedicate-hero">
        <div className="dedicate-hero-bg" />
        <div className="dedicate-hero-content">
          <p className="section-label">Queenstown Marathon</p>
          <h1>Dedicate a Kilometre.</h1>
          <p className="dedicate-hero-subtitle">
            Nicole is running 42.2 km for Brain Tumour Support NZ. Claim a kilometre, dedicate it to someone who matters to you, and she will carry every name along the road with her.
          </p>
        </div>
      </section>

      {/* Counter */}
      <div className="dedicate-counter-bar">
        <div className="dedicate-counter-inner">
          <div className="dedicate-counter-stat">
            <span className="dedicate-counter-number">{claimed}</span>
            <span className="dedicate-counter-label">Claimed</span>
          </div>
          <div className="dedicate-counter-divider" />
          <div className="dedicate-counter-stat">
            <span className="dedicate-counter-number">{remaining}</span>
            <span className="dedicate-counter-label">Remaining</span>
          </div>
          <div className="dedicate-counter-divider" />
          <div className="dedicate-counter-stat">
            <span className="dedicate-counter-number">42.2</span>
            <span className="dedicate-counter-label">km Total</span>
          </div>
        </div>
      </div>

      {/* Elevation profile */}
      <section className="dedicate-elevation-section">
        <div className="dedicate-elevation-labels">
          <span>Start</span>
          <span>Queenstown Marathon Route</span>
          <span>Finish</span>
        </div>
        <div className="dedicate-mobile-route" aria-label="Mobile kilometre dedication chooser">
          <div className="dedicate-mobile-route-line" />
          {POINTS.map((pt) => {
            const dedication = dedications[String(pt.km)]
            const isClaimed = !!dedication
            return (
              <button
                key={pt.km}
                type="button"
                className={`dedicate-mobile-km ${isClaimed ? 'is-claimed' : 'is-open'}`}
                onClick={() => handleOpen(pt.km)}
                aria-label={isClaimed ? `Km ${pt.km}, dedicated by ${dedication.name} for ${dedication.dedicatedTo}` : `Km ${pt.km}, available`}
              >
                <span className="dedicate-mobile-km-number">{pt.km}</span>
                <span className="dedicate-mobile-km-status">{isClaimed ? 'View' : 'Claim'}</span>
              </button>
            )
          })}
          <button type="button" className="dedicate-mobile-km is-finish" onClick={() => setViewingKm('finish')} aria-label="Final 0.2 kilometres, dedicated to Nicole by Dean">
            <span className="dedicate-mobile-km-number">.2</span>
            <span className="dedicate-mobile-km-status">Finish</span>
          </button>
        </div>
        <div className="dedicate-elevation-scroll" ref={svgWrapRef}>
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="dedicate-elevation-svg" preserveAspectRatio="xMidYMid meet">
            {/* Gradient definitions */}
            <defs>
              <linearGradient id="elevFillOpen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(245,243,236,0.06)" />
                <stop offset="100%" stopColor="rgba(245,243,236,0)" />
              </linearGradient>
              <linearGradient id="elevFillClaimed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(168,142,93,0.18)" />
                <stop offset="100%" stopColor="rgba(168,142,93,0)" />
              </linearGradient>
              <filter id="goldGlow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Filled area under the line */}
            <path d={filledPath(POINTS)} fill="url(#elevFillOpen)" />

            {/* Main elevation line */}
            <path d={smoothPath(POINTS)} fill="none" stroke="rgba(245,243,236,0.12)" strokeWidth="2" />

            {/* Claimed segments glow */}
            {POINTS.map((pt, i) => {
              if (!dedications[String(pt.km)]) return null
              const prev = POINTS[i - 1] || pt
              const next = POINTS[i + 1] || pt
              return (
                <line key={`seg-${pt.km}`} x1={prev.x} y1={prev.y} x2={next.x} y2={next.y}
                  stroke="#A88E5D" strokeWidth="2.5" opacity="0.5" />
              )
            })}

            {/* Km markers */}
            {POINTS.map((pt) => {
              const dedication = dedications[String(pt.km)]
              const isClaimed = !!dedication
              const isHovered = hoveredKm === pt.km
              const r = isClaimed ? 14 : (isHovered ? 12 : 10)

              return (
                <g key={pt.km}
                  onClick={() => handleOpen(pt.km)}
                  onMouseEnter={(e) => handleMarkerHover(pt.km, e)}
                  onMouseLeave={handleMarkerLeave}
                  style={{ cursor: 'pointer' }}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleOpen(pt.km) }}
                  aria-label={isClaimed
                    ? `Km ${pt.km}, dedicated by ${dedication.name} for ${dedication.dedicatedTo}`
                    : `Km ${pt.km}, available`
                  }
                >
                  {/* Hit area */}
                  <circle cx={pt.x} cy={pt.y} r={20} fill="transparent" />

                  {/* Glow for claimed */}
                  {isClaimed && <circle cx={pt.x} cy={pt.y} r={r + 4} fill="rgba(168,142,93,0.15)" />}

                  {/* Marker circle */}
                  <circle cx={pt.x} cy={pt.y} r={r}
                    fill={isClaimed ? '#A88E5D' : (isHovered ? 'rgba(168,142,93,0.3)' : 'rgba(245,243,236,0.08)')}
                    stroke={isClaimed ? '#A88E5D' : (isHovered ? '#A88E5D' : 'rgba(245,243,236,0.2)')}
                    strokeWidth={isClaimed ? 0 : 1}
                  />

                  {/* Km number */}
                  <text x={pt.x} y={pt.y + 4.5}
                    textAnchor="middle" fontSize={isClaimed ? "10" : "11"}
                    fontWeight="700" fontFamily="Montserrat, sans-serif"
                    fill={isClaimed ? '#0D0D0D' : (isHovered ? '#A88E5D' : 'rgba(245,243,236,0.35)')}
                    style={{ pointerEvents: 'none' }}
                  >
                    {pt.km}
                  </text>

                  {/* Vertical tick below */}
                  {pt.km % 5 === 0 && (
                    <>
                      <line x1={pt.x} y1={SVG_H - PAD_BOT + 10} x2={pt.x} y2={SVG_H - PAD_BOT + 22}
                        stroke="rgba(245,243,236,0.15)" strokeWidth="1" />
                      <text x={pt.x} y={SVG_H - PAD_BOT + 36}
                        textAnchor="middle" fontSize="10" fontFamily="Montserrat, sans-serif"
                        fill="rgba(245,243,236,0.3)" style={{ pointerEvents: 'none' }}>
                        {pt.km} km
                      </text>
                    </>
                  )}
                </g>
              )
            })}

            {/* Finish .2km marker - dedicated to Nicole */}
            {(() => {
              const lastPt = POINTS[POINTS.length - 1]
              const fx = lastPt.x + 34
              const fy = lastPt.y + 2
              const isHovered = hoveredKm === 'finish'
              return (
                <g
                  onClick={() => setViewingKm('finish')}
                  onMouseEnter={(e) => {
                    if (!isMobile) {
                      setHoveredKm('finish')
                      const rect = e.currentTarget.getBoundingClientRect()
                      setTooltip({ km: 'finish', x: rect.left + rect.width / 2, y: rect.top - 8, dedication: FINISH_DEDICATION })
                    }
                  }}
                  onMouseLeave={handleMarkerLeave}
                  style={{ cursor: 'pointer' }}
                  role="button" tabIndex={0}
                  aria-label="Finish line, 0.2 km, dedicated to Nicole by Dean"
                >
                  <circle cx={fx} cy={fy} r={20} fill="transparent" />
                  <circle cx={fx} cy={fy} r={16} fill="rgba(168,142,93,0.15)" />
                  <circle cx={fx} cy={fy} r={12} fill="#A88E5D" />
                  <text x={fx} y={fy + 3.5} textAnchor="middle" fontSize="8" fontWeight="800"
                    fontFamily="Montserrat, sans-serif" fill="#0D0D0D" style={{ pointerEvents: 'none' }}>
                    .2
                  </text>
                  <line x1={fx} y1={SVG_H - PAD_BOT + 10} x2={fx} y2={SVG_H - PAD_BOT + 22}
                    stroke="rgba(168,142,93,0.4)" strokeWidth="1" />
                  <text x={fx} y={SVG_H - PAD_BOT + 36} textAnchor="middle" fontSize="10"
                    fontFamily="Montserrat, sans-serif" fill="rgba(168,142,93,0.5)" style={{ pointerEvents: 'none' }}>
                    Finish
                  </text>
                </g>
              )
            })()}
          </svg>
        </div>
      </section>

      {/* Hover tooltip (desktop only) */}
      {tooltip && (
        <div className="dedicate-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="dedicate-tooltip-km">{tooltip.km === 'finish' ? 'The Final .2 km' : `Km ${tooltip.km}`}</div>
          <div className="dedicate-tooltip-for">For {tooltip.dedication.dedicatedTo}</div>
          {tooltip.dedication.message && (
            <div className="dedicate-tooltip-msg">"{tooltip.dedication.message}"</div>
          )}
          <div className="dedicate-tooltip-by">— {tooltip.dedication.name}</div>
        </div>
      )}

      {remaining === 0 && (
        <section className="dedicate-full-section">
          <p className="section-label">All Kilometres Claimed</p>
          <h2>The road is full — but the love is not.</h2>
          <p>Leave Nicole a message below and we’ll add it to the wall of support she carries with her.</p>
          <button className="btn-primary" onClick={() => { setOpenMessageForm(true); setFormData({ name: '', dedicatedTo: 'Nicole', message: '' }); setError('') }}>Leave a Message</button>
          {genericMessages.length > 0 && (
            <div className="dedicate-message-wall">
              {genericMessages.slice(0, 6).map((item) => (
                <article className="dedicate-message-card" key={item.id || `${item.name}-${item.createdAt}`}>
                  <div>For {item.dedicatedTo || 'Nicole'}</div>
                  <p>“{item.message}”</p>
                  <span>— {item.name}</span>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Bottom CTA */}
      <section className="dedicate-cta-section">
        <RevealOnScroll>
          <p className="section-label">Every Kilometre Counts</p>
          <p className="section-body">
            Whether you dedicate a kilometre, donate, or share this page, you are part of the road Nicole is running. Every bit of support goes to Brain Tumour Support NZ.
          </p>
          <div className="dedicate-cta-buttons">
            <a href="https://nogoingback.nz/nicole-white" target="_blank" rel="noopener noreferrer" className="btn-primary">Donate Now</a>
            <Link to="/queenstown-marathon" className="btn-outline">The Marathon Story</Link>
          </div>
        </RevealOnScroll>
      </section>

      {/* ---- Claim form modal ---- */}
      {selectedKm && (
        <div className="dedicate-modal-overlay" onClick={handleClose}>
          <div className="dedicate-modal" onClick={(e) => e.stopPropagation()}>
            <button className="dedicate-modal-close" onClick={handleClose} aria-label="Close">&times;</button>
            <div className="dedicate-modal-km">Km {selectedKm}</div>
            <div className="dedicate-modal-heading">Dedicate This Kilometre</div>
            <form className="dedicate-form" onSubmit={handleSubmit}>
              <div className="dedicate-field">
                <label htmlFor="dedicate-name">Your Name</label>
                <input id="dedicate-name" type="text" placeholder="Your name" maxLength={80}
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  autoFocus required />
              </div>
              <div className="dedicate-field">
                <label htmlFor="dedicate-for">Dedicating This Km To</label>
                <input id="dedicate-for" type="text" placeholder="A person, a group, or a cause" maxLength={80}
                  value={formData.dedicatedTo} onChange={(e) => setFormData({ ...formData, dedicatedTo: e.target.value })}
                  required />
              </div>
              <div className="dedicate-field">
                <label htmlFor="dedicate-message">Message (optional)</label>
                <textarea id="dedicate-message" placeholder="A short message for Nicole to carry with her" maxLength={150}
                  value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} />
                <div className="dedicate-field-hint">{formData.message.length}/150</div>
              </div>
              <button type="submit" className="btn-primary dedicate-submit" disabled={submitting}>
                {submitting ? 'Claiming…' : 'Claim This Kilometre'}
              </button>
              {error && <p className="dedicate-error">{error}</p>}
            </form>
          </div>
        </div>
      )}

      {/* ---- View modal (tap claimed km) ---- */}
      {viewingKm && (viewingKm === 'finish' ? FINISH_DEDICATION : dedications[String(viewingKm)]) && (
        <div className="dedicate-modal-overlay" onClick={handleClose}>
          <div className="dedicate-modal dedicate-view-modal" onClick={(e) => e.stopPropagation()}>
            <button className="dedicate-modal-close" onClick={handleClose} aria-label="Close">&times;</button>
            <div className="dedicate-modal-km">{viewingKm === 'finish' ? 'The Final .2 km' : `Km ${viewingKm}`}</div>
            <div className="dedicate-view-for">Dedicated to</div>
            <div className="dedicate-view-name">
              {(viewingKm === 'finish' ? FINISH_DEDICATION : dedications[String(viewingKm)]).dedicatedTo}
            </div>
            {(viewingKm === 'finish' ? FINISH_DEDICATION : dedications[String(viewingKm)]).message && (
              <p className="dedicate-view-message">
                "{(viewingKm === 'finish' ? FINISH_DEDICATION : dedications[String(viewingKm)]).message}"
              </p>
            )}
            <div className="dedicate-view-line" />
            <div className="dedicate-view-by">
              By {(viewingKm === 'finish' ? FINISH_DEDICATION : dedications[String(viewingKm)]).name}
            </div>
          </div>
        </div>
      )}

      {openMessageForm && (
        <div className="dedicate-modal-overlay" onClick={handleClose}>
          <div className="dedicate-modal" onClick={(e) => e.stopPropagation()}>
            <button className="dedicate-modal-close" onClick={handleClose} aria-label="Close">&times;</button>
            <div className="dedicate-modal-km">Message</div>
            <div className="dedicate-modal-heading">Leave Support For Nicole</div>
            <form className="dedicate-form" onSubmit={handleGenericMessageSubmit}>
              <div className="dedicate-field">
                <label htmlFor="generic-name">Your Name</label>
                <input id="generic-name" type="text" placeholder="Your name" maxLength={80} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} autoFocus required />
              </div>
              <div className="dedicate-field">
                <label htmlFor="generic-for">Message For</label>
                <input id="generic-for" type="text" placeholder="Nicole, the team, or a loved one" maxLength={80} value={formData.dedicatedTo} onChange={(e) => setFormData({ ...formData, dedicatedTo: e.target.value })} required />
              </div>
              <div className="dedicate-field">
                <label htmlFor="generic-message">Message</label>
                <textarea id="generic-message" placeholder="A short message for Nicole to carry with her" maxLength={150} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} required />
                <div className="dedicate-field-hint">{formData.message.length}/150</div>
              </div>
              <button type="submit" className="btn-primary dedicate-submit" disabled={submitting}>{submitting ? 'Sending…' : 'Send Message'}</button>
              {error && <p className="dedicate-error">{error}</p>}
            </form>
          </div>
        </div>
      )}

      {messageSuccess && (
        <div className="dedicate-modal-overlay" onClick={handleClose}>
          <div className="dedicate-modal dedicate-view-modal" onClick={(e) => e.stopPropagation()}>
            <button className="dedicate-modal-close" onClick={handleClose} aria-label="Close">&times;</button>
            <div className="dedicate-success-icon">✓</div>
            <div className="dedicate-success-title">Message received.</div>
            <p className="dedicate-success-subtitle">Thank you — Nicole will see every word of support.</p>
            <button className="btn-primary" onClick={handleClose}>Done</button>
          </div>
        </div>
      )}

      {/* ---- Success / share card modal ---- */}
      {successKm && dedications[String(successKm)] && (
        <div className="dedicate-modal-overlay" onClick={handleClose}>
          <div className="dedicate-modal dedicate-success-modal" onClick={(e) => e.stopPropagation()}>
            <button className="dedicate-modal-close" onClick={handleClose} aria-label="Close">&times;</button>
            <div className="dedicate-success-icon">✓</div>
            <div className="dedicate-success-title">Kilometre {successKm} is yours.</div>
            <p className="dedicate-success-subtitle">
              Nicole will carry this dedication with her. Share it so others can dedicate theirs.
            </p>
            {shareCanvas && (
              <div className="dedicate-share-preview">
                <img src={shareCanvas.toDataURL('image/png')} alt={`Share card for Km ${successKm}`} />
              </div>
            )}
            <div className="dedicate-success-actions">
              {shareCanvas && (
                <>
                  <button className="btn-primary"
                    onClick={() => shareCard(shareCanvas, successKm)}>
                    Share Card
                  </button>
                  <button className="btn-outline"
                    onClick={() => downloadCanvas(shareCanvas, `why-not-me-km-${successKm}.png`)}>
                    Download Card
                  </button>
                </>
              )}
              <button className="btn-outline" onClick={handleClose}>Done</button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  )
}