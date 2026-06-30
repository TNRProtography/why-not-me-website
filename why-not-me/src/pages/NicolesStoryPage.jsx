/*
 * ============================================================
 * NICOLE'S STORY - /nicoles-story
 * ============================================================
 * Cinematic scroll-driven retelling of Nicole's journey.
 * Opens with a visible hero (not blank), unfolds through
 * chapters with parallax, sticky reveals, and atmospheric
 * pacing. Matches the site's existing voice and design.
 * ============================================================
 */
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { trackCtaClick, trackDonateClick, trackPhotoClick } from '../utils/analytics'
import './NicolesStoryPage.css'

/* Scroll-triggered reveal */
function Reveal({ children, delay = 0, className = '', direction = 'up' }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  const variants = {
    up: { hidden: { opacity: 0, y: 50 }, show: { opacity: 1, y: 0 } },
    left: { hidden: { opacity: 0, x: -50 }, show: { opacity: 1, x: 0 } },
    right: { hidden: { opacity: 0, x: 50 }, show: { opacity: 1, x: 0 } },
    fade: { hidden: { opacity: 0 }, show: { opacity: 1 } },
    scale: { hidden: { opacity: 0, scale: 0.88 }, show: { opacity: 1, scale: 1 } },
  }
  const v = variants[direction] || variants.up
  return (
    <motion.div ref={ref} className={className}
      initial={v.hidden}
      animate={isInView ? v.show : v.hidden}
      transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
    >{children}</motion.div>
  )
}

/* Full-screen parallax image */
function Cinema({ src, alt, darken = 0.6, children, className = '' }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%'])
  return (
    <section className={`story-cinema ${className}`} ref={ref}>
      <motion.div className="story-cinema-bg" style={{ backgroundImage: `url(${src})`, y }} aria-label={alt} />
      <div className="story-cinema-darken" style={{ opacity: darken }} />
      <div className="story-cinema-content">{children}</div>
    </section>
  )
}

/* Sticky text with parallax image */
function StickyReveal({ src, alt, children, flip = false }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const imgY = useTransform(scrollYProgress, [0, 1], ['5%', '-5%'])
  return (
    <section className={`story-sticky ${flip ? 'story-sticky-flip' : ''}`} ref={ref}>
      <div className="story-sticky-img-wrap">
        <motion.img src={src} alt={alt} className="story-sticky-img" style={{ y: imgY }} />
      </div>
      <div className="story-sticky-text">{children}</div>
    </section>
  )
}

