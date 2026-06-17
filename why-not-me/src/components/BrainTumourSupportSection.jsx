import RevealOnScroll from './RevealOnScroll'
import ScrollZoomFocus from './ScrollZoomFocus'
import './BrainTumourSupportSection.css'

export default function BrainTumourSupportSection({ variant = 'default' }) {
  return (
    <section className={`btsnz-section btsnz-section-${variant}`}>
      <div className="btsnz-section-glow" aria-hidden="true" />
      <div className="btsnz-section-grid">
        <RevealOnScroll direction="left" className="btsnz-logo-card">
          <a href="https://braintumoursupport.org.nz" target="_blank" rel="noopener noreferrer" aria-label="Visit Brain Tumour Support NZ">
            <img src="/images/logos/btsnz.png" alt="Brain Tumour Support NZ - He waka eke noa, in it together" className="btsnz-section-logo" />
          </a>
        </RevealOnScroll>

        <RevealOnScroll direction="right" className="btsnz-section-copy">
          <p className="section-label">Brain Tumour Support NZ</p>
          <ScrollZoomFocus origin="left"><h2 className="section-title">A rock-solid team for people facing brain tumours.</h2></ScrollZoomFocus>
          <div className="gold-line" />
          <div className="section-body">
            <p>Brain Tumour Support NZ helps brain tumour patients feel heard, understood, and supported when life becomes overwhelming.</p>
            <br />
            <p>They stand beside patients and whānau, advocate so people can access the medication and care they need, and offer steady practical and emotional support through diagnosis, treatment, and recovery.</p>
            <br />
            <p><strong>Every dollar raised through Why Not Me? goes directly to Brain Tumour Support NZ.</strong></p>
          </div>
          <div className="btsnz-section-actions">
            <a href="https://nogoingback.nz/nicole-white" target="_blank" rel="noopener noreferrer" className="btn-primary">Donate Now</a>
            <a href="https://braintumoursupport.org.nz" target="_blank" rel="noopener noreferrer" className="btn-outline">Visit BTSNZ</a>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  )
}
