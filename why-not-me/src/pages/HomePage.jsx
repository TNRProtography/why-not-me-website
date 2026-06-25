/*
 * ============================================================
 * HOMEPAGE.JSX - Main Scrolling Landing Page
 * ============================================================
 * This is the big one. It contains all the homepage sections:
 *
 *   1. HERO          - Full-screen cinematic intro with parallax
 *   2. STORY         - Nicole's overview with portrait photo
 *   3. STATS         - 10 years / 4 surgeries / 2026 remission
 *   4. TUMOUR        - PLNTY explanation with surgery photos
 *   5. TREATMENT     - What four surgeries actually looked like
 *   6. TIMELINE      - Individual year-by-year breakdown (2016-2026)
 *   7. PHOTO GRID    - Gallery of campaign photos
 *   8. QUOTES        - Family quotes
 *   9. FACTS         - Brain tumour statistics for NZ
 *  10. MARATHON      - Training update and 16km stat
 *  11. DOCO TEASER   - Link through to /documentary
 *  12. CONNECT       - Social links, email, donate CTA
 *
 * IMAGES: All referenced from /public/images/ folder.
 * To swap a photo, just replace the file in that folder
 * keeping the same filename, or change the src path here.
 *
 * TEXT: All copy is inline in this file for easy editing.
 * Search for the section name (e.g. "TUMOUR") to find it.
 * ============================================================
 */
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import RevealOnScroll from '../components/RevealOnScroll'
import ScrollZoomFocus from '../components/ScrollZoomFocus'
import HeroPortalTitle from '../components/HeroPortalTitle'
import Lightbox from '../components/Lightbox'
import BrainTumourSupportSection from '../components/BrainTumourSupportSection'
import { trackCtaClick, trackLightboxOpen, trackDonateClick, trackSocialClick, trackExternalLink } from '../utils/analytics'
import './HomePage.css'

