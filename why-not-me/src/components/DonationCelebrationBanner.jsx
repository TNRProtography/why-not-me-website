import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useDonationFeed, formatDonationCurrency } from '../config/donationFeed'
import { trackDonationBannerShown } from '../utils/analytics'
import './DonationCelebrationBanner.css'

const DISPLAY_MS = 7000
const DISPLAY_MS_WITH_MESSAGE = 10000
const GAP_MS = 500

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
            <span className="donation-banner__spark" aria-hidden="true">✦</span>
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
