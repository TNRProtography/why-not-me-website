import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

function getCompactView() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 820px)').matches
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))
const easeInOutCubic = (value) => {
  const t = clamp(value)
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
const easeOutCubic = (value) => 1 - Math.pow(1 - clamp(value), 3)

export default function HeroPortalTitle({
  children,
  targetRef,
  className = '',
  desktopScale = 42,
  mobileScale = 25,
}) {
  const wrapRef = useRef(null)
  const titleRef = useRef(null)
  const tunnelRef = useRef(null)
  const apertureRef = useRef(null)
  const floodRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const [compactView, setCompactView] = useState(getCompactView)
  const geometryRef = useRef({
    originX: 50,
    originY: 50,
    finalX: 0,
    finalY: 0,
    localX: 0,
    localY: 0,
    scale: 90,
  })
  const tickingRef = useRef(false)
  const reduceMotionRef = useRef(reduceMotion)
  reduceMotionRef.current = reduceMotion

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
    const title = titleRef.current
    const target = targetRef?.current
    if (!title || !target || typeof window === 'undefined') return undefined

    let frame

    const applyPortal = () => {
      tickingRef.current = false

      const aperture = apertureRef.current
      const tunnel = tunnelRef.current
      const flood = floodRef.current

      if (!target || !title) return

      const targetRect = target.getBoundingClientRect()
      const travelDistance = Math.max(1, targetRect.height - window.innerHeight)
      const progress = reduceMotionRef.current ? 0 : clamp(-targetRect.top / travelDistance)

      target.style.setProperty('--portal-progress', progress.toFixed(4))
      target.classList.toggle('is-portal-primed', progress > 0.03)
      target.classList.toggle('is-portal-travelling', progress > 0.18)
      target.classList.toggle('is-portal-commit', progress > 0.66)
      target.classList.toggle('is-portal-complete', progress > 0.96)

      const { originX, originY, finalX, finalY, localX, localY, scale: maximumScale } = geometryRef.current

      const travel = clamp((progress - 0.045) / 0.72)
      const zoom = easeInOutCubic(travel)
      const lateZoom = easeOutCubic(clamp((progress - 0.58) / 0.34))
      const scale = 1 + (maximumScale - 1) * zoom + maximumScale * 0.28 * lateZoom
      const x = finalX * zoom
      const y = finalY * zoom
      const fade = 1 - Math.pow(clamp((progress - 0.78) / 0.18), 1.35)
      const blur = progress < 0.72 ? 0 : Math.round(clamp((progress - 0.72) / 0.24) * 30)
      const brightness = 1 + clamp((progress - 0.42) / 0.44) * 1.25
      const tracking = zoom * 0.12

      title.style.transformOrigin = `${originX}% ${originY}%`
      title.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`
      title.style.opacity = clamp(fade, 0, 1).toFixed(3)
      title.style.filter = `blur(${blur}px) brightness(${brightness.toFixed(3)})`
      title.style.letterSpacing = `${tracking.toFixed(4)}em`
      title.style.textShadow = `0 ${Math.round(14 + zoom * 110)}px ${Math.round(50 + zoom * 270)}px rgba(245, 243, 236, ${Math.min(0.88, 0.22 + zoom * 0.66).toFixed(3)})`

      if (aperture) {
        const apertureTravel = easeInOutCubic(clamp((progress - 0.16) / 0.64))
        const apertureScale = 0.22 + apertureTravel * 160
        const apertureOpacity = progress < 0.18 ? 0 : progress > 0.94 ? 0 : clamp((progress - 0.18) / 0.18) * clamp((0.94 - progress) / 0.1)
        aperture.style.left = `${localX}px`
        aperture.style.top = `${localY}px`
        aperture.style.transform = `translate(-50%, -50%) translate3d(${(finalX * apertureTravel).toFixed(2)}px, ${(finalY * apertureTravel).toFixed(2)}px, 0) scale(${apertureScale.toFixed(3)})`
        aperture.style.opacity = clamp(apertureOpacity, 0, 0.95).toFixed(3)
        aperture.style.filter = `blur(${Math.round(6 + apertureTravel * 32)}px)`
      }

      if (tunnel) {
        const tunnelOpacity = progress < 0.22 ? 0 : progress > 0.96 ? 0 : clamp((progress - 0.22) / 0.34) * clamp((0.96 - progress) / 0.1)
        tunnel.style.opacity = clamp(tunnelOpacity, 0, 0.98).toFixed(3)
        tunnel.style.transform = `scale(${(0.94 + zoom * 0.48).toFixed(3)})`
      }

      if (flood) {
        const floodOpacity = progress < 0.64 ? 0 : progress > 0.98 ? 0 : clamp((progress - 0.64) / 0.26) * clamp((0.98 - progress) / 0.1)
        flood.style.opacity = clamp(floodOpacity, 0, 0.82).toFixed(3)
        flood.style.transform = `scale(${(0.72 + lateZoom * 1.05).toFixed(3)})`
      }
    }

    const requestPortalUpdate = () => {
      if (tickingRef.current) return
      tickingRef.current = true
      window.requestAnimationFrame(applyPortal)
    }

    const measurePortalLetter = () => {
      const letter = title.querySelector('[data-portal-letter]')
      const portalTarget = letter || title
      const titleBox = title.getBoundingClientRect()
      const letterBox = portalTarget.getBoundingClientRect()

      if (!titleBox.width || !titleBox.height || !letterBox.width || !letterBox.height) return

      const letterCenterX = letterBox.left + letterBox.width / 2
      const letterCenterY = letterBox.top + letterBox.height / 2
      const titleOriginX = ((letterCenterX - titleBox.left) / titleBox.width) * 100
      const titleOriginY = ((letterCenterY - titleBox.top) / titleBox.height) * 100
      const minimumScale = compactView ? 62 : 104
      const requestedScale = compactView ? mobileScale : desktopScale

      geometryRef.current = {
        originX: Number.isFinite(titleOriginX) ? titleOriginX : 50,
        originY: Number.isFinite(titleOriginY) ? titleOriginY : 50,
        finalX: Math.round(window.innerWidth / 2 - letterCenterX),
        finalY: Math.round(window.innerHeight / 2 - letterCenterY),
        localX: Math.round(letterCenterX - titleBox.left),
        localY: Math.round(letterCenterY - titleBox.top),
        scale: Math.max(requestedScale, minimumScale),
      }

      target.style.setProperty('--portal-origin-x', `${geometryRef.current.originX}%`)
      target.style.setProperty('--portal-origin-y', `${geometryRef.current.originY}%`)
      applyPortal()
    }

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(measurePortalLetter)
    }

    scheduleMeasure()
    const timeouts = [120, 360, 760, 1250, 2000].map((time) => window.setTimeout(scheduleMeasure, time))
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleMeasure) : null
    observer?.observe(title)
    observer?.observe(target)
    document.fonts?.ready?.then(scheduleMeasure).catch(() => {})

    window.addEventListener('scroll', requestPortalUpdate, { passive: true })
    window.addEventListener('resize', scheduleMeasure, { passive: true })
    window.addEventListener('orientationchange', scheduleMeasure)

    return () => {
      window.cancelAnimationFrame(frame)
      timeouts.forEach((timeout) => window.clearTimeout(timeout))
      observer?.disconnect()
      window.removeEventListener('scroll', requestPortalUpdate)
      window.removeEventListener('resize', scheduleMeasure)
      window.removeEventListener('orientationchange', scheduleMeasure)
      target.style.removeProperty('--portal-progress')
      target.style.removeProperty('--portal-origin-x')
      target.style.removeProperty('--portal-origin-y')
      target.classList.remove('is-portal-primed', 'is-portal-travelling', 'is-portal-commit', 'is-portal-complete')
    }
  }, [children, compactView, desktopScale, mobileScale, targetRef])

  if (reduceMotion) {
    return (
      <div className={`hero-portal-title ${className}`.trim()} ref={titleRef}>
        {children}
      </div>
    )
  }

  return (
    <div className={`hero-portal-wrap ${className}`.trim()} ref={wrapRef}>
      <div className="hero-portal-tunnel" aria-hidden="true" ref={tunnelRef} />
      <div className="hero-portal-aperture" aria-hidden="true" ref={apertureRef} />
      <div className="hero-portal-flood" aria-hidden="true" ref={floodRef} />
      <div ref={titleRef} className="hero-portal-title">
        {children}
      </div>
    </div>
  )
}
