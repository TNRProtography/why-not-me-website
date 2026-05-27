import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'

export default function ScrollAtmosphere() {
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 42,
    damping: 22,
    mass: 0.72,
  })

  const veilY = useTransform(smoothProgress, [0, 1], ['-10vh', '10vh'])
  const lensScale = useTransform(smoothProgress, [0, 0.5, 1], [0.96, 1.08, 0.98])
  const lensOpacity = useTransform(smoothProgress, [0, 0.05, 0.92, 1], [0, 0.52, 0.48, 0])
  const progressScale = useTransform(smoothProgress, [0, 1], [0, 1])

  if (reduceMotion) return null

  return (
    <div className="scroll-atmosphere" aria-hidden="true">
      <motion.div className="scroll-atmosphere-lens" style={{ y: veilY, scale: lensScale, opacity: lensOpacity }} />
      <motion.div className="scroll-atmosphere-progress" style={{ scaleX: progressScale }} />
      <div className="scroll-atmosphere-letterbox scroll-atmosphere-letterbox-top" />
      <div className="scroll-atmosphere-letterbox scroll-atmosphere-letterbox-bottom" />
    </div>
  )
}
