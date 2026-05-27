import { motion, useReducedMotion } from 'framer-motion'

const cinematicEase = [0.16, 1, 0.3, 1]

const directionMap = {
  up: { y: 82, x: 0, rotateX: 4, rotateY: 0, transformOrigin: '50% 65%' },
  down: { y: -58, x: 0, rotateX: -3, rotateY: 0, transformOrigin: '50% 35%' },
  left: { x: -92, y: 0, rotateY: -4, rotateX: 0, transformOrigin: '0% 50%' },
  right: { x: 92, y: 0, rotateY: 4, rotateX: 0, transformOrigin: '100% 50%' },
  none: { x: 0, y: 0, rotateX: 0, rotateY: 0, transformOrigin: '50% 50%' },
}

export default function RevealOnScroll({
  children,
  direction = 'up',
  delay = 0,
  className = '',
  amount = 0.28,
}) {
  const reduceMotion = useReducedMotion()
  const offset = directionMap[direction] || directionMap.up

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={`reveal-layer ${className}`.trim()}
      initial={{
        opacity: 0,
        scale: 0.955,
        filter: 'blur(22px) brightness(0.78)',
        clipPath: 'inset(8% 0% 8% 0%)',
        transformOrigin: offset.transformOrigin,
        ...offset,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        rotateX: 0,
        rotateY: 0,
        filter: 'blur(0px) brightness(1)',
        clipPath: 'inset(0% 0% 0% 0%)',
      }}
      viewport={{ once: true, amount, margin: '0px 0px -90px 0px' }}
      transition={{
        duration: 1.35,
        delay,
        ease: cinematicEase,
      }}
    >
      {children}
    </motion.div>
  )
}
