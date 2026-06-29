import { useRef, useEffect, useState } from 'react'

export default function HeroPortalTitle({ children, targetRef, className, desktopScale = 16, mobileScale = 9 }) {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    function handleScroll() {
      if (!targetRef?.current) return
      const rect = targetRef.current.getBoundingClientRect()
      const progress = Math.max(0, Math.min(1, 1 - rect.bottom / (window.innerHeight * 1.2)))
      const maxScale = window.innerWidth < 768 ? mobileScale : desktopScale
      setScale(1 + progress * (maxScale - 1))
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [targetRef, desktopScale, mobileScale])

  return (
    <div className={className} style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
      {children}
    </div>
  )
}
