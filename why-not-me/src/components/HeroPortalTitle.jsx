import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useMotionTemplate, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'

function getCompactView() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 820px)').matches
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export default function HeroPortalTitle({
  children,
  targetRef,
  className = '',
  desktopScale = 42,
  mobileScale = 25,
  offset = ['start start', 'end end'],
}) {
  const titleRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const [compactView, setCompactView] = useState(getCompactView)
  const [portal, setPortal] = useState({
    originX: 50,
    originY: 50,
    x: 0,
    y: 0,
    localX: 0,
    localY: 0,
  })

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

  useIsomorphicLayoutEffect(() => {
    const node = titleRef.current
    if (!node || typeof window === 'undefined') return undefined

    let frame

    const measurePortalLetter = () => {
      const letter = node.querySelector('[data-portal-letter]')
      const target = letter || node
      const titleBox = node.getBoundingClientRect()
      const letterBox = target.getBoundingClientRect()

      if (!titleBox.width || !titleBox.height || !letterBox.width || !letterBox.height) return

      const letterCenterX = letterBox.left + letterBox.width / 2
      const letterCenterY = letterBox.top + letterBox.height / 2
      const titleOriginX = ((letterCenterX - titleBox.left) / titleBox.width) * 100
      const titleOriginY = ((letterCenterY - titleBox.top) / titleBox.height) * 100

      setPortal({
        originX: Number.isFinite(titleOriginX) ? titleOriginX : 50,
        originY: Number.isFinite(titleOriginY) ? titleOriginY : 50,
        x: Math.round(window.innerWidth / 2 - letterCenterX),
        y: Math.round(window.innerHeight / 2 - letterCenterY),
        localX: Math.round(letterCenterX - titleBox.left),
        localY: Math.round(letterCenterY - titleBox.top),
      })
    }

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(measurePortalLetter)
    }

    scheduleMeasure()
    const timeouts = [120, 360, 760].map((time) => window.setTimeout(scheduleMeasure, time))
    const fontReady = document.fonts?.ready?.then(scheduleMeasure).catch(() => {})

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleMeasure) : null
    observer?.observe(node)

    window.addEventListener('resize', scheduleMeasure, { passive: true })
    window.addEventListener('orientationchange', scheduleMeasure)

    return () => {
      window.cancelAnimationFrame(frame)
      timeouts.forEach((timeout) => window.clearTimeout(timeout))
      observer?.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
      window.removeEventListener('orientationchange', scheduleMeasure)
      void fontReady
    }
  }, [children, compactView])

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset,
  })

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 58,
    damping: 24,
    mass: 0.72,
  })

  const requestedScale = compactView ? mobileScale : desktopScale
  const minimumScale = compactView ? 28 : 46
  const finalScale = Math.max(requestedScale, minimumScale)
  const finalX = compactView ? portal.x * 0.94 : portal.x
  const finalY = compactView ? portal.y * 0.9 : portal.y

  const scale = useTransform(
    smoothProgress,
    [0, 0.14, 0.34, 0.58, 0.78, 0.94, 1],
    [1, 1, 1.35, 5.4, 18, finalScale, finalScale * 1.12]
  )
  const x = useTransform(smoothProgress, [0, 0.18, 0.5, 0.82, 1], [0, 0, finalX * 0.36, finalX, finalX])
  const y = useTransform(smoothProgress, [0, 0.18, 0.5, 0.82, 1], [0, 0, finalY * 0.36, finalY, finalY])
  const opacity = useTransform(smoothProgress, [0, 0.84, 0.95, 1], [1, 1, 0.38, 0])
  const filter = useTransform(
    smoothProgress,
    [0, 0.58, 0.78, 0.92, 1],
    ['blur(0px) brightness(1)', 'blur(0px) brightness(1.08)', 'blur(0px) brightness(1.28)', 'blur(5px) brightness(1.62)', 'blur(24px) brightness(1.95)']
  )
  const letterSpacing = useTransform(smoothProgress, [0, 0.42, 0.82, 1], ['0em', '0.006em', '0.04em', '0.14em'])
  const textShadow = useTransform(
    smoothProgress,
    [0, 0.42, 0.72, 0.92, 1],
    [
      '0 12px 50px rgba(0,0,0,0.46)',
      '0 24px 96px rgba(203,178,153,0.24)',
      '0 52px 160px rgba(245,243,236,0.28)',
      '0 90px 260px rgba(245,243,236,0.62)',
      '0 120px 320px rgba(245,243,236,0.86)',
    ]
  )

  const apertureX = useTransform(smoothProgress, [0, 0.2, 0.82, 1], [0, 0, finalX, finalX])
  const apertureY = useTransform(smoothProgress, [0, 0.2, 0.82, 1], [0, 0, finalY, finalY])
  const apertureScale = useTransform(smoothProgress, [0, 0.34, 0.58, 0.76, 0.92, 1], [0.24, 0.24, 4.8, 18, 56, 104])
  const apertureOpacity = useTransform(smoothProgress, [0, 0.34, 0.54, 0.84, 0.98, 1], [0, 0, 0.36, 0.9, 0.48, 0])
  const apertureBlur = useTransform(smoothProgress, [0, 0.62, 0.9, 1], ['blur(7px)', 'blur(11px)', 'blur(20px)', 'blur(32px)'])

  const tunnelOpacity = useTransform(smoothProgress, [0, 0.4, 0.64, 0.9, 1], [0, 0, 0.48, 0.96, 0])
  const tunnelScale = useTransform(smoothProgress, [0.42, 1], [0.82, 1.28])
  const tunnelMaskSize = useTransform(smoothProgress, [0.38, 0.58, 0.78, 0.94, 1], ['0vmax', '3vmax', '16vmax', '64vmax', '118vmax'])
  const tunnelMask = useMotionTemplate`radial-gradient(circle at 50% 50%, transparent 0vmax, transparent ${tunnelMaskSize}, black calc(${tunnelMaskSize} + 1.4vmax))`

  const floodOpacity = useTransform(smoothProgress, [0, 0.7, 0.86, 0.97, 1], [0, 0, 0.16, 0.68, 0])
  const floodScale = useTransform(smoothProgress, [0.7, 1], [0.7, 1.35])

  if (reduceMotion) {
    return (
      <div className={`hero-portal-title ${className}`.trim()} ref={titleRef}>
        {children}
      </div>
    )
  }

  return (
    <div className={`hero-portal-wrap ${className}`.trim()}>
      <motion.div
        className="hero-portal-tunnel"
        aria-hidden="true"
        style={{
          opacity: tunnelOpacity,
          scale: tunnelScale,
          WebkitMaskImage: tunnelMask,
          maskImage: tunnelMask,
        }}
      />
      <motion.div
        className="hero-portal-aperture"
        aria-hidden="true"
        style={{
          left: portal.localX,
          top: portal.localY,
          x: apertureX,
          y: apertureY,
          scale: apertureScale,
          opacity: apertureOpacity,
          filter: apertureBlur,
        }}
      />
      <motion.div
        className="hero-portal-flood"
        aria-hidden="true"
        style={{
          opacity: floodOpacity,
          scale: floodScale,
        }}
      />
      <motion.div
        ref={titleRef}
        className="hero-portal-title"
        style={{
          scale,
          x,
          y,
          opacity,
          filter,
          letterSpacing,
          textShadow,
          transformOrigin: `${portal.originX}% ${portal.originY}%`,
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}
