import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'

function getCompactView() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 820px)').matches
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export default function HeroPortalTitle({
  children,
  targetRef,
  className = '',
  desktopScale = 18,
  mobileScale = 10.5,
  offset = ['start start', 'end start'],
}) {
  const titleRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const [compactView, setCompactView] = useState(getCompactView)
  const [portal, setPortal] = useState({ originX: 50, originY: 50, x: 0, y: 0 })

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

      if (!titleBox.width || !titleBox.height) return

      const letterCenterX = letterBox.left + letterBox.width / 2
      const letterCenterY = letterBox.top + letterBox.height / 2
      const titleOriginX = ((letterCenterX - titleBox.left) / titleBox.width) * 100
      const titleOriginY = ((letterCenterY - titleBox.top) / titleBox.height) * 100

      setPortal({
        originX: Number.isFinite(titleOriginX) ? titleOriginX : 50,
        originY: Number.isFinite(titleOriginY) ? titleOriginY : 50,
        x: Math.round(window.innerWidth / 2 - letterCenterX),
        y: Math.round(window.innerHeight / 2 - letterCenterY),
      })
    }

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(measurePortalLetter)
    }

    scheduleMeasure()
    const timeout = window.setTimeout(scheduleMeasure, 350)
    const fontReady = document.fonts?.ready?.then(scheduleMeasure).catch(() => {})

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleMeasure) : null
    observer?.observe(node)

    window.addEventListener('resize', scheduleMeasure, { passive: true })
    window.addEventListener('orientationchange', scheduleMeasure)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
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
    stiffness: 46,
    damping: 22,
    mass: 0.86,
  })

  const finalScale = compactView ? mobileScale : desktopScale
  const finalX = compactView ? portal.x * 0.86 : portal.x
  const finalY = compactView ? portal.y * 0.76 : portal.y

  const scale = useTransform(smoothProgress, [0, 0.18, 0.52, 0.78, 1], [1, 1, 1.7, 7.2, finalScale])
  const x = useTransform(smoothProgress, [0, 0.22, 0.48, 1], [0, 0, finalX, finalX])
  const y = useTransform(smoothProgress, [0, 0.22, 0.48, 1], [0, 0, finalY, finalY])
  const opacity = useTransform(smoothProgress, [0, 0.62, 0.84, 1], [1, 1, 0.92, 0])
  const filter = useTransform(smoothProgress, [0, 0.72, 0.92, 1], ['blur(0px) brightness(1)', 'blur(0px) brightness(1.06)', 'blur(2px) brightness(1.2)', 'blur(10px) brightness(1.35)'])
  const letterSpacing = useTransform(smoothProgress, [0, 0.5, 1], ['0em', '0.006em', '0.05em'])
  const textShadow = useTransform(
    smoothProgress,
    [0, 0.48, 1],
    ['0 12px 50px rgba(0,0,0,0.46)', '0 20px 90px rgba(203,178,153,0.16)', '0 52px 160px rgba(203,178,153,0.34)']
  )
  const glowOpacity = useTransform(smoothProgress, [0, 0.44, 0.74, 1], [0, 0.18, 0.46, 0])
  const glowScale = useTransform(smoothProgress, [0, 1], [0.8, 1.8])

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
        className="hero-portal-glow"
        aria-hidden="true"
        style={{
          opacity: glowOpacity,
          scale: glowScale,
          x: finalX,
          y: finalY,
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
