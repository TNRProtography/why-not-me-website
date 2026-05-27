import { Children, cloneElement, isValidElement, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'

const CLOSED_PORTAL_LETTERS = 'oO0aAbBdDgpPqQeRr'

function getCompactView() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 820px)').matches
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function getFallbackOrigin(origin) {
  if (!origin || origin === 'center') return '50% 50%'
  if (origin === 'left') return '0% 50%'
  if (origin === 'right') return '100% 50%'
  if (origin === 'top') return '50% 0%'
  if (origin === 'bottom') return '50% 100%'
  return origin
}

function hasPortalLetter(node) {
  if (typeof node === 'string' || typeof node === 'number' || node == null || typeof node === 'boolean') return false
  if (Array.isArray(node)) return node.some(hasPortalLetter)
  if (!isValidElement(node)) return false
  if (node.props?.['data-portal-letter'] !== undefined) return true
  return hasPortalLetter(node.props?.children)
}

function chooseClosedLetterIndex(text) {
  const candidates = []

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (!CLOSED_PORTAL_LETTERS.includes(character)) continue
    if (!/\S/.test(character)) continue
    candidates.push(index)
  }

  if (!candidates.length) return -1

  const ideal = Math.max(0, text.length * 0.52)
  return candidates.reduce((bestIndex, candidateIndex) => {
    const bestDistance = Math.abs(bestIndex - ideal)
    const candidateDistance = Math.abs(candidateIndex - ideal)
    return candidateDistance < bestDistance ? candidateIndex : bestIndex
  }, candidates[0])
}

function addPortalLetterToText(text, keyPrefix) {
  const index = chooseClosedLetterIndex(text)
  if (index === -1) return { node: text, marked: false }

  const before = text.slice(0, index)
  const character = text[index]
  const after = text.slice(index + 1)

  return {
    marked: true,
    node: [
      before,
      <span className="portal-letter-target" data-portal-letter key={`${keyPrefix}-portal-letter`}>
        {character}
      </span>,
      after,
    ],
  }
}

function addPortalLetter(children) {
  if (hasPortalLetter(children)) return children

  let marked = false

  const walk = (node, keyPrefix = 'portal') => {
    if (marked || node == null || typeof node === 'boolean') return node

    if (typeof node === 'string') {
      const result = addPortalLetterToText(node, keyPrefix)
      marked = result.marked
      return result.node
    }

    if (typeof node === 'number') return node

    if (Array.isArray(node)) {
      return node.map((child, index) => walk(child, `${keyPrefix}-${index}`))
    }

    if (!isValidElement(node)) return node

    const childNodes = node.props?.children
    if (childNodes == null) return node

    const nextChildren = Children.map(childNodes, (child, index) => walk(child, `${keyPrefix}-${index}`))
    if (nextChildren === childNodes) return node

    return cloneElement(node, undefined, nextChildren)
  }

  return walk(children)
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
  const [transformOrigin, setTransformOrigin] = useState(getFallbackOrigin(origin))
  const processedChildren = useMemo(() => addPortalLetter(children), [children])

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
    const target = targetRef.current
    if (!target || typeof window === 'undefined') return undefined

    let frame

    const measurePortalLetter = () => {
      const portalLetter = target.querySelector('[data-portal-letter]')
      const targetBox = target.getBoundingClientRect()

      if (!portalLetter || !targetBox.width || !targetBox.height) {
        setTransformOrigin(getFallbackOrigin(origin))
        return
      }

      const letterBox = portalLetter.getBoundingClientRect()
      if (!letterBox.width || !letterBox.height) {
        setTransformOrigin(getFallbackOrigin(origin))
        return
      }

      const letterCenterX = letterBox.left + letterBox.width / 2
      const letterCenterY = letterBox.top + letterBox.height / 2
      const originX = ((letterCenterX - targetBox.left) / targetBox.width) * 100
      const originY = ((letterCenterY - targetBox.top) / targetBox.height) * 100

      if (!Number.isFinite(originX) || !Number.isFinite(originY)) {
        setTransformOrigin(getFallbackOrigin(origin))
        return
      }

      const nextOrigin = `${originX.toFixed(2)}% ${originY.toFixed(2)}%`
      target.style.setProperty('--scroll-zoom-origin-x', `${originX.toFixed(2)}%`)
      target.style.setProperty('--scroll-zoom-origin-y', `${originY.toFixed(2)}%`)
      setTransformOrigin(nextOrigin)
    }

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(measurePortalLetter)
    }

    scheduleMeasure()
    const timeouts = [120, 380, 850].map((time) => window.setTimeout(scheduleMeasure, time))
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleMeasure) : null
    observer?.observe(target)
    document.fonts?.ready?.then(scheduleMeasure).catch(() => {})

    window.addEventListener('resize', scheduleMeasure, { passive: true })
    window.addEventListener('orientationchange', scheduleMeasure)

    return () => {
      window.cancelAnimationFrame(frame)
      timeouts.forEach((timeout) => window.clearTimeout(timeout))
      observer?.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
      window.removeEventListener('orientationchange', scheduleMeasure)
      target.style.removeProperty('--scroll-zoom-origin-x')
      target.style.removeProperty('--scroll-zoom-origin-y')
    }
  }, [origin, processedChildren])

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

  // Keep the element perfectly readable at rest. Then use the measured closed
  // letter as the camera origin, so the push feels like it is moving into that
  // letter instead of scaling from the centre of the whole heading.
  const scale = useTransform(smoothProgress, [0, 0.44, 0.72, 1], [1, 1, 1.08, finalScaleTo])
  const y = useTransform(smoothProgress, [0, 0.48, 0.82, 1], [0, 0, -5, finalYTo])
  const opacity = useTransform(smoothProgress, [0, 0.62, 0.84, 1], [1, 1, 1, opacityTo])
  const filter = useTransform(smoothProgress, [0, 0.68, 0.86, 1], ['blur(0px) brightness(1)', 'blur(0px) brightness(1)', 'blur(0px) brightness(1.08)', `blur(${finalBlurTo}px) brightness(1.18)`])
  const letterSpacing = useTransform(smoothProgress, [0, 0.72, 1], ['0em', '0.004em', '0.038em'])
  const textShadow = useTransform(
    smoothProgress,
    [0, 0.55, 1],
    ['0 0 0 rgba(203,178,153,0)', '0 10px 42px rgba(203,178,153,0.08)', '0 30px 100px rgba(203,178,153,0.26)']
  )

  if (reduceMotion) {
    return (
      <div ref={targetRef} className={`scroll-zoom-focus ${className}`.trim()} data-origin={origin} style={{ transformOrigin }}>
        {processedChildren}
      </div>
    )
  }

  return (
    <motion.div
      ref={targetRef}
      className={`scroll-zoom-focus ${className}`.trim()}
      data-origin={origin}
      style={{ scale, y, opacity, filter, letterSpacing, textShadow, transformOrigin }}
    >
      {processedChildren}
    </motion.div>
  )
}
