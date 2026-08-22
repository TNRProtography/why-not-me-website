/*
 * Lightbox - Click any image to view it fullscreen.
 * Click or press Escape to close.
 *
 * USAGE:
 *   const [lightbox, setLightbox] = useState(null)
 *   <img onClick={() => setLightbox('/images/lores/photo.jpg')} />
 *   <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
 */
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Lightbox({ src, onClose }) {
  /* Close on Escape key */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (src) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [src, onClose])

  return (
    <AnimatePresence>
      {src && (
        <motion.div
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(13,13,13,0.97)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <motion.img
            src={src}
            alt=""
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
