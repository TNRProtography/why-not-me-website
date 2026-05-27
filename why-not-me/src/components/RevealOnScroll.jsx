/*
 * RevealOnScroll - Animate elements as they enter the viewport.
 *
 * PROPS:
 *   direction: 'up' (default) | 'left' | 'right' | 'none'
 *     Controls which direction the element slides in from.
 *   delay: number (seconds) - stagger delay for sequenced reveals
 *   className: additional CSS classes
 *   children: the content to reveal
 *
 * HOW IT WORKS:
 *   Uses framer-motion's whileInView to trigger animations
 *   when the element scrolls into the viewport. The 'once: true'
 *   setting means it only animates once (doesn't re-trigger).
 *
 * USAGE:
 *   <RevealOnScroll>
 *     <h2>This slides up when scrolled into view</h2>
 *   </RevealOnScroll>
 *
 *   <RevealOnScroll direction="left" delay={0.2}>
 *     <img src="..." />
 *   </RevealOnScroll>
 */
import { motion } from 'framer-motion'

const directionMap = {
  up: { y: 50, x: 0 },
  left: { x: -60, y: 0 },
  right: { x: 60, y: 0 },
  none: { x: 0, y: 0 },
}

export default function RevealOnScroll({
  children,
  direction = 'up',
  delay = 0,
  className = '',
}) {
  const offset = directionMap[direction] || directionMap.up

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
