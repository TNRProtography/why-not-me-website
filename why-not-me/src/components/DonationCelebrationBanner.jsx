import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useDonationFeed, formatDonationCurrency } from '../config/donationFeed'
import { trackDonationBannerShown } from '../utils/analytics'
import './DonationCelebrationBanner.css'

const DISPLAY_MS = 7000
const DISPLAY_MS_WITH_MESSAGE = 10000
const GAP_MS = 500

const CONFETTI_COLORS = ['#A88E5D', '#CBB299', '#F5F3EC', '#D4A020', '#D96030']
const CONFETTI_COUNT = 26

// A quick, on-brand confetti burst over the banner. Re-generated fresh (via
// `seed` as the key) for every new donation so it always replays from the top.
//
// Driven by framer-motion (JS, per-element inline styles) rather than a CSS
// @keyframes animation: the site has a blanket "disable decorative motion"
// rule (`*, *::before, *::after { animation: none !important }` in
// global.css) that would silently no-op a plain CSS animation here.
function ConfettiBurst({ seed }) {
  const pieces = useMemo(() => {
    return Array.from({ length: CONFETTI_COUNT }, (_, i) => {
      const angle = (Math.random() - 0.5) * Math.PI * 0.9 - Math.PI / 2 // upward-ish spread
      const distance = 60 + Math.random() * 90
      return {
        id: `${seed}-${i}`,
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance + 40 + Math.random() * 40, // gravity drop
        rot: Math.round((Math.random() - 0.5) * 540),
        size: 5 + Math.round(Math.random() * 5),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 0.12,
        duration: 0.9 + Math.random() * 0.5,
        round: i % 3 === 0,
      }
    })
  }, [seed])

  return (
    <div className="donation-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className={`donation-confetti__piece${p.round ? ' donation-confetti__piece--round' : ''}`}
          style={{ width: p.size, height: p.size, background: p.color }}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: 0, x: p.tx, y: p.ty, rotate: p.rot }}
          transition={{ delay: p.delay, duration: p.duration, ease: [0.2, 0.7, 0.4, 1] }}
        />
      ))}
    </div>
  )
}

// Sits above every page. When the shared donation feed spots a donation it
// hasn't seen before, this queues it up and shows a little "just donated"
// celebration - with the donor's message, if they left one.
export default function DonationCelebrationBanner() {
  const { newDonationEvents } = useDonationFeed()
  const [active, setActive] = useState(null)
  const [topOffset, setTopOffset] = useState(12)
  const queueRef = useRef([])
  const processedSeqRef = useRef(0)
  const timerRef = useRef(null)

  // Sit just below the sticky header (nav + live tracker strip) rather than
  // on top of it, so a banner never blocks the nav links underneath.
  useEffect(() => {
    const header = document.querySelector('.site-header-sticky')
    if (!header) return

    const updateOffset = () => setTopOffset(header.getBoundingClientRect().height + 10)
    updateOffset()

    const observer = new ResizeObserver(updateOffset)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  // Pull any events we haven't queued yet into our local queue.
  useEffect(() => {
    const fresh = newDonationEvents.filter((event) => event.seq > processedSeqRef.current)
    if (!fresh.length) return
    processedSeqRef.current = fresh[fresh.length - 1].seq
    queueRef.current.push(...fresh)
  }, [newDonationEvents])

  // Drain the queue one donation at a time, with a short breathing gap
  // between each so consecutive donations don't feel like one long banner.
  useEffect(() => {
    if (active || !queueRef.current.length) return

    const gap = setTimeout(() => {
      const next = queueRef.current.shift()
      if (!next) return
      setActive(next)
      trackDonationBannerShown(!!next.message)
      const duration = next.message ? DISPLAY_MS_WITH_MESSAGE : DISPLAY_MS
      timerRef.current = setTimeout(() => setActive(null), duration)
    }, GAP_MS)

    return () => clearTimeout(gap)
  }, [newDonationEvents, active])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const handleDismiss = () => {
    clearTimeout(timerRef.current)
    setActive(null)
  }

  return (
    <div className="donation-banner-slot" style={{ top: topOffset }} aria-live="polite">
      <AnimatePresence>
        {active && (
          <motion.div
            key={active.id || active.seq}
            className="donation-banner"
            initial={{ opacity: 0, y: -28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <motion.div
              className="donation-banner__glow"
              aria-hidden="true"
              initial={{ boxShadow: '0 0 0 6px rgba(168, 142, 93, 0.45)' }}
              animate={{ boxShadow: '0 0 0 1px rgba(168, 142, 93, 0)' }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            />
            <ConfettiBurst seed={active.id || active.seq} />
            <motion.span
              className="donation-banner__spark"
              aria-hidden="true"
              animate={{ scale: [1, 1.25, 1], rotate: [0, 20, 0], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              ✦
            </motion.span>
            <div className="donation-banner__body">
              <p className="donation-banner__headline">
                <strong>{active.name || 'Someone'}</strong> just donated{' '}
                <strong>{formatDonationCurrency(active.amount, active.currency)}</strong>!
              </p>
              {active.message && (
                <p className="donation-banner__message">&ldquo;{active.message}&rdquo;</p>
              )}
            </div>
            <button
              type="button"
              className="donation-banner__dismiss"
              onClick={handleDismiss}
              aria-label="Dismiss donation notification"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
