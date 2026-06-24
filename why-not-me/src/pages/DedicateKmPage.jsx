/*
 * ============================================================
 * DEDICATE A KILOMETRE PAGE - /dedicate
 * ============================================================
 * 42 claimable kilometres of the Queenstown Marathon route.
 * Each visitor can dedicate a km to someone, leaving a name
 * and short message. Stored in Cloudflare KV via the worker.
 *
 * KV SETUP:
 *   Before deploying, create a KV namespace in Cloudflare:
 *     wrangler kv namespace create DEDICATIONS
 *   Then paste the returned id into wrangler.jsonc.
 * ============================================================
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import PageTransition from '../components/PageTransition'
import RevealOnScroll from '../components/RevealOnScroll'
import './DedicateKmPage.css'

const TOTAL_KM = 42

export default function DedicateKmPage() {
  const [dedications, setDedications] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedKm, setSelectedKm] = useState(null)
  const [viewingKm, setViewingKm] = useState(null)
  const [formData, setFormData] = useState({ name: '', dedicatedTo: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const claimed = Object.keys(dedications).length
  const remaining = TOTAL_KM - claimed

  const fetchDedications = useCallback(async () => {
    try {
      const res = await fetch('/api/dedications')
      if (res.ok) {
        const data = await res.json()
        setDedications(data.dedications || {})
      }
    } catch {
      // silent fail, show empty grid
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDedications()
  }, [fetchDedications])

  const handleOpen = (km) => {
    if (dedications[String(km)]) {
      setViewingKm(km)
    } else {
      setSelectedKm(km)
      setFormData({ name: '', dedicatedTo: '', message: '' })
      setError('')
    }
  }

  const handleClose = () => {
    setSelectedKm(null)
    setViewingKm(null)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/dedications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          km: selectedKm,
          name: formData.name,
          dedicatedTo: formData.dedicatedTo,
          message: formData.message,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        setSubmitting(false)
        return
      }

      setDedications(data.dedications || {})
      setSelectedKm(null)
    } catch {
      setError('Could not connect. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Close modal on escape key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (loading) {
    return (
      <PageTransition>
        <div className="dedicate-loading">Loading dedications…</div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      {/* Hero */}
      <section className="dedicate-hero">
        <div className="dedicate-hero-bg" />
        <div className="dedicate-hero-content">
          <p className="section-label">Queenstown Marathon</p>
          <h1>Dedicate a Kilometre.</h1>
          <p className="dedicate-hero-subtitle">
            Nicole is running 42.2 km for Brain Tumour Support NZ. Claim a kilometre, dedicate it to someone who matters to you, and she will carry every name along the road with her.
          </p>
        </div>
      </section>

      {/* Counter */}
      <div className="dedicate-counter-bar">
        <div className="dedicate-counter-inner">
          <div className="dedicate-counter-stat">
            <span className="dedicate-counter-number">{claimed}</span>
            <span className="dedicate-counter-label">Claimed</span>
          </div>
          <div className="dedicate-counter-divider" />
          <div className="dedicate-counter-stat">
            <span className="dedicate-counter-number">{remaining}</span>
            <span className="dedicate-counter-label">Remaining</span>
          </div>
          <div className="dedicate-counter-divider" />
          <div className="dedicate-counter-stat">
            <span className="dedicate-counter-number">42.2</span>
            <span className="dedicate-counter-label">km Total</span>
          </div>
        </div>
      </div>

      {/* Route grid */}
      <section className="dedicate-grid-section">
        <RevealOnScroll>
          <div className="dedicate-grid">
            {Array.from({ length: TOTAL_KM }, (_, i) => {
              const km = i + 1
              const dedication = dedications[String(km)]
              const isClaimed = !!dedication

              return (
                <div
                  key={km}
                  className={`km-marker ${isClaimed ? 'km-marker-claimed' : 'km-marker-open'}`}
                  onClick={() => handleOpen(km)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleOpen(km) }}
                  aria-label={isClaimed
                    ? `Kilometre ${km}, dedicated by ${dedication.name} for ${dedication.dedicatedTo}`
                    : `Kilometre ${km}, available — click to dedicate`
                  }
                >
                  <span className="km-marker-number">{km}</span>
                  {isClaimed ? (
                    <>
                      <span className="km-marker-claimed-name">{dedication.dedicatedTo}</span>
                      <span className="km-marker-claimed-for">by {dedication.name}</span>
                    </>
                  ) : (
                    <span className="km-marker-status">Open</span>
                  )}
                </div>
              )
            })}
            {/* The final .2 km */}
            <div className="km-marker km-marker-finish" aria-label="Finish line — 0.2 km">
              <span className="km-marker-number">.2</span>
              <span className="km-marker-status">Finish</span>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* Bottom CTA */}
      <section className="dedicate-cta-section">
        <RevealOnScroll>
          <p className="section-label">Every Kilometre Counts</p>
          <p className="section-body">
            Whether you dedicate a kilometre, donate, or share this page, you are part of the road Nicole is running. Every bit of support goes to Brain Tumour Support NZ.
          </p>
          <div className="dedicate-cta-buttons">
            <a href="https://nogoingback.nz/nicole-white" target="_blank" rel="noopener noreferrer" className="btn-primary">Donate Now</a>
            <Link to="/queenstown-marathon" className="btn-outline">The Marathon Story</Link>
          </div>
        </RevealOnScroll>
      </section>

      {/* ---- Claim modal ---- */}
      {selectedKm && (
        <div className="dedicate-modal-overlay" onClick={handleClose}>
          <div className="dedicate-modal" onClick={(e) => e.stopPropagation()}>
            <button className="dedicate-modal-close" onClick={handleClose} aria-label="Close">&times;</button>
            <div className="dedicate-modal-km">Km {selectedKm}</div>
            <div className="dedicate-modal-heading">Dedicate This Kilometre</div>
            <form className="dedicate-form" onSubmit={handleSubmit}>
              <div className="dedicate-field">
                <label htmlFor="dedicate-name">Your Name</label>
                <input
                  id="dedicate-name"
                  type="text"
                  placeholder="Your name"
                  maxLength={80}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  autoFocus
                  required
                />
              </div>
              <div className="dedicate-field">
                <label htmlFor="dedicate-for">Dedicating This Km To</label>
                <input
                  id="dedicate-for"
                  type="text"
                  placeholder="A person, a group, or a cause"
                  maxLength={80}
                  value={formData.dedicatedTo}
                  onChange={(e) => setFormData({ ...formData, dedicatedTo: e.target.value })}
                  required
                />
              </div>
              <div className="dedicate-field">
                <label htmlFor="dedicate-message">Message (optional)</label>
                <textarea
                  id="dedicate-message"
                  placeholder="A short message for Nicole to carry with her"
                  maxLength={150}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
                <div className="dedicate-field-hint">{formData.message.length}/150</div>
              </div>
              <button type="submit" className="btn-primary dedicate-submit" disabled={submitting}>
                {submitting ? 'Claiming…' : 'Claim This Kilometre'}
              </button>
              {error && <p className="dedicate-error">{error}</p>}
            </form>
          </div>
        </div>
      )}

      {/* ---- View modal ---- */}
      {viewingKm && dedications[String(viewingKm)] && (
        <div className="dedicate-modal-overlay" onClick={handleClose}>
          <div className="dedicate-modal dedicate-view-modal" onClick={(e) => e.stopPropagation()}>
            <button className="dedicate-modal-close" onClick={handleClose} aria-label="Close">&times;</button>
            <div className="dedicate-modal-km">Km {viewingKm}</div>
            <div className="dedicate-view-for">Dedicated to</div>
            <div className="dedicate-view-name">{dedications[String(viewingKm)].dedicatedTo}</div>
            {dedications[String(viewingKm)].message && (
              <p className="dedicate-view-message">"{dedications[String(viewingKm)].message}"</p>
            )}
            <div className="dedicate-view-line" />
            <div className="dedicate-view-by">By {dedications[String(viewingKm)].name}</div>
          </div>
        </div>
      )}
    </PageTransition>
  )
}