export default function HomePage() {
  const [lightbox, setLightbox] = useState(null)
  const heroRef = useRef(null)

  /* Parallax effect on hero background image */
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1])
  const heroSupportOpacity = useTransform(scrollYProgress, [0, 0.26, 0.56], [1, 0.82, 0])
  const heroSupportY = useTransform(scrollYProgress, [0, 0.56], ['0%', '22%'])

  return (
    <PageTransition>
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />

      {/* ========== 1. HERO ========== */}
      <section className="hero portal-hero" ref={heroRef}>
        <div className="portal-hero-stage">
          <motion.div
            className="hero-bg"
            style={{
              backgroundImage: 'url(/images/lores/hero-running-coast.jpg)',
              y: heroY,
              scale: heroScale,
            }}
          />
          <div className="hero-overlay" />
          <div className="hero-light" />
          <div className="hero-portal-depth" aria-hidden="true" />
          <motion.div className="hero-content">
            <HeroPortalTitle targetRef={heroRef} className="hero-title-scroll-focus" desktopScale={18} mobileScale={10.5}>
              <motion.h1
                className="hero-title"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                Why N<span className="portal-letter-target" data-portal-letter>o</span>t Me?
              </motion.h1>
            </HeroPortalTitle>
            <motion.div style={{ opacity: heroSupportOpacity, y: heroSupportY }}>
              <motion.p
                className="hero-subtitle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.7 }}
              >
                Nicole White &middot; Brain Tumour Survivor
              </motion.p>
              <motion.p
                className="hero-tagline"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 1 }}
              >
                "Follow my journey as my legs get stronger and my hair gets longer."
              </motion.p>
            </motion.div>
          </motion.div>
          <motion.div
            className="hero-scroll-indicator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <span />
          </motion.div>
        </div>
      </section>

      {/* ========== 2. FEATURE VIDEO ========== */}
      <section className="home-video-section">
        <div className="home-video-grid">
          <RevealOnScroll direction="left" className="home-video-copy">
            <p className="section-label">Watch First</p>
            <ScrollZoomFocus origin="left"><h2 className="section-title">The story, before the facts.</h2></ScrollZoomFocus>
            <div className="gold-line" />
            <div className="section-body">
              <p>This film sits near the start because the campaign is not just dates, scans, and fundraising targets. It is a feeling first. It is the reason people stop scrolling, listen properly, and understand why this next chapter matters.</p>
              <br />
              <p>The video autoplays muted so the page still feels calm. Tap the player for sound.</p>
            </div>
          </RevealOnScroll>
          <RevealOnScroll direction="right" className="home-video-card">
            <div className="home-video-frame">
              <iframe
                src="https://www.youtube.com/embed/jF1Y3IP9Rj4?autoplay=1&mute=1&loop=1&playlist=jF1Y3IP9Rj4&controls=1&modestbranding=1&playsinline=1&rel=0"
                title="Why Not Me campaign video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <p className="home-video-caption">Autoplays muted. Tap the player for sound.</p>
          </RevealOnScroll>
          <RevealOnScroll className="home-video-dedicate-cta">
            <p className="section-label">Race-Day Dedication</p>
            <p>
              Donate to Nicole's No Going Back campaign and dedicate one of her Queenstown Marathon kilometres to someone you love. Add a name, write a short message, and Nicole will carry it with her.
            </p>
            <Link to="/dedicate" className="btn-outline" onClick={() => trackCtaClick('Donate & Dedicate a Km', 'video_section', '/dedicate')}>Donate & Dedicate a Km</Link>
          </RevealOnScroll>
        </div>
      </section>

      {/* ========== 3. NICOLE'S STORY (condensed) ========== */}
      <section style={{ padding: '120px 40px' }}>
        <div className="story-grid">
          <RevealOnScroll direction="left">
            <img
              src="/images/lores/portrait-smile.jpg"
              alt="Nicole White"
              className="story-portrait"
            />
          </RevealOnScroll>
          <RevealOnScroll direction="right">
            <p className="section-label">Nicole's Story</p>
            <ScrollZoomFocus origin="left"><h2 className="section-title">Ten years. Four surgeries. Another marathon to run.</h2></ScrollZoomFocus>
            <div className="gold-line" />
            <div className="section-body">
              <p>At 16, Nicole White was behind the wheel when she had her first seizure. By May 2017, she had a brain tumour diagnosis, and by November that year, her first brain surgery. She was told it would not come back. It came back. Again and again.</p>
              <br />
              <p>Through four brain surgeries, years of chemotherapy and a six and a half week radiation programme, Nicole refused to stop. She graduated as a registered nurse while on treatment, ran the Queenstown Marathon on chemo, and in late 2024 was told her tumour had become aggressive and would likely end her life.</p>
              <br />
              <p style={{ color: 'var(--warm)', fontStyle: 'italic' }}>In 2026, she was declared in remission.</p>
            </div>
            <div style={{ marginTop: 30 }}>
              <Link to="/nicoles-story" className="btn-primary" onClick={() => trackCtaClick('Read the Full Story', 'story_section', '/nicoles-story')}>Read the Full Story</Link>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ========== 4. STATS ========== */}
      <section style={{ padding: '40px 40px 100px' }}>
        <RevealOnScroll>
          <div className="stats-bar">
            <div className="stat">
              <div className="stat-number">10</div>
              <div className="stat-label">Year Journey</div>
            </div>
            <div className="stat">
              <div className="stat-number">4</div>
              <div className="stat-label">Brain Surgeries</div>
            </div>
            <div className="stat">
              <div className="stat-number">2026</div>
              <div className="stat-label">In Remission</div>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* ========== 7. PHOTO GRID ========== */}
      <section style={{ padding: '0' }}>
        <div className="photo-grid">
          <img src="/images/lores/arms-ocean.jpg" alt="Arms spread at ocean" className="span-2" onClick={() => { setLightbox('/images/lores/arms-ocean.jpg'); trackLightboxOpen('arms-ocean') }} />
          <img src="/images/lores/sunset-portrait.jpg" alt="Sunset" onClick={() => { setLightbox('/images/lores/sunset-portrait.jpg'); trackLightboxOpen('sunset-portrait') }} />
          <img src="/images/lores/running-dog.jpg" alt="Running with Cindy" onClick={() => { setLightbox('/images/lores/running-dog.jpg'); trackLightboxOpen('running-dog') }} />
          <img src="/images/lores/sunlight-run.jpg" alt="Trail run" onClick={() => { setLightbox('/images/lores/sunlight-run.jpg'); trackLightboxOpen('sunlight-run') }} />
          <img src="/images/lores/coastal-run-3.jpg" alt="Coastal run" onClick={() => { setLightbox('/images/lores/coastal-run-3.jpg'); trackLightboxOpen('coastal-run-3') }} />
          <img src="/images/lores/jumping-path.jpg" alt="Jumping for joy" className="span-2" onClick={() => { setLightbox('/images/lores/jumping-path.jpg'); trackLightboxOpen('jumping-path') }} />
        </div>
      </section>

      {/* ========== 8. QUOTES ========== */}
      <section className="quotes-section">
        <div className="quotes-inner">
          <RevealOnScroll>
            <div style={{ textAlign: 'center', marginBottom: 80 }}>
              <p className="section-label">In Their Own Words</p>
              <ScrollZoomFocus><h2 className="section-title">The people around her.</h2></ScrollZoomFocus>
            </div>
          </RevealOnScroll>

          <RevealOnScroll className="quote-block">
            <blockquote className="quote-text">"Anything that we felt must have been magnified a hundred times for Nicole."</blockquote>
            <cite className="quote-attr">Deborah &middot; On living with the tumour</cite>
          </RevealOnScroll>

          <RevealOnScroll className="quote-block">
            <blockquote className="quote-text">"That was independence. That was the ability to go and do her own thing."</blockquote>
            <cite className="quote-attr">Vernon (Nicole's father) &middot; On her studying in Dunedin</cite>
          </RevealOnScroll>

          <RevealOnScroll className="quote-block">
            <blockquote className="quote-text">"There's no reason to stop living life because of that."</blockquote>
            <cite className="quote-attr">Dean (Nicole's partner) &middot; On a terminal diagnosis</cite>
          </RevealOnScroll>

          <RevealOnScroll className="quote-block">
            <blockquote className="quote-text">"Why not me? Because if it's not me, then it's someone else."</blockquote>
            <cite className="quote-attr">Nicole White &middot; The meaning behind the campaign</cite>
          </RevealOnScroll>
        </div>
      </section>

      {/* ========== 9. BRAIN TUMOUR FACTS ========== */}
      <section style={{ padding: '120px 40px' }}>
        <RevealOnScroll>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p className="section-label">Brain Tumour Facts</p>
            <ScrollZoomFocus><h2 className="section-title">The numbers behind the silence.</h2></ScrollZoomFocus>
          </div>
        </RevealOnScroll>
        <div className="facts-grid">
          <RevealOnScroll className="fact-card" delay={0}><div className="fact-number">#1</div><div className="fact-text">Cancer killer in people under 40. Brain tumours are the most common.</div></RevealOnScroll>
          <RevealOnScroll className="fact-card" delay={0.1}><div className="fact-number">277</div><div className="fact-text">Deaths per year in New Zealand from brain cancer.</div></RevealOnScroll>
          <RevealOnScroll className="fact-card" delay={0.2}><div className="fact-number">17 yrs</div><div className="fact-text">Since the most recent drug used to treat brain cancer in NZ was approved.</div></RevealOnScroll>
          <RevealOnScroll className="fact-card" delay={0.3}><div className="fact-number">1 in 3</div><div className="fact-text">People know someone affected by a brain tumour.</div></RevealOnScroll>
        </div>
        <RevealOnScroll>
          <p style={{ textAlign: 'center', marginTop: 40, fontSize: 14, color: 'var(--white-50)', maxWidth: 700, marginLeft: 'auto', marginRight: 'auto' }}>
            Brain cancer survival rates are among the lowest of all cancers and have barely changed in 30 years. The cause of brain cancers is largely unknown.
          </p>
        </RevealOnScroll>
      </section>

      {/* ========== 9b. BRAIN TUMOUR SUPPORT NZ ========== */}
      <BrainTumourSupportSection
        eyebrow="The Charity"
        title="Who Brain Tumour Support NZ are."
        imageSide="left"
        paragraphs={[
          'Brain Tumour Support NZ is the charity at the heart of this whole campaign, and Nicole knows first hand just how much they help. When you are handed a brain tumour diagnosis, it can feel like nobody else on earth understands what is happening inside your head. They change that.',
          'They connect patients with other people living through the same thing, so there is always someone to talk to who truly gets it. They give families a safe space to let the thoughts and the emotions out. And they fight in the background too, advocating to get treatments funded and made available here in New Zealand.',
          'He waka eke noa. In it together. That is not just their tagline, it is exactly how it feels when they are in your corner.',
        ]}
      />

      {/* ========== 10. MARATHON TRAINING ========== */}
      <section className="marathon-section">
        <div className="marathon-bg" style={{ backgroundImage: 'url(/images/lores/running-motion.jpg)' }} />
        <div className="marathon-film-light" />
        <RevealOnScroll className="marathon-content">
          <p className="section-label">Queenstown Marathon</p>
          <ScrollZoomFocus><h2 className="section-title">Not just another finish line.</h2></ScrollZoomFocus>
          <div className="gold-line" style={{ margin: '20px auto' }} />
          <div className="section-body" style={{ maxWidth: '100%', textAlign: 'center', margin: '0 auto' }}>
            <p>At this stage Nicole is focussing on getting her body moving again. It has had a long and gruelling 12 months of treatment and surgeries. Although she is 12 months post all that, it still takes a massive toll on her body.</p>
            <br />
            <p>Queenstown matters because this is not Nicole's first time lining up for something hard. She has already run a half marathon while on chemo, raised $4,500 for Brain Tumour Support NZ, and pushed herself through a full marathon when treatment was still part of daily life.</p>
            <br />
            <p>This return is different. It is about the history behind the running, the disappointment she still carries from 2023, and the chance to see how far remission, training, and a little bit of vengeance can take her.</p>
          </div>
          <div style={{ marginTop: 50 }}>
            <div className="marathon-stat">16km</div>
            <div className="marathon-stat-label">Furthest run so far &middot; May 2026</div>
          </div>
          <p style={{ fontStyle: 'italic', marginTop: 30, color: 'var(--warm)', fontSize: 18 }}>
            "So far I'm feeling good, feeling strong and capable. I'm happy with where I am at the moment."
          </p>
          <div style={{ marginTop: 34 }}>
            <Link to="/queenstown-marathon" className="btn-primary" onClick={() => trackCtaClick('Why Queenstown?', 'marathon_section', '/queenstown-marathon')}>Why Queenstown?</Link>
            <Link to="/dedicate" className="btn-outline" style={{ marginLeft: 14 }} onClick={() => trackCtaClick('Donate & Dedicate a Km', 'marathon_section', '/dedicate')}>Donate & Dedicate a Km</Link>
          </div>
        </RevealOnScroll>
      </section>

      {/* ========== 11. DOCUMENTARY TEASER ========== */}
      <section style={{ padding: '120px 40px', textAlign: 'center' }}>
        <RevealOnScroll>
          <p className="section-label">The Documentary</p>
          <ScrollZoomFocus><h2 className="section-title">A Little Bit of Vengeance.</h2></ScrollZoomFocus>
          <div className="gold-line" style={{ margin: '20px auto' }} />
          <p className="section-body" style={{ maxWidth: 600, margin: '0 auto 40px' }}>
            The full story, told by Nicole and the people closest to her. From diagnosis to remission, from the waiting rooms to the finish line. Released May 22, 2026.
          </p>
          <Link to="/documentary" className="btn-primary" onClick={() => trackCtaClick('Watch the Documentary', 'documentary_teaser', '/documentary')}>Watch the Documentary</Link>
        </RevealOnScroll>
      </section>

      {/* ========== 12. CONNECT ========== */}
      <section className="connect-section">
        <div className="connect-bg" style={{ backgroundImage: 'url(/images/lores/coast-gaze.jpg)' }} />
        <RevealOnScroll className="connect-inner">
          <p className="section-label">Get Involved</p>
          <ScrollZoomFocus><h2 className="section-title">Run with me.</h2></ScrollZoomFocus>
          <p className="section-body" style={{ maxWidth: 600, margin: '0 auto' }}>
            Nicole is available for print and digital interviews, TV and radio appearances, podcast features, brain tumour awareness campaigns, marathon and fundraising coverage, and health and wellness storytelling.
          </p>
          <div className="social-links">
            <a href="https://www.facebook.com/nicole.white.why.not.me/" target="_blank" rel="noopener noreferrer" className="btn-outline" onClick={() => trackSocialClick('facebook', 'connect_section')}>Facebook</a>
            <a href="https://www.tiktok.com/@nicole_white_why_not_me" target="_blank" rel="noopener noreferrer" className="btn-outline" onClick={() => trackSocialClick('tiktok', 'connect_section')}>TikTok</a>
            <a href="https://www.youtube.com/@WhyNotMeNicoleWhite" target="_blank" rel="noopener noreferrer" className="btn-outline" onClick={() => trackSocialClick('youtube', 'connect_section')}>YouTube</a>
            <a href="mailto:nicole@whynotme.co.nz" className="btn-outline" onClick={() => trackSocialClick('email', 'connect_section')}>Email</a>
          </div>
          <div style={{ marginTop: 30 }}>
            <a href="https://nogoingback.nz/nicole-white" target="_blank" rel="noopener noreferrer" className="btn-primary" onClick={() => trackDonateClick('connect_section')}>Donate Now</a>
          </div>
        </RevealOnScroll>
      </section>
    </PageTransition>
  )
}
