import { useEffect } from 'react'

export default function Lightbox({ src, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!src) return null

  return (
    <div
      className="lightbox-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'zoom-out'
      }}
    >
      <img
        src={src}
        alt=""
        style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
