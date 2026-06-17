import { Link } from 'react-router-dom'
import RevealOnScroll from './RevealOnScroll'
import ScrollZoomFocus from './ScrollZoomFocus'
import './BrainTumourSupportSection.css'

export default function BrainTumourSupportSection({ variant = 'default' }) {
  const isDonation = variant === 'donation'

  return (
    <section className={`btsnz-section btsnz-section-${variant}`}>
      <div className="btsnz-section-inner">
        <RevealOnScroll direction="left" className="btsnz-logo-panel">
          <a href="https://braintumoursupport.org.nz" target="_blank" rel="noopener noreferrer" aria-label="Visit Brain Tumour Support NZ">
            <img src="/images/logos/btsnz.png" alt="Brain Tumour Support NZ - He waka eke noa, in it together" className="btsnz-section-logo" />
          </a>
        </RevealOnScroll>

        <RevealOnScroll direction="right" className="btsnz-copy-panel">
          <p className="section-label">Brain Tumour Support NZ</p>
          <ScrollZoomFocus origin="left">
            <h2 className="section-title">A rock-solid team for patients and whānau.</h2>
          </ScrollZoomFocus>
          <div className="gold-line" />
          <div className="section-body btsnz-section-body">
            <p>
              Brain Tumour Support NZ helps brain tumour patients feel heard, understood, and supported through the hardest parts of diagnosis, treatment, and recovery.
            </p>
            <p>
              They advocate for patients, help people access the medication and care they need, and stand beside families when everything feels overwhelming.
            </p>
            <p className="btsnz-direct-donation">
              Every dollar raised through Why Not Me? goes directly to Brain Tumour Support NZ.
            </p>
          </div>
          <div className="btsnz-actions">
            <a href="https://nogoingback.nz/nicole-white" target="_blank" rel="noopener noreferrer" className="btn-primary">
              Donate Now
            </a>
            {isDonation ? (
              <a href="https://braintumoursupport.org.nz" target="_blank" rel="noopener noreferrer" className="btn-outline">
                Visit BTSNZ
              </a>
            ) : (
              <Link to="/donate" className="btn-outline">
                Donation Details
              </Link>
            )}
          </div>
        </RevealOnScroll>
      </div>
    </section>
  )
}
