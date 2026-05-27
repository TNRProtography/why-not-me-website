/*
 * ============================================================
 * DOCUMENTARY PAGE - /documentary
 * ============================================================
 * Shows the "A Little Bit of Vengeance" documentary.
 * 
 * KEY ELEMENTS:
 *   - Hero with autumn-dance photo background
 *   - Embedded YouTube video (responsive 16:9)
 *   - Share/donate CTAs
 *
 * TO CHANGE THE VIDEO:
 *   Replace the YouTube ID in the iframe src below.
 *   Current: pnLhzEzXKpc
 * ============================================================
 */
import { Link } from 'react-router-dom'
import PageTransition from '../components/PageTransition'
import RevealOnScroll from '../components/RevealOnScroll'
import ScrollZoomFocus from '../components/ScrollZoomFocus'

export default function DocumentaryPage() {
  return (
    <PageTransition>
      {/* Hero banner */}
      <section className="documentary-hero" style={{
        height: '60vh', position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/images/lores/autumn-dance.jpg)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'brightness(0.2)', transform: 'scale(1.05)',
        }} />
        <div className="documentary-hero-content" style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 20px' }}>
          <p className="section-label">The Documentary</p>
          <ScrollZoomFocus scaleTo={2.15} yTo={-94} blurTo={14} opacityTo={0} offset={['start 58%', 'end top']}>
            <h1 style={{
              fontFamily: 'var(--font-hero)',
              fontSize: 'clamp(40px, 8vw, 100px)',
              lineHeight: 1,
            }}>A Little Bit of Vengeance.</h1>
          </ScrollZoomFocus>
          <p style={{ marginTop: 15, color: 'var(--warm)', fontSize: 14, letterSpacing: 2 }}>
            RELEASED MAY 22, 2026
          </p>
        </div>
      </section>

      {/* Documentary content */}
      <section className="documentary-content-section" style={{ maxWidth: 900, margin: '0 auto', padding: '80px 40px' }}>
        <RevealOnScroll>
          <p className="section-body" style={{ maxWidth: '100%', textAlign: 'center', marginBottom: 20 }}>
            This is Nicole's story in full. Told by the people who were there, through the surgeries, through the waiting rooms, through the quiet moments when nobody knew what to say. From a 16 year old having her first seizure behind the wheel, to a 26 year old training for a marathon in remission. This documentary does not hold back, and neither did she.
          </p>
        </RevealOnScroll>

        {/* YouTube embed - responsive container */}
        <RevealOnScroll>
          <div className="documentary-video-frame" style={{
            position: 'relative', paddingBottom: '56.25%', height: 0,
            overflow: 'hidden', margin: '40px 0',
            border: '1px solid var(--gold-20)',
          }}>
            <iframe
              src="https://www.youtube.com/embed/pnLhzEzXKpc"
              title="A Little Bit of Vengeance - Why Not Me Documentary"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            />
          </div>
        </RevealOnScroll>

        {/* Share + Donate CTAs */}
        <RevealOnScroll>
          <div className="documentary-share-card" style={{ textAlign: 'center', marginTop: 60 }}>
            <div className="gold-line" style={{ margin: '0 auto 30px' }} />
            <ScrollZoomFocus scaleTo={1.6} yTo={-58} blurTo={8} opacityTo={0.18}>
              <h3 style={{ fontFamily: 'var(--font-hero)', fontSize: 36, marginBottom: 15 }}>
                Share this story.
              </h3>
            </ScrollZoomFocus>
            <p className="section-body" style={{ maxWidth: '100%', textAlign: 'center' }}>
              If this story moved you, share it. Every view, every share, every conversation about brain tumours matters. Brain cancer survival rates have barely changed in 30 years. Stories like Nicole's help change that.
            </p>
            <div className="documentary-actions" style={{ marginTop: 30, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="https://www.facebook.com/nicole.white.why.not.me" target="_blank" rel="noopener noreferrer" className="btn-outline">
                Share on Facebook
              </a>
              <a href="https://nogoingback.nz/nicole-white" target="_blank" rel="noopener noreferrer" className="btn-primary">
                Donate Now
              </a>
            </div>
          </div>
        </RevealOnScroll>
      </section>
    </PageTransition>
  )
}
