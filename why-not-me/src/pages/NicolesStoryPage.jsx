/*
 * ============================================================
 * NICOLE'S STORY - /nicoles-story
 * ============================================================
 * A cinematic, scroll-driven retelling of Nicole's journey.
 * Designed to feel like watching a documentary unfold.
 *
 * Uses framer-motion scroll transforms, IntersectionObserver
 * reveals, parallax backgrounds, Ken Burns effects, and
 * dramatic pacing between chapters.
 * ============================================================
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import './NicolesStoryPage.css'

/* ── Scroll-triggered text reveal ─────────────────────────── */
function Reveal({ children, delay = 0, className = '', direction = 'up' }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  const dirMap = {
    up: { hidden: { opacity: 0, y: 60 }, visible: { opacity: 1, y: 0 } },
    down: { hidden: { opacity: 0, y: -40 }, visible: { opacity: 1, y: 0 } },
    left: { hidden: { opacity: 0, x: -60 }, visible: { opacity: 1, x: 0 } },
    right: { hidden: { opacity: 0, x: 60 }, visible: { opacity: 1, x: 0 } },
    fade: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
    scale: { hidden: { opacity: 0, scale: 0.85 }, visible: { opacity: 1, scale: 1 } },
  }

  const v = dirMap[direction] || dirMap.up

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={v.hidden}
      animate={isInView ? v.visible : v.hidden}
      transition={{ duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/* ── Parallax full-screen image section ───────────────────── */
function CinematicImage({ src, alt, darken = 0.6, children, className = '', kenBurns = true }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-10%', '10%'])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.08, 1.12, 1.18])

  return (
    <section className={`story-cinema ${className}`} ref={ref}>
      <motion.div
        className={`story-cinema-bg ${kenBurns ? 'ken-burns' : ''}`}
        style={{ backgroundImage: `url(${src})`, y, scale }}
        aria-label={alt}
      />
      <div className="story-cinema-darken" style={{ opacity: darken }} />
      <div className="story-cinema-content">
        {children}
      </div>
    </section>
  )
}

/* ── Counter animation ────────────────────────────────────── */
function Counter({ value, suffix = '', duration = 2000 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const num = parseInt(value, 10)
    if (isNaN(num)) { setDisplay(value); return }
    let start = 0
    const step = Math.max(1, Math.floor(num / (duration / 16)))
    const timer = setInterval(() => {
      start += step
      if (start >= num) { setDisplay(num); clearInterval(timer) }
      else setDisplay(start)
    }, 16)
    return () => clearInterval(timer)
  }, [isInView, value, duration])

  return <span ref={ref}>{display}{suffix}</span>
}

/* ── Chapter divider ──────────────────────────────────────── */
function ChapterBreak({ number, title }) {
  return (
    <div className="story-chapter-break">
      <Reveal direction="fade">
        <div className="story-chapter-number">{number}</div>
        <div className="story-chapter-line" />
        <div className="story-chapter-title">{title}</div>
      </Reveal>
    </div>
  )
}

/* ── Year marker for timeline ─────────────────────────────── */
function YearBlock({ year, children, image, danger = false, gold = false }) {
  return (
    <div className="story-year-block">
      <Reveal direction="left" className="story-year-visual">
        {image && <img src={image} alt={`${year}`} className="story-year-image" />}
      </Reveal>
      <Reveal direction="right" className="story-year-text">
        <div className={`story-year-number ${danger ? 'danger' : ''} ${gold ? 'gold' : ''}`}>{year}</div>
        <div className="story-year-body">{children}</div>
      </Reveal>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                            */
/* ═══════════════════════════════════════════════════════════ */
export default function NicolesStoryPage() {
  const openingRef = useRef(null)
  const { scrollYProgress: openingProgress } = useScroll({
    target: openingRef,
    offset: ['start start', 'end start'],
  })
  const titleOpacity = useTransform(openingProgress, [0, 0.15, 0.4], [0, 1, 1])
  const titleScale = useTransform(openingProgress, [0, 0.15, 0.5], [0.7, 1, 1.3])
  const titleY = useTransform(openingProgress, [0.3, 0.6], ['0%', '-30%'])
  const subtitleOpacity = useTransform(openingProgress, [0.18, 0.32, 0.55], [0, 1, 0])
  const openingFade = useTransform(openingProgress, [0.5, 0.75], [1, 0])

  return (
    <PageTransition>
      {/* ═══════ COLD OPEN ═══════ */}
      <section className="story-opening" ref={openingRef}>
        <motion.div className="story-opening-content" style={{ opacity: openingFade }}>
          <motion.h1
            className="story-opening-title"
            style={{ opacity: titleOpacity, scale: titleScale, y: titleY }}
          >
            Why N<span className="story-o">o</span>t Me?
          </motion.h1>
          <motion.p className="story-opening-sub" style={{ opacity: subtitleOpacity }}>
            The story of Nicole White.
          </motion.p>
        </motion.div>
        <div className="story-opening-scroll-hint">
          <motion.span
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
          />
        </div>
      </section>

      {/* ═══════ CHAPTER 1: THE GIRL ═══════ */}
      <CinematicImage src="/images/lores/portrait-smile.jpg" alt="Nicole White" darken={0.55}>
        <Reveal>
          <p className="story-eyebrow">Before all of this</p>
          <h2 className="story-headline">She was just a teenager.</h2>
        </Reveal>
      </CinematicImage>

      <section className="story-text-section">
        <Reveal>
          <p className="story-body-large">
            Competitive. Sporty. Always busy with netball, squash, and whatever else she could get her hands on. Nicole White was 16 when she had her first seizure — behind the wheel, right after getting her licence.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="story-body">
            She had another seizure in November 2016 and started on anti-seizure medication. Nobody knew yet what was growing inside her head.
          </p>
        </Reveal>
      </section>

      {/* ═══════ CHAPTER 2: THE DIAGNOSIS ═══════ */}
      <ChapterBreak number="I" title="The Diagnosis" />

      <CinematicImage src="/images/surgery/gown.jpg" alt="Nicole before surgery" darken={0.65}>
        <Reveal>
          <div className="story-year-stamp">2017</div>
          <h2 className="story-headline">They said it wouldn't come back.</h2>
        </Reveal>
      </CinematicImage>

      <section className="story-text-section">
        <Reveal>
          <p className="story-body-large">
            In May 2017, Nicole was diagnosed with a brain tumour. An emergency MRI confirmed what an earlier assessment had missed. By November, at just 17 years old, she was in surgery.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="story-body">
            It was her first surgery of any kind. She woke up in the recovery room crying — overwhelmed and very sick. The doctors told her the tumour would not grow back. She was all clear.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="story-body story-body-italic">
            It grew back.
          </p>
        </Reveal>
      </section>

      {/* ═══════ CHAPTER 3: PLNTY ═══════ */}
      <ChapterBreak number="II" title="The Tumour" />

      <section className="story-dramatic-text">
        <Reveal direction="scale">
          <h2 className="story-display-word">PLNTY.</h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="story-dramatic-sub">Polymorphous Low-grade Neuro-epithelial Tumour of the Young.</p>
        </Reveal>
        <Reveal delay={0.3}>
          <p className="story-dramatic-sub" style={{ color: 'var(--gold)' }}>One of only a few documented cases in the world.</p>
        </Reveal>
      </section>

      <section className="story-text-section story-text-narrow">
        <Reveal>
          <p className="story-body">
            Nicole's tumour is an extremely rare brain tumour type, typically low-grade and slow-growing. For one to transform into a high-grade, aggressive tumour is nearly unheard of. There are only a couple of documented cases in the world of a PLNTY undergoing malignant transformation.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="story-body">
            Nicole's case is, by any clinical measure, exceptional.
          </p>
        </Reveal>
      </section>

      {/* ═══════ CHAPTER 4: THE FIGHT ═══════ */}
      <ChapterBreak number="III" title="The Fight" />

      <section className="story-stats-section">
        <Reveal className="story-stat-item"><div className="story-stat-number"><Counter value={4} /></div><div className="story-stat-label">Brain surgeries</div></Reveal>
        <Reveal className="story-stat-item" delay={0.1}><div className="story-stat-number"><Counter value={10} /></div><div className="story-stat-label">Year journey</div></Reveal>
        <Reveal className="story-stat-item" delay={0.2}><div className="story-stat-number"><Counter value={6} /></div><div className="story-stat-label">Months high-dose chemo</div></Reveal>
      </section>

      <section className="story-timeline-section">
        <YearBlock year="2018" image="/images/timeline/WhyNotMe_2018.png">
          Gap year. Still being told she was all clear. Then in November, found out the tumour had grown back again.
        </YearBlock>

        <YearBlock year="2019" image="/images/timeline/WhyNotMe_2019.png">
          Started university in Dunedin. A mid-year scan showed the tumour had grown and needed action. Second brain surgery in August. Studies put on hold.
        </YearBlock>

        <YearBlock year="2020" image="/images/timeline/WhyNotMe_2020.png">
          Started nursing in February. Six months post-op — tumour regrowth again. Started on Dabrafenib, an oral chemotherapy drug.
        </YearBlock>

        <YearBlock year="2021" image="/images/timeline/WhyNotMe_2021.png">
          Tumour officially stable. Felt miserable on Dabrafenib but it meant she could keep studying, so she pushed through.
        </YearBlock>

        <YearBlock year="2022" image="/images/timeline/WhyNotMe_2022.png">
          Settled into student life. Ran the Dunedin half marathon for Brain Tumour Support NZ, raising $4,500. Graduated as a registered nurse — while on chemotherapy.
        </YearBlock>

        <YearBlock year="2023" image="/images/timeline/WhyNotMe_2023.png">
          Started her new grad nursing job in Greymouth. Met Dean. Ran the Queenstown Marathon while on chemo. Tumour showed changes — taken off Dabrafenib.
        </YearBlock>
      </section>

      {/* ═══════ CHAPTER 5: THE TURN ═══════ */}
      <ChapterBreak number="IV" title="The Turn" />

      <CinematicImage src="/images/surgery/bed.jpg" alt="Nicole in hospital" darken={0.72} className="story-cinema-dark">
        <Reveal>
          <div className="story-year-stamp story-year-stamp-danger">2024</div>
          <h2 className="story-headline">Aggressive. Likely terminal.</h2>
        </Reveal>
      </CinematicImage>

      <section className="story-text-section">
        <Reveal>
          <p className="story-body">
            Changes to the tumour raised concern. Nicole had surgery in June. The tumour grew back, so she had surgery again in November — her fourth. At the same time, her father was going through his own prostate cancer journey, having surgery three days after Nicole.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="story-body">
            Then came the call. Come in and discuss the histology. The tumour had changed its spots. What had been manageable for seven years was now aggressive and likely to end her life.
          </p>
        </Reveal>
      </section>

      {/* Surgery image sequence */}
      <section className="story-image-sequence">
        <Reveal direction="left" className="story-seq-img">
          <img src="/images/surgery/stitches.jpg" alt="Surgery stitches" />
        </Reveal>
        <Reveal direction="scale" className="story-seq-img">
          <img src="/images/surgery/bandage.jpg" alt="Bandage" />
        </Reveal>
        <Reveal direction="right" className="story-seq-img">
          <img src="/images/surgery/recovery.jpg" alt="Recovery" />
        </Reveal>
      </section>

      {/* ═══════ CHAPTER 6: THE TREATMENT ═══════ */}
      <ChapterBreak number="V" title="The Treatment" />

      <section className="story-text-section">
        <Reveal>
          <div className="story-year-stamp" style={{ marginBottom: 30 }}>2025</div>
          <p className="story-body-large">
            Radiation began in February. Monday to Friday, six and a half weeks, with low-dose Temozolomide running alongside it.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="story-body">
            After a short break, high-dose Temozolomide for six months. One week on, three weeks off. Most people tolerate it well. Nicole did not.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="story-body">
            Vomiting constantly. No appetite. Exhausted in ways sleep could not fix. But on her off-weeks, she went back to work. She spent years caring for patients in the same health system keeping her alive. That dual knowledge — patient and professional — runs through every part of this story.
          </p>
        </Reveal>
      </section>

      <CinematicImage src="/images/lores/rain-run.jpg" alt="Running in the rain" darken={0.5}>
        <Reveal>
          <p className="story-pull-quote">
            "There's no reason to stop living life because of that."
          </p>
          <p className="story-quote-attr">Dean, Nicole's partner</p>
        </Reveal>
      </CinematicImage>

      {/* ═══════ CHAPTER 7: REMISSION ═══════ */}
      <ChapterBreak number="VI" title="Remission" />

      <section className="story-dramatic-text story-dramatic-gold">
        <Reveal direction="scale">
          <div className="story-year-stamp story-year-stamp-gold" style={{ fontSize: 'clamp(28px, 4vw, 40px)', marginBottom: 20 }}>2026</div>
          <h2 className="story-display-word story-gold-glow">In remission.</h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="story-dramatic-sub">
            Found out on her birthday. Discharged from oncology one day shy of the anniversary of starting treatment.
          </p>
        </Reveal>
      </section>

      <CinematicImage src="/images/lores/arms-ocean.jpg" alt="Nicole arms spread at ocean" darken={0.35}>
        <Reveal>
          <p className="story-pull-quote">
            Back at work. Training for a marathon. Living with the knowledge that it could return, but choosing to live fully anyway.
          </p>
        </Reveal>
      </CinematicImage>

      {/* ═══════ CHAPTER 8: THE MARATHON ═══════ */}
      <ChapterBreak number="VII" title="The Marathon" />

      <CinematicImage src="/images/lores/hero-running-coast.jpg" alt="Nicole running along the coast" darken={0.5}>
        <Reveal>
          <p className="story-eyebrow">Queenstown Marathon 2026</p>
          <h2 className="story-headline">Not just another finish line.</h2>
        </Reveal>
      </CinematicImage>

      <section className="story-text-section">
        <Reveal>
          <p className="story-body-large">
            Nicole has already run a half marathon while on chemo, raised $4,500 for Brain Tumour Support NZ, and pushed through a full marathon when treatment was still part of daily life.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="story-body">
            This return is different. It is about the history behind the running, the disappointment she still carries from 2023, and the chance to see how far remission, training, and a little bit of vengeance can take her.
          </p>
        </Reveal>
      </section>

      {/* Photo flow */}
      <section className="story-photo-flow">
        <Reveal direction="left" className="story-flow-img"><img src="/images/lores/running-front.jpg" alt="Running" /></Reveal>
        <Reveal direction="scale" className="story-flow-img story-flow-tall"><img src="/images/lores/sunlight-run.jpg" alt="Sunlight run" /></Reveal>
        <Reveal direction="right" className="story-flow-img"><img src="/images/lores/coastal-run-2.jpg" alt="Coastal run" /></Reveal>
        <Reveal direction="left" className="story-flow-img story-flow-tall"><img src="/images/lores/forest-portrait.jpg" alt="Forest portrait" /></Reveal>
        <Reveal direction="scale" className="story-flow-img"><img src="/images/lores/running-dog.jpg" alt="Running with Cindy" /></Reveal>
        <Reveal direction="right" className="story-flow-img"><img src="/images/lores/jumping-path.jpg" alt="Jumping" /></Reveal>
      </section>

      {/* ═══════ CHAPTER 9: IN THEIR WORDS ═══════ */}
      <ChapterBreak number="VIII" title="In Their Words" />

      <section className="story-quotes-section">
        <Reveal className="story-quote-block">
          <blockquote>"Anything that we felt must have been magnified a hundred times for Nicole."</blockquote>
          <cite>Deborah · On living with the tumour</cite>
        </Reveal>
        <Reveal className="story-quote-block" delay={0.1}>
          <blockquote>"That was independence. That was the ability to go and do her own thing."</blockquote>
          <cite>Vernon, Nicole's father · On her studying in Dunedin</cite>
        </Reveal>
        <Reveal className="story-quote-block" delay={0.15}>
          <blockquote>"There's no reason to stop living life because of that."</blockquote>
          <cite>Dean, Nicole's partner · On a terminal diagnosis</cite>
        </Reveal>
      </section>

      {/* ═══════ THE QUESTION ═══════ */}
      <CinematicImage src="/images/lores/cliff-pose.jpg" alt="Nicole on the cliff" darken={0.6}>
        <Reveal direction="scale">
          <h2 className="story-final-question">Why not me?</h2>
        </Reveal>
        <Reveal delay={0.3}>
          <p className="story-final-answer">
            "Because if it's not me, then it's someone else."
          </p>
          <p className="story-quote-attr">Nicole White</p>
        </Reveal>
      </CinematicImage>

      {/* ═══════ CTA ═══════ */}
      <section className="story-cta-section">
        <Reveal>
          <p className="story-eyebrow">Be part of the road</p>
          <h2 className="story-cta-title">Run with her.</h2>
          <div className="story-cta-line" />
        </Reveal>
        <Reveal delay={0.15}>
          <p className="story-cta-body">
            Every donation claims a kilometre of Nicole's Queenstown Marathon. Dedicate it to someone you love and she'll carry their name with her. All support goes to Brain Tumour Support NZ.
          </p>
        </Reveal>
        <Reveal delay={0.25} className="story-cta-buttons">
          <a href="https://nogoingback.nz/nicole-white" target="_blank" rel="noopener noreferrer" className="btn-primary">Donate Now</a>
          <Link to="/dedicate" className="btn-outline">Donate &amp; Dedicate a Km</Link>
          <Link to="/documentary" className="btn-outline">Watch the Documentary</Link>
        </Reveal>
      </section>

    </PageTransition>
  )
}
