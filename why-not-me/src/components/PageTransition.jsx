/*
 * PageTransition - Wraps page content with framer-motion animations.
 *
 * ANIMATION: Pages scale up slightly and fade in on enter,
 * then scale down and fade out on exit. This creates the
 * cinematic "zooming into" effect requested.
 *
 * USAGE: Wrap your page JSX in <PageTransition>...</PageTransition>
 *
 * TO CHANGE THE ANIMATION:
 *   - Edit 'initial', 'animate', 'exit' objects below
 *   - scale: 0.96 means it starts at 96% size and zooms to 100%
 *   - y: 20 means it slides up 20px as it enters
 */
import { motion } from 'framer-motion'

export default function PageTransition({ children }) {
  return (
    <motion.div
      className="page-wrapper"
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -20 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