/* Chapter divider */
function Chapter({ title }) {
  return (
    <div className="story-chapter">
      <Reveal direction="fade">
        <div className="story-chapter-rule" />
        <div className="story-chapter-label">{title}</div>
      </Reveal>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ */
export default function NicolesStoryPage() {
  const heroRef = useRef(null)
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef, offset: ['start start', 'end start'],
  })
  const heroImgScale = useTransform(heroProgress, [0, 1], [1, 1.15])
  const heroImgY = useTransform(heroProgress, [0, 1], ['0%', '20%'])
  const heroTextY = useTransform(heroProgress, [0, 1], ['0%', '40%'])
  const heroTextOpacity = useTransform(heroProgress, [0, 0.5], [1, 0])

  return (
    <PageTransition>

      {/* ═══════ HERO ═══════ */}
      <section className="story-hero" ref={heroRef}>
        <motion.div
          className="story-hero-bg"
          style={{ backgroundImage: 'url(/images/lores/sunset-portrait.jpg)', scale: heroImgScale, y: heroImgY }}
        />
        <div className="story-hero-overlay" />
        <motion.div className="story-hero-content" style={{ y: heroTextY, opacity: heroTextOpacity }}>
          <motion.p className="story-hero-eyebrow"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
          >The Full Story</motion.p>
          <motion.h1 className="story-hero-title"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >Nicole White.</motion.h1>
          <motion.p className="story-hero-subtitle"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
          >Ten years. Four brain surgeries. A marathon to run.</motion.p>
          <motion.div className="story-hero-scroll"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
          >
            <span className="story-scroll-text">Scroll to begin</span>
            <motion.span className="story-scroll-line"
              animate={{ scaleY: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════ THE GIRL ═══════ */}
      <StickyReveal src="/images/lores/portrait-smile.jpg" alt="Nicole White">
        <Reveal>
          <p className="story-label">Before all of this</p>
          <h2 className="story-title">She was just a teenager.</h2>
          <div className="story-gold-line" />
        </Reveal>
        <Reveal delay={0.1}>
          <p className="story-body-lg">
            Competitive. Sporty. Always busy with netball, squash, and whatever else she could get her hands on.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="story-body">
            Nicole White was 16 when she had her first seizure. She was behind the wheel, right after getting her licence. She had another seizure in November 2016 and started on anti-seizure medication. Nobody knew yet what was growing inside her head.
          </p>
        </Reveal>
      </StickyReveal>

      {/* ═══════ DIAGNOSIS ═══════ */}
      <Chapter title="The Diagnosis" />

      <Cinema src="/images/surgery/gown.jpg" alt="Nicole before surgery" darken={0.68}>
        <Reveal>
          <p className="story-cinema-year">2017</p>
          <h2 className="story-cinema-headline">They said it would not come back.</h2>
        </Reveal>
      </Cinema>

      <section className="story-prose">
        <Reveal>
          <p className="story-body-lg">
            In May 2017, Nicole was diagnosed with a brain tumour. An emergency MRI confirmed what an earlier assessment had missed. By November, at 17 years old, she was in surgery for the first time in her life.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="story-body">
            She woke up in the recovery room crying. Overwhelmed and very sick. The doctors told her the tumour would not grow back. She was given the all clear.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="story-accent">It grew back.</p>
        </Reveal>
      </section>

      {/* ═══════ THE TUMOUR ═══════ */}
      <Chapter title="The Tumour" />

      <section className="story-dramatic">
        <Reveal direction="scale">
          <h2 className="story-word">PLNTY.</h2>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="story-dramatic-sub">Polymorphous Low-grade Neuro-epithelial Tumour of the Young.</p>
        </Reveal>
      </section>

      <section className="story-prose story-prose-narrow">
        <Reveal>
          <p className="story-body-lg">
            Nicole's tumour is an extremely rare brain tumour type, typically low-grade and slow-growing. One of only a few documented cases in the world.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="story-body">
            At this point, Nicole's medical team believed the tumour was manageable. But it kept coming back. Again and again.
          </p>
        </Reveal>
      </section>

      {/* ═══════ TERRY ═══════ */}
      <section className="story-prose story-prose-narrow">
        <Reveal>
          <p className="story-accent">She named it Terry.</p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="story-body-lg">
            Terry the Tumour. That is what Nicole called it. Not a clinical label. Not something whispered about. A name.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="story-body">
            Naming it was deliberate. It turned something terrifying and abstract into something she could talk about openly, with family, with friends, with anyone. It took the weight out of the room. Instead of awkward silences and careful language, people could just ask, "How's Terry?" And Nicole could answer honestly, without it feeling like the whole world was falling apart every time.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="story-body">
            It made the conversations easier. It made the hard days a little lighter. Terry was unwelcome, stubborn, and kept showing up uninvited, but at least now he had a name and Nicole could talk about him on her own terms.
          </p>
        </Reveal>
      </section>

      {/* ═══════ THE FIGHT ═══════ */}
      <Chapter title="The Fight" />

      <section className="story-stats">
        <Reveal className="story-stat"><div className="story-stat-num">4</div><div className="story-stat-lbl">Brain surgeries</div></Reveal>
        <Reveal className="story-stat" delay={0.1}><div className="story-stat-num">10</div><div className="story-stat-lbl">Year journey</div></Reveal>
        <Reveal className="story-stat" delay={0.2}><div className="story-stat-num">6</div><div className="story-stat-lbl">Months high-dose chemo</div></Reveal>
      </section>

      {/* Timeline */}
      <section className="story-timeline">
        <div className="story-tl-line" />

        <Reveal className="story-tl-item">
          <div className="story-tl-dot" />
          <div className="story-tl-year">2018</div>
          <p className="story-tl-text">Gap year started. Still being told she was all clear. Then in November, found out Terry had grown back again.</p>
        </Reveal>

        <Reveal className="story-tl-item" delay={0.05}>
          <div className="story-tl-dot" />
          <div className="story-tl-year">2019</div>
          <p className="story-tl-text">Started university in Dunedin. A mid-year scan showed growth. Second brain surgery in August. Studies put on hold.</p>
        </Reveal>

        <Reveal className="story-tl-item" delay={0.05}>
          <div className="story-tl-dot" />
          <div className="story-tl-year">2020</div>
          <p className="story-tl-text">Started nursing in February. Six months post-op, Terry was back again. Started on Dabrafenib, an oral chemotherapy drug.</p>
        </Reveal>

        <Reveal className="story-tl-item" delay={0.05}>
          <div className="story-tl-dot" />
          <div className="story-tl-year">2021</div>
          <p className="story-tl-text">Terry officially stable. Felt miserable on Dabrafenib but it meant she could keep studying. She pushed through.</p>
        </Reveal>

        <Reveal className="story-tl-item" delay={0.05}>
          <div className="story-tl-dot story-tl-dot-gold" />
          <div className="story-tl-year">2022</div>
          <p className="story-tl-text">Ran the Dunedin half marathon for Brain Tumour Support NZ, raising $4,500. Graduated as a registered nurse while on chemotherapy.</p>
        </Reveal>

        <Reveal className="story-tl-item" delay={0.05}>
          <div className="story-tl-dot" />
          <div className="story-tl-year">2023</div>
          <p className="story-tl-text">Started her new grad nursing job in Greymouth. Met Dean. Ran the Queenstown Marathon while on chemo. By the end of the year, Terry showed changes and she was taken off Dabrafenib.</p>
        </Reveal>
      </section>

      {/* ═══════ THE TURN ═══════ */}
      <Chapter title="The Turn" />

      <Cinema src="/images/surgery/bed.jpg" alt="Nicole in hospital" darken={0.75} className="story-cinema-dark">
        <Reveal>
          <p className="story-cinema-year story-cinema-year-danger">2024</p>
          <h2 className="story-cinema-headline">Terry changed his spots.</h2>
        </Reveal>
      </Cinema>

      <section className="story-prose">
        <Reveal>
          <p className="story-body-lg">
            Changes to Terry raised concern. Nicole had surgery in June. Terry grew back, so she had surgery again in November. Her fourth.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="story-body">
            At the same time, her father was going through his own prostate cancer journey. He had surgery three days after Nicole.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="story-body">
            Then came the call. Come in and discuss the histology. The PLNTY had undergone malignant transformation, something nearly unheard of. There are only a couple of documented cases in the world. What had been manageable for seven years was now aggressive and likely to end her life.
          </p>
        </Reveal>
      </section>

      {/* Surgery images */}
      <section className="story-image-strip">
        <Reveal direction="fade" className="story-strip-img"><img src="/images/surgery/stitches.jpg" alt="Surgery" onClick={() => trackPhotoClick("/images/surgery/stitches.jpg", "nicoles_story")} /></Reveal>
        <Reveal direction="fade" delay={0.1} className="story-strip-img"><img src="/images/surgery/bandage.jpg" alt="Bandage" onClick={() => trackPhotoClick("/images/surgery/bandage.jpg", "nicoles_story")} /></Reveal>
        <Reveal direction="fade" delay={0.2} className="story-strip-img"><img src="/images/surgery/recovery.jpg" alt="Recovery" onClick={() => trackPhotoClick("/images/surgery/recovery.jpg", "nicoles_story")} /></Reveal>
      </section>

      {/* ═══════ THE TREATMENT ═══════ */}
      <Chapter title="The Treatment" />

      <StickyReveal src="/images/surgery/hospital2.jpg" alt="Hospital" flip>
        <Reveal>
          <p className="story-label">2025</p>
          <h2 className="story-title">The reality behind the resilience.</h2>
          <div className="story-gold-line" />
        </Reveal>
        <Reveal delay={0.1}>
          <p className="story-body">
            Radiation began in February. Monday to Friday, six and a half weeks, with low-dose Temozolomide running alongside it.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="story-body">
            After a short break, high-dose Temozolomide for six months. One week on, three weeks off. Most people tolerate it well. Nicole did not.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="story-body">
            Vomiting constantly. No appetite. Exhausted in ways sleep could not fix. But on her off-weeks, she went back to work. She spent years caring for patients in the same health system keeping her alive. That knowledge, both patient and professional, runs through every part of this story.
          </p>
        </Reveal>
      </StickyReveal>

      <Cinema src="/images/lores/rain-run.jpg" alt="Running in the rain" darken={0.5}>
        <Reveal>
          <p className="story-quote">"There's no reason to stop living life because of that."</p>
          <p className="story-quote-by">Dean, Nicole's partner</p>
        </Reveal>
      </Cinema>

      {/* ═══════ REMISSION ═══════ */}
      <Chapter title="Remission" />

      <section className="story-dramatic story-dramatic-glow">
        <Reveal direction="scale">
          <p className="story-dramatic-year">2026</p>
          <h2 className="story-word story-word-gold">In remission.</h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="story-dramatic-sub">
            Found out on her birthday. Discharged from oncology one day shy of the anniversary of starting treatment.
          </p>
        </Reveal>
      </section>

      <Cinema src="/images/lores/arms-ocean.jpg" alt="Arms spread at the ocean" darken={0.3}>
        <Reveal>
          <p className="story-body-lg" style={{ textAlign: 'center', maxWidth: 650, margin: '0 auto', textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>
            Back at work. Training for a marathon. Living with the knowledge that Terry could return, but choosing to live fully anyway.
          </p>
        </Reveal>
      </Cinema>

      {/* ═══════ THE MARATHON ═══════ */}
      <Chapter title="The Marathon" />

      <Cinema src="/images/lores/hero-running-coast.jpg" alt="Nicole running" darken={0.45}>
        <Reveal>
          <p className="story-label" style={{ color: 'var(--gold)' }}>Queenstown Marathon 2026</p>
          <h2 className="story-cinema-headline">Not just another finish line.</h2>
        </Reveal>
      </Cinema>

      <section className="story-prose">
        <Reveal>
          <p className="story-body-lg">
            Nicole has already run a half marathon while on chemo, raised $4,500 for Brain Tumour Support NZ, and pushed through a full marathon when treatment was still part of daily life.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="story-body">
            This return is different. It is about the history behind the running, the disappointment she still carries from 2023, and the chance to see how far remission, training, and a bit of vengeance can take her.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="story-accent">
            "So far I am feeling good, feeling strong and capable. I am happy with where I am at the moment."
          </p>
        </Reveal>
      </section>

      {/* Photo grid */}
      <section className="story-photos">
        <Reveal direction="fade" className="story-photo span-2"><img src="/images/lores/running-front.jpg" alt="Running" onClick={() => trackPhotoClick("/images/lores/running-front.jpg", "nicoles_story")} /></Reveal>
        <Reveal direction="fade" delay={0.05} className="story-photo"><img src="/images/lores/sunlight-run.jpg" alt="Sunlight" onClick={() => trackPhotoClick("/images/lores/sunlight-run.jpg", "nicoles_story")} /></Reveal>
        <Reveal direction="fade" delay={0.1} className="story-photo"><img src="/images/lores/coastal-run-2.jpg" alt="Coast" onClick={() => trackPhotoClick("/images/lores/coastal-run-2.jpg", "nicoles_story")} /></Reveal>
        <Reveal direction="fade" delay={0.05} className="story-photo"><img src="/images/lores/forest-portrait.jpg" alt="Forest" onClick={() => trackPhotoClick("/images/lores/forest-portrait.jpg", "nicoles_story")} /></Reveal>
        <Reveal direction="fade" delay={0.1} className="story-photo span-2"><img src="/images/lores/jumping-path.jpg" alt="Jumping" onClick={() => trackPhotoClick("/images/lores/jumping-path.jpg", "nicoles_story")} /></Reveal>
      </section>

      {/* ═══════ IN THEIR WORDS ═══════ */}
      <Chapter title="In Their Words" />

      <section className="story-quotes-section">
        <Reveal className="story-quote-card">
          <blockquote>"Anything that we felt must have been magnified a hundred times for Nicole."</blockquote>
          <cite>Deborah &middot; On living with Terry</cite>
        </Reveal>
        <Reveal className="story-quote-card" delay={0.1}>
          <blockquote>"That was independence. That was the ability to go and do her own thing."</blockquote>
          <cite>Vernon, Nicole's father &middot; On her studying in Dunedin</cite>
        </Reveal>
        <Reveal className="story-quote-card" delay={0.15}>
          <blockquote>"There's no reason to stop living life because of that."</blockquote>
          <cite>Dean, Nicole's partner &middot; On a terminal diagnosis</cite>
        </Reveal>
      </section>

      {/* ═══════ THE QUESTION ═══════ */}
      <Cinema src="/images/lores/cliff-pose.jpg" alt="Nicole on the cliff" darken={0.55}>
        <Reveal direction="scale">
          <h2 className="story-final-q">Why not me?</h2>
        </Reveal>
        <Reveal delay={0.3}>
          <p className="story-final-a">"Because if it's not me, then it's someone else."</p>
          <p className="story-quote-by">Nicole White</p>
        </Reveal>
      </Cinema>

      {/* ═══════ CTA ═══════ */}
      <section className="story-cta">
        <Reveal>
          <p className="story-label">Be part of the road</p>
          <h2 className="story-cta-title">Run with her.</h2>
          <div className="story-gold-line" style={{ margin: '24px auto' }} />
        </Reveal>
        <Reveal delay={0.1}>
          <p className="story-cta-body">
            Every donation claims a kilometre of Nicole's Queenstown Marathon. Dedicate it to someone you love and she will carry their name with her. All support goes to Brain Tumour Support NZ.
          </p>
        </Reveal>
        <Reveal delay={0.2} className="story-cta-btns">
          <a href="https://nogoingback.nz/nicole-white" target="_blank" rel="noopener noreferrer" className="btn-primary" onClick={() => trackDonateClick('nicoles_story_bottom')}>Donate Now</a>
          <Link to="/dedicate" className="btn-outline" onClick={() => trackCtaClick('Donate & Dedicate a Km', 'nicoles_story_bottom', '/dedicate')}>Donate &amp; Dedicate a Km</Link>
          <Link to="/documentary" className="btn-outline" onClick={() => trackCtaClick('Watch the Documentary', 'nicoles_story_bottom', '/documentary')}>Watch the Documentary</Link>
        </Reveal>
      </section>

    </PageTransition>
  )
}
