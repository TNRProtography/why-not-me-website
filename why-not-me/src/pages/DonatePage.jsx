/*
 * ============================================================
 * DONATE PAGE - /donate
 * ============================================================
 * Two donation paths:
 *   1. NoGoingBack (Nicole's personal fundraising page)
 *   2. Brain Tumour Support NZ (the charity directly)
 *
 * Plus social links for following the journey.
 *
 * TO UPDATE LINKS: Edit the href values on the <a> tags below.
 * ============================================================
 */
import { useRef } from 'react'
import PageTransition from '../components/PageTransition'
import RevealOnScroll from '../components/RevealOnScroll'
import ScrollZoomFocus from '../components/ScrollZoomFocus'
import HeroPortalTitle from '../components/HeroPortalTitle'
import BrainTumourSupportSection from '../components/BrainTumourSupportSection'

export default function DonatePage() {
  const heroRef = useRef(null)

  return (
    <PageTransition>
      {/* Hero */}
      <section className="donate-hero portal-hero" ref={heroRef}>
        <div className="portal-hero-stage">
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(/images/lores/tree-branch.jpg)',
            backgroundSize: 'cover', backgroundPosition: 'center 22%',
            filter: 'brightness(0.25)',
          }} />
          <div className="hero-portal-depth" aria-hidden="true" />
          <div className="donate-hero-content" style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 20px' }}>
            <p className="section-label">Support the Cause</p>
            <HeroPortalTitle targetRef={heroRef} desktopScale={15.5} mobileScale={9.1}>
              <h1 style={{ fontFamily: 'var(--font-hero)', fontSize: 'clamp(40px, 8vw, 80px)', lineHeight: 1 }}>
                Every d<span className="portal-letter-target" data-portal-letter>o</span>llar counts.
              </h1>
            </HeroPortalTitle>
            <p style={{ marginTop: 15, color: 'var(--warm)', fontSize: 15, maxWidth: 550, marginLeft: 'auto', marginRight: 'auto' }}>
              All money raised goes directly to Brain Tumour Support NZ, the charity Nicole has championed since 2022.
            </p>
          </div>
        </div>
      </section>

      {/* Donation cards */}
      <section className="donate-options-section" style={{ padding: '80px 40px' }}>
        <div className="donate-card-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 50, maxWidth: 1100, margin: '0 auto',
        }}>
          {/* Card 1: NoGoingBack */}
          <RevealOnScroll>
            <div className="donate-card" style={{
              padding: 50, background: 'var(--blue-40)',
              border: '1px solid var(--gold-20)', textAlign: 'center',
              transition: 'all 0.4s',
            }}>
              <div style={{ fontFamily: 'var(--font-hero)', fontSize: 36, color: 'var(--gold)', marginBottom: 15 }}>
                Donate directly.
              </div>
              <p className="section-body" style={{ maxWidth: '100%', textAlign: 'center' }}>
                Nicole is raising funds through No Going Back. Every dollar raised goes directly to Brain Tumour Support NZ, helping Kiwi families navigate the hardest diagnosis of their lives.
              </p>
              <a href="https://nogoingback.nz/nicole-white" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ marginTop: 30 }}>
                Donate through Raisely
              </a>
            </div>
          </RevealOnScroll>

          {/* Card 2: BTSNZ */}
          <RevealOnScroll delay={0.15}>
            <div className="donate-card" style={{
              padding: 50, background: 'var(--blue-40)',
              border: '1px solid var(--gold-20)', textAlign: 'center',
              transition: 'all 0.4s',
            }}>
              <div style={{ fontFamily: 'var(--font-hero)', fontSize: 36, color: 'var(--gold)', marginBottom: 15 }}>
                Support Brain Tumour Support NZ.
              </div>
              <p className="section-body" style={{ maxWidth: '100%', textAlign: 'center' }}>
                Brain Tumour Support NZ is the charity behind this campaign. He waka eke noa. In it together. They support families across Aotearoa dealing with brain tumour diagnoses.
              </p>
              <a href="https://braintumoursupport.org.nz" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ marginTop: 30 }}>
                Visit braintumoursupport.org.nz
              </a>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <BrainTumourSupportSection variant="donate" />

      {/* Social links */}
      <section className="donate-follow-section" style={{ textAlign: 'center', padding: '40px 40px 100px' }}>
        <RevealOnScroll>
          <ScrollZoomFocus scaleTo={1.58} yTo={-56} blurTo={8} opacityTo={0.18}>
            <h3 style={{ fontFamily: 'var(--font-hero)', fontSize: 36, marginBottom: 15 }}>
              Follow the journey.
            </h3>
          </ScrollZoomFocus>
          <p className="section-body" style={{ maxWidth: 600, margin: '0 auto' }}>
            Keep up with Nicole's marathon training, her recovery, and the Why Not Me? campaign across social media.
          </p>
          <div className="donate-social-actions" style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 30, flexWrap: 'wrap' }}>
            <a href="https://www.facebook.com/nicole.white.why.not.me" target="_blank" rel="noopener noreferrer" className="btn-outline">Facebook</a>
            <a href="https://www.tiktok.com/@nicole.white.why.not.me" target="_blank" rel="noopener noreferrer" className="btn-outline">TikTok</a>
            <a href="mailto:why.not.me.nicole.white@gmail.com" className="btn-outline">Email Nicole</a>
          </div>
        </RevealOnScroll>
      </section>
    </PageTransition>
  )
}
