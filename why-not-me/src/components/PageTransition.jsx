import { motion, useReducedMotion } from 'framer-motion'

const cinematicEase = [0.19, 1, 0.22, 1]

export default function PageTransition({ children }) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className="page-wrapper">{children}</div>
  }

  return (
    <motion.div
      className="page-wrapper page-wrapper-cinematic"
      initial={{ opacity: 0, scale: 0.985, filter: 'blur(14px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 1.012, filter: 'blur(10px)' }}
      transition={{ duration: 1.05, ease: cinematicEase }}
    >
      <motion.div
        className="page-cinema-wipe"
        aria-hidden="true"
        initial={{ y: '0%' }}
        animate={{ y: '-115%' }}
        exit={{ y: '0%' }}
        transition={{ duration: 0.85, ease: cinematicEase }}
      />
      <motion.div
        className="page-cinema-content"
        initial={{ y: 24 }}
        animate={{ y: 0 }}
        exit={{ y: -18 }}
        transition={{ duration: 1.05, ease: cinematicEase }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
