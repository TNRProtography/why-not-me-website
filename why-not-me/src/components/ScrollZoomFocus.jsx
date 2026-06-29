import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function ScrollZoomFocus({ children, origin }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold: 0.2 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const xOffset = origin === 'left' ? -30 : origin === 'right' ? 30 : 0

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, x: xOffset }}
      animate={inView ? { opacity: 1, scale: 1, x: 0 } : {}}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
