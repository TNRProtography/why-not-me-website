import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function RevealOnScroll({ children, className, direction, delay = 0 }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold: 0.15 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const xOffset = direction === 'left' ? -40 : direction === 'right' ? 40 : 0

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, x: xOffset, y: direction ? 0 : 30 }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
