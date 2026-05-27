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
import Lightbox from '../components/Lightbox'
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
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  return (
    <PageTransition>
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />

      {/* ========== 1. HERO ========== */}
      <section className="hero" ref={heroRef}>
        <motion.div
          className="hero-bg"
          style={{
            backgroundImage: 'url(/images/lores/hero-running-coast.jpg)',
            y: heroY,
            scale: heroScale,
          }}
        />
        <div className="hero-overlay" />
        <motion.div className="hero-content" style={{ opacity: heroOpacity }}>
          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            Why Not Me?
          </motion.h1>
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
        <motion.div
          className="hero-scroll-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <span />
        </motion.div>
      </section>

      {/* ========== 2. NICOLE'S STORY ========== */}
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
            <h2 className="section-title">Ten years. Four surgeries. Another marathon to run.</h2>
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
            <h2 className="section-title" style={{ fontSize: 'clamp(44px, 7vw, 90px)' }}>PLNTY.</h2>
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
          <RevealOnScroll direction="right" className="tumour-images">
            <img src="/images/surgery/bed.jpg" alt="Nicole in hospital" onClick={() => setLightbox('/images/surgery/bed.jpg')} />
            <img src="/images/surgery/bandage.jpg" alt="Post surgery bandage" onClick={() => setLightbox('/images/surgery/bandage.jpg')} />
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
            <h2 className="section-title">The reality behind the resilience.</h2>
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
            <h2 className="section-title">A decade of fighting.</h2>
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
              <h2 className="section-title">The people around her.</h2>
            </div>
          </RevealOnScroll>

          <RevealOnScroll className="quote-block">
            <blockquote className="quote-text">"I always wonder, I still wonder, what it is like for her to go to bed at night and know that this thing is lurking. You get told all is good and then all is not so good. And you think: where does it all end?"</blockquote>
            <cite className="quote-attr">Vernon (Nicole's father)</cite>
          </RevealOnScroll>

          <RevealOnScroll className="quote-block">
            <blockquote className="quote-text">"There was just heartbreak, really. As soon as everyone left, we got into a big group hug. Nicole's niece was sitting on the floor playing and that was the only noise for probably three minutes. Apart from some sniffling."</blockquote>
            <cite className="quote-attr">Dean (Nicole's partner) &middot; About the tumour turning malignant in 2024</cite>
          </RevealOnScroll>

          <RevealOnScroll className="quote-block">
            <blockquote className="quote-text">"I always thought there is no point in a relationship because I have got this big thing hanging over my head. Then when I told him, he did not even flinch. He was in there and he made it so clear that he was there for everything."</blockquote>
            <cite className="quote-attr">Nicole White &middot; About meeting Dean</cite>
          </RevealOnScroll>
        </div>
      </section>

      {/* ========== 9. BRAIN TUMOUR FACTS ========== */}
      <section style={{ padding: '120px 40px' }}>
        <RevealOnScroll>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p className="section-label">Brain Tumour Facts</p>
            <h2 className="section-title">The numbers behind the silence.</h2>
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

      {/* ========== 10. MARATHON TRAINING ========== */}
      <section className="marathon-section">
        <div className="marathon-bg" style={{ backgroundImage: 'url(/images/lores/running-motion.jpg)' }} />
        <RevealOnScroll className="marathon-content">
          <p className="section-label">Marathon Training</p>
          <h2 className="section-title">How is training going?</h2>
          <div className="gold-line" style={{ margin: '20px auto' }} />
          <div className="section-body" style={{ maxWidth: '100%', textAlign: 'center', margin: '0 auto' }}>
            <p>At this stage Nicole is focussing on getting her body moving again. It has had a long and gruelling 12 months of treatment and surgeries. Although she is 12 months post all that, it still takes a massive toll on her body.</p>
            <br />
            <p>Training right now is about listening to her body and knowing how far she can push it. It is a balancing act between working shift work, finding time to rest and time to be active, as well as battling with ongoing fatigue. Training includes running, swimming, going to the gym, and taking it slow some days by just going for a walk.</p>
            <br />
            <p>The Queenstown Marathon is in November, so she has given herself enough time to gradually build.</p>
          </div>
          <div style={{ marginTop: 50 }}>
            <div className="marathon-stat">16km</div>
            <div className="marathon-stat-label">Furthest run so far &middot; May 2026</div>
          </div>
          <p style={{ fontStyle: 'italic', marginTop: 30, color: 'var(--warm)', fontSize: 18 }}>
            "So far I'm feeling good, feeling strong and capable. I'm happy with where I am at the moment."
          </p>
        </RevealOnScroll>
      </section>

      {/* ========== 11. DOCUMENTARY TEASER ========== */}
      <section style={{ padding: '120px 40px', textAlign: 'center' }}>
        <RevealOnScroll>
          <p className="section-label">The Documentary</p>
          <h2 className="section-title">A Little Bit of Vengeance.</h2>
          <div className="gold-line" style={{ margin: '20px auto' }} />
          <p className="section-body" style={{ maxWidth: 600, margin: '0 auto 40px' }}>
            The full story, told by Nicole and the people closest to her. From diagnosis to remission, from the waiting rooms to the finish line. Released May 22, 2026.
          </p>
          <Link to="/documentary" className="btn-primary">Watch the Documentary</Link>
        </RevealOnScroll>
      </section>

      {/* ========== 12. CONNECT ========== */}
      <section className="connect-section">
        <div className="connect-bg" style={{ backgroundImage: 'url(/images/lores/coast-gaze.jpg)' }} />
        <RevealOnScroll className="connect-inner">
          <p className="section-label">Get Involved</p>
          <h2 className="section-title">Run with me.</h2>
          <p className="section-body" style={{ maxWidth: 600, margin: '0 auto' }}>
            Nicole is available for print and digital interviews, TV and radio appearances, podcast features, brain tumour awareness campaigns, marathon and fundraising coverage, and health and wellness storytelling.
          </p>
          <div className="social-links">
            <a href="https://www.facebook.com/nicole.white.why.not.me" target="_blank" rel="noopener noreferrer" className="btn-outline">Facebook</a>
            <a href="https://www.tiktok.com/@nicole.white.why.not.me" target="_blank" rel="noopener noreferrer" className="btn-outline">TikTok</a>
            <a href="mailto:why.not.me.nicole.white@gmail.com" className="btn-outline">Email</a>
          </div>
          <div style={{ marginTop: 30 }}>
            <a href="https://nogoingback.nz/nicole-white" target="_blank" rel="noopener noreferrer" className="btn-primary">Donate Now</a>
          </div>
        </RevealOnScroll>
      </section>
    </PageTransition>
  )
}
