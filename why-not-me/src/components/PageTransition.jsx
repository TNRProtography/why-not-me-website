import { motion, useReducedMotion } from 'framer-motion'

const cinematicEase = [0.16, 1, 0.3, 1]

export default function PageTransition({ children }) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className="page-wrapper">{children}</div>
  }

  return (
    <motion.div
      className="page-wrapper page-wrapper-cinematic"
      initial={{ opacity: 0, scale: 0.982, filter: 'blur(18px) brightness(0.72)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px) brightness(1)' }}
      exit={{ opacity: 0, scale: 1.018, filter: 'blur(14px) brightness(0.78)' }}
      transition={{ duration: 1.18, ease: cinematicEase }}
    >
      <motion.div
        className="page-cinema-wipe"
        aria-hidden="true"
        initial={{ y: '0%', scaleY: 1 }}
        animate={{ y: '-118%', scaleY: 0.92 }}
        exit={{ y: '0%', scaleY: 1 }}
        transition={{ duration: 0.95, ease: cinematicEase }}
      />
      <motion.div
        className="page-cinema-aperture"
        aria-hidden="true"
        initial={{ opacity: 1, scaleX: 1, scaleY: 1 }}
        animate={{ opacity: 0, scaleX: 1.08, scaleY: 1.22 }}
        exit={{ opacity: 0.8, scaleX: 1, scaleY: 1 }}
        transition={{ duration: 1.15, ease: cinematicEase }}
      />
      <motion.div
        className="page-cinema-content"
        initial={{ y: 34, scale: 0.992 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: -24, scale: 1.006 }}
        transition={{ duration: 1.18, ease: cinematicEase }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
