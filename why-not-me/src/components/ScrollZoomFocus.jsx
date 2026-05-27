import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'

function getCompactView() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 820px)').matches
}

export default function ScrollZoomFocus({
  children,
  className = '',
  origin = 'center',
  scaleTo = 1.85,
  yTo = -72,
  blurTo = 10,
  opacityTo = 0.08,
  offset = ['start 76%', 'end 12%'],
}) {
  const targetRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const [compactView, setCompactView] = useState(getCompactView)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 820px)')
    const update = () => setCompactView(query.matches)

    update()
    query.addEventListener('change', update)
    window.addEventListener('resize', update, { passive: true })

    return () => {
      query.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const finalScaleTo = compactView ? Math.min(scaleTo, 1.52) : scaleTo
  const finalYTo = compactView ? Math.max(yTo, -50) : yTo
  const finalBlurTo = compactView ? Math.min(blurTo, 7) : blurTo

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset,
  })

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 54,
    damping: 24,
    mass: 0.78,
  })

  // Keep the element perfectly readable at rest. The previous version blurred the
  // first frame, which meant hero titles or headings that started high in the
  // viewport could stay soft with no way for the user to scroll them into focus.
  // This now behaves more like a camera push: clear and present first, then it
  // expands, lifts, blooms, and dissolves only as the user moves past it.
  const scale = useTransform(smoothProgress, [0, 0.48, 0.78, 1], [1, 1, 1.035, finalScaleTo])
  const y = useTransform(smoothProgress, [0, 0.5, 0.82, 1], [0, 0, -4, finalYTo])
  const opacity = useTransform(smoothProgress, [0, 0.62, 0.84, 1], [1, 1, 1, opacityTo])
  const filter = useTransform(smoothProgress, [0, 0.68, 0.86, 1], ['blur(0px) brightness(1)', 'blur(0px) brightness(1)', 'blur(0px) brightness(1.06)', `blur(${finalBlurTo}px) brightness(1.16)`])
  const letterSpacing = useTransform(smoothProgress, [0, 0.72, 1], ['0em', '0.004em', '0.038em'])
  const textShadow = useTransform(
    smoothProgress,
    [0, 0.55, 1],
    ['0 0 0 rgba(203,178,153,0)', '0 10px 42px rgba(203,178,153,0.08)', '0 30px 100px rgba(203,178,153,0.26)']
  )

  if (reduceMotion) {
    return (
      <div className={`scroll-zoom-focus ${className}`.trim()} data-origin={origin}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={targetRef}
      className={`scroll-zoom-focus ${className}`.trim()}
      data-origin={origin}
      style={{ scale, y, opacity, filter, letterSpacing, textShadow }}
    >
      {children}
    </motion.div>
  )
}
