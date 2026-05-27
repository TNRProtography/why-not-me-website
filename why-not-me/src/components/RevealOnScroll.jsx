import { motion, useReducedMotion } from 'framer-motion'

const directionMap = {
  up: { y: 68, x: 0, rotateX: 3 },
  down: { y: -48, x: 0, rotateX: -2 },
  left: { x: -76, y: 0, rotateY: -3 },
  right: { x: 76, y: 0, rotateY: 3 },
  none: { x: 0, y: 0, rotateX: 0, rotateY: 0 },
}

export default function RevealOnScroll({
  children,
  direction = 'up',
  delay = 0,
  className = '',
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
        scale: 0.975,
        filter: 'blur(18px)',
        ...offset,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        rotateX: 0,
        rotateY: 0,
        filter: 'blur(0px)',
      }}
      viewport={{ once: true, amount: 0.24, margin: '0px 0px -80px 0px' }}
      transition={{
        duration: 1.1,
        delay,
        ease: [0.19, 1, 0.22, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
