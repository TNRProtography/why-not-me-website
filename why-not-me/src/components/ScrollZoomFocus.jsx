import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'

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

  const finalScaleTo = compactView ? Math.min(scaleTo, 1.48) : scaleTo
  const finalYTo = compactView ? Math.max(yTo, -48) : yTo
  const finalBlurTo = compactView ? Math.min(blurTo, 7) : blurTo

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset,
  })

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.985, 1, finalScaleTo])
  const y = useTransform(scrollYProgress, [0, 0.56, 1], [18, 0, finalYTo])
  const opacity = useTransform(scrollYProgress, [0, 0.62, 1], [1, 1, opacityTo])
  const filter = useTransform(scrollYProgress, [0, 0.7, 1], ['blur(0px)', 'blur(0px)', `blur(${finalBlurTo}px)`])

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
      style={{ scale, y, opacity, filter }}
    >
      {children}
    </motion.div>
  )
}
