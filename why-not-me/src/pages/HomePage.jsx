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
        </div>
      </section>

      {/* ========== 3. NICOLE'S STORY ========== */}
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
          </RevealOnScroll>
        </div>
      </section>

      {/* ========== 3. STATS ========== */}
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

      {/* ========== 4. THE TUMOUR (PLNTY) ========== */}
      <section className="tumour-section">
        <div className="tumour-grid">
          <RevealOnScroll direction="left">
            <p className="section-label">The Tumour</p>
            <ScrollZoomFocus origin="left" scaleTo={2.05}><h2 className="section-title" style={{ fontSize: 'clamp(44px, 7vw, 90px)' }}>PLNTY.</h2></ScrollZoomFocus>
            <h3 className="tumour-subtitle">One of only a few.</h3>
            <div className="gold-line" />
            <div className="section-body">
              <p>Nicole's tumour is a Polymorphous Low-grade Neuro-epithelial Tumour of the Young, known as a PLNTY. It is an extremely rare brain tumour type, typically low-grade and slow-growing. For one to transform into a high-grade, aggressive tumour is nearly unheard of.</p>
              <br />
              <p>There are only a couple of documented cases in the world of a PLNTY undergoing malignant transformation. Nicole's case is, by any clinical measure, exceptional.</p>
              <br />
              <p>In late 2024, after her fourth brain surgery, histology confirmed the change. What had been a manageable, low-grade tumour for seven years had become something far more dangerous. Nicole was told it would most likely end her life. What followed was radiation, concurrent with low-dose Temozolomide, then six months of high-dose chemotherapy.</p>
              <br />
              <p>In 2026, Nicole was officially declared in remission.</p>
            </div>
          </RevealOnScroll>
          <RevealOnScroll direction="right" className="tumour-images tumour-images--single">
            <img src="/images/surgery/bed.jpg" alt="Nicole in hospital" onClick={() => setLightbox('/images/surgery/bed.jpg')} />
          </RevealOnScroll>
        </div>
      </section>

      {/* ========== 5. TREATMENT ========== */}
      <section style={{ padding: '120px 40px' }}>
        <div className="treatment-grid">
          <RevealOnScroll direction="left" className="treatment-images">
            <img src="/images/surgery/gown.jpg" alt="Before surgery" onClick={() => setLightbox('/images/surgery/gown.jpg')} />
            <img src="/images/surgery/stitches.jpg" alt="Surgery stitches" onClick={() => setLightbox('/images/surgery/stitches.jpg')} />
            <img src="/images/surgery/recovery.jpg" alt="Recovery" onClick={() => setLightbox('/images/surgery/recovery.jpg')} />
            <img src="/images/surgery/hospital2.jpg" alt="Hospital" onClick={() => setLightbox('/images/surgery/hospital2.jpg')} />
          </RevealOnScroll>
          <RevealOnScroll direction="right" className="treatment-text">
            <p className="section-label">Treatment</p>
            <ScrollZoomFocus origin="left"><h2 className="section-title">The reality behind the resilience.</h2></ScrollZoomFocus>
            <div className="gold-line" />
            <div className="section-body">
              <p>Nicole did not tolerate her treatment well. She had four brain surgeries in total. The first was in November 2017 at age 17. It was her first surgery of any kind. She woke up in the recovery room crying, overwhelmed and very sick.</p>
              <br />
              <p>After the November 2024 surgery, the histology came back. The tumour had changed. A six and a half week radiation programme followed in Christchurch, Monday to Friday, concurrent with low-dose Temozolomide.</p>
              <br />
              <p>High-dose chemo stretched across six months: one week on, three weeks off. Nicole's on-weeks were brutal. Vomiting constantly, unable to eat, exhausted in ways sleep could not fix. But on her off-weeks, she went back to work.</p>
              <br />
              <p>She spent years caring for patients in the same health system keeping her alive. That dual knowledge, patient and professional, runs through every part of this story.</p>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ========== 6. TIMELINE (individual years) ========== */}
      <section style={{ padding: '80px 40px 120px' }}>
        <RevealOnScroll>
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <p className="section-label">Key Timeline</p>
            <ScrollZoomFocus><h2 className="section-title">A decade of fighting.</h2></ScrollZoomFocus>
          </div>
        </RevealOnScroll>
        <div className="timeline">
          <div className="timeline-line" />

          {/* 2016 */}
          <RevealOnScroll className="timeline-item">
            <div className="timeline-dot" />
            <div className="timeline-year">2016</div>
            <div className="timeline-text">Had her first seizure while driving, right after getting her licence. Had another seizure in November. Started on anti-seizure medication.</div>
          </RevealOnScroll>

          {/* 2017 */}
          <RevealOnScroll className="timeline-item" delay={0.05}>
            <div className="timeline-dot" />
            <div className="timeline-year">2017</div>
            <div className="timeline-text">Diagnosed with a brain tumour in May. Initially told it was not a tumour, but an emergency MRI confirmed it. Found out it had some rare characteristics. Another MRI in October showed growth. First brain surgery in November. Missed end of year exams. Got given the all clear and was told the tumour would not grow back.</div>
          </RevealOnScroll>

          {/* 2018 */}
          <RevealOnScroll className="timeline-item" delay={0.05}>
            <div className="timeline-dot" />
            <div className="timeline-year">2018</div>
            <div className="timeline-text">Gap year started. Still being told the tumour would not grow back and she was all clear. Then in November, found out the tumour had grown back again.</div>
          </RevealOnScroll>

          {/* 2019 */}
          <RevealOnScroll className="timeline-item" delay={0.05}>
            <div className="timeline-dot" />
            <div className="timeline-year">2019</div>
            <div className="timeline-text">Started university in Dunedin. Scan mid-year showed the tumour had grown and needed action. Had her second surgery in August. Had to put studies on hold.</div>
          </RevealOnScroll>

          {/* 2020 */}
          <RevealOnScroll className="timeline-item" delay={0.05}>
            <div className="timeline-dot" />
            <div className="timeline-year">2020</div>
            <div className="timeline-text">Started nursing in February. Scan at six months post-op showed tumour regrowth again. Started on Dabrafenib, an oral chemotherapy drug.</div>
          </RevealOnScroll>

          {/* 2021 */}
          <RevealOnScroll className="timeline-item" delay={0.05}>
            <div className="timeline-dot" />
            <div className="timeline-year">2021</div>
            <div className="timeline-text">Tumour officially stable. Felt miserable on Dabrafenib but it meant she could keep studying, so she pushed through.</div>
          </RevealOnScroll>

          {/* 2022 */}
          <RevealOnScroll className="timeline-item" delay={0.05}>
            <div className="timeline-dot" />
            <div className="timeline-year">2022</div>
            <div className="timeline-text">Settled into student life. Ran the Dunedin half marathon for Brain Tumour Support NZ, raising $4,500. Graduated as a registered nurse.</div>
          </RevealOnScroll>

          {/* 2023 */}
          <RevealOnScroll className="timeline-item" delay={0.05}>
            <div className="timeline-dot" />
            <div className="timeline-year">2023</div>
            <div className="timeline-text">Started her new grad nursing job in Greymouth. Met Dean. Tumour showed small changes and she was taken off Dabrafenib at the end of November. Ran the Queenstown Marathon while on chemo.</div>
          </RevealOnScroll>

          {/* 2024 */}
          <RevealOnScroll className="timeline-item" delay={0.05}>
            <div className="timeline-dot timeline-dot-danger" />
            <div className="timeline-year">2024</div>
            <div className="timeline-text">Changes to the tumour raised concern. Had surgery in June. The tumour grew back, so she had surgery again in November. At the same time, Dad was going through his own prostate cancer journey and had surgery three days after Nicole. Got a call from the surgeon to come in and discuss histology. Was told the tumour had changed its spots and was now aggressive and likely terminal. Started planning for radiation and chemo.</div>
          </RevealOnScroll>

          {/* 2025 */}
          <RevealOnScroll className="timeline-item" delay={0.05}>
            <div className="timeline-dot" />
            <div className="timeline-year">2025</div>
            <div className="timeline-text">Started the process of egg preservation. Began radiation in February, sessions Monday to Friday for six and a half weeks, with low-dose Temozolomide running alongside it. After a small break, started high-dose Temozolomide for six months. Most people tolerate it well. Nicole did not. Vomiting constantly, no appetite. Returned to work in small increments during her off-weeks.</div>
          </RevealOnScroll>

          {/* 2026 */}
          <RevealOnScroll className="timeline-item" delay={0.05}>
            <div className="timeline-dot timeline-dot-gold" />
            <div className="timeline-year" style={{ color: 'var(--gold)' }}>2026</div>
            <div className="timeline-text">Officially went into remission. Found out on her birthday that she had been discharged from oncology, one day shy of the anniversary of starting treatment. Back at work. Training for a marathon. Living with the knowledge that it could return, but choosing to live fully anyway.</div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ========== 7. PHOTO GRID ========== */}
      <section style={{ padding: '0' }}>
        <div className="photo-grid">
          <img src="/images/lores/arms-ocean.jpg" alt="Arms spread at ocean" className="span-2" onClick={() => setLightbox('/images/lores/arms-ocean.jpg')} />
          <img src="/images/lores/sunset-portrait.jpg" alt="Sunset" onClick={() => setLightbox('/images/lores/sunset-portrait.jpg')} />
          <img src="/images/lores/running-dog.jpg" alt="Running with Cindy" onClick={() => setLightbox('/images/lores/running-dog.jpg')} />
          <img src="/images/lores/sunlight-run.jpg" alt="Trail run" onClick={() => setLightbox('/images/lores/sunlight-run.jpg')} />
          <img src="/images/lores/coastal-run-3.jpg" alt="Coastal run" onClick={() => setLightbox('/images/lores/coastal-run-3.jpg')} />
          <img src="/images/lores/jumping-path.jpg" alt="Jumping for joy" className="span-2" onClick={() => setLightbox('/images/lores/jumping-path.jpg')} />
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
            <Link to="/queenstown-marathon" className="btn-primary">Why Queenstown?</Link>
            <Link to="/dedicate" className="btn-outline" style={{ marginLeft: 14 }}>Dedicate a Km — Free</Link>
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
          <Link to="/documentary" className="btn-primary">Watch the Documentary</Link>
          <div style={{ maxWidth: 720, margin: '34px auto 0', padding: '28px 24px', border: '1px solid var(--gold-20)', background: 'rgba(168, 142, 93, 0.06)' }}>
            <p className="section-label" style={{ marginBottom: 10 }}>Free Race-Day Dedication</p>
            <p className="section-body" style={{ maxWidth: 560, margin: '0 auto 22px', textAlign: 'center' }}>
              Dedicate one of Nicole's Queenstown Marathon kilometres to someone you love. It is completely free — add a name, write a short message, and Nicole will carry it with her.
            </p>
            <Link to="/dedicate" className="btn-outline">Dedicate a Km — Free</Link>
          </div>
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
            <a href="https://www.facebook.com/nicole.white.why.not.me/" target="_blank" rel="noopener noreferrer" className="btn-outline">Facebook</a>
            <a href="https://www.tiktok.com/@nicole_white_why_not_me" target="_blank" rel="noopener noreferrer" className="btn-outline">TikTok</a>
            <a href="https://www.youtube.com/@WhyNotMeNicoleWhite" target="_blank" rel="noopener noreferrer" className="btn-outline">YouTube</a>
            <a href="mailto:nicole@whynotme.co.nz" className="btn-outline">Email</a>
          </div>
          <div style={{ marginTop: 30 }}>
            <a href="https://nogoingback.nz/nicole-white" target="_blank" rel="noopener noreferrer" className="btn-primary">Donate Now</a>
          </div>
        </RevealOnScroll>
      </section>
    </PageTransition>
  )
}
