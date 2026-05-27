import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import PageTransition from '../components/PageTransition'
import RevealOnScroll from '../components/RevealOnScroll'
import ScrollZoomFocus from '../components/ScrollZoomFocus'
import HeroPortalTitle from '../components/HeroPortalTitle'
import './MarathonPage.css'

const historyItems = [
  {
    year: 'Before all of this',
    title: 'Sport was already part of who Nicole was.',
    text: 'As a teenager, Nicole was competitive, sporty, and always busy with netball, squash, and whatever else she could get her hands on. Running is not a new personality for the campaign. It is a return to something that was already there.',
  },
  {
    year: '2022',
    title: 'The first fundraiser became proof.',
    text: 'After around 18 months on Dabrafenib, Nicole decided to run a half marathon while still on chemo. She raised $4,500 for Brain Tumour Support NZ. It was hard, but it was also the moment running became part of the story.',
  },
  {
    year: '2023',
    title: 'Queenstown happened while treatment was still real.',
    text: 'Nicole ran the Queenstown Marathon while on chemo. She finished, but she was disappointed with the result. That feeling never fully went away. It became unfinished business.',
  },
  {
    year: '2024 to 2025',
    title: 'The goal moved further away.',
    text: 'A third and fourth surgery, aggressive histology, radiation, and high-dose chemo changed everything. The running stopped being about pace and became about getting through the next hallway, the next appointment, and the next day.',
  },
  {
    year: '2026',
    title: 'Now it means something different.',
    text: 'Nicole is in remission, back at work, and rebuilding carefully. The Queenstown Marathon is no longer just a race. It is a marker of what her body has carried and what it is still capable of doing.',
  },
]

const dunedinMarathonPhotos = [
  {
    src: '/images/marathon/dunedin-coastal-run.jpg',
    alt: 'Nicole and Uncle Andy running beside the coast during the Dunedin half marathon',
  },
  {
    src: '/images/marathon/dunedin-town-run.jpg',
    alt: 'Nicole and Uncle Andy running through Dunedin together',
  },
  {
    src: '/images/marathon/dunedin-finish-hug.jpg',
    alt: 'Nicole and Uncle Andy sharing a hug after the Dunedin half marathon',
  },
]

export default function MarathonPage() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '26%'])
  const heroScale = useTransform(scrollYProgress, [0, 1], [1.04, 1.16])
  const titleY = useTransform(scrollYProgress, [0, 1], ['0%', '-18%'])
  const heroSupportOpacity = useTransform(scrollYProgress, [0, 0.28, 0.58], [1, 0.85, 0])
  const heroSupportY = useTransform(scrollYProgress, [0, 0.58], ['0%', '20%'])

  return (
    <PageTransition>
      <section className="marathon-page-hero portal-hero" ref={heroRef}>
        <div className="portal-hero-stage">
          <motion.div
            className="marathon-page-hero-bg"
            style={{
              backgroundImage: 'url(/images/lores/coastal-run-2.jpg)',
              y: heroY,
              scale: heroScale,
            }}
          />
          <div className="marathon-page-hero-overlay" />
          <div className="hero-portal-depth" aria-hidden="true" />
          <motion.div className="marathon-page-hero-content" style={{ y: titleY }}>
            <motion.div style={{ opacity: heroSupportOpacity, y: heroSupportY }}>
              <motion.p
                className="section-label"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.25, ease: [0.19, 1, 0.22, 1] }}
              >
                Queenstown Marathon
              </motion.p>
            </motion.div>
            <HeroPortalTitle targetRef={heroRef} className="marathon-hero-title-focus" desktopScale={16.5} mobileScale={9.8}>
              <motion.h1
                initial={{ opacity: 0, y: 42, filter: 'blur(12px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 1.15, delay: 0.42, ease: [0.19, 1, 0.22, 1] }}
              >
                Why this finish line m<span className="portal-letter-target" data-portal-letter>a</span>tters.
              </motion.h1>
            </HeroPortalTitle>
            <motion.p
              className="marathon-page-hero-quote"
              style={{ opacity: heroSupportOpacity, y: heroSupportY }}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.75, ease: [0.19, 1, 0.22, 1] }}
            >
              &ldquo;Running 42Ks is easier than going through radiation and chemo.&rdquo;
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="marathon-intro-section">
        <div className="marathon-intro-grid">
          <RevealOnScroll direction="left" className="marathon-intro-copy">
            <p className="section-label">The Reason</p>
            <ScrollZoomFocus origin="left"><h2 className="section-title">It is not about proving she was never scared.</h2></ScrollZoomFocus>
            <div className="gold-line" />
            <div className="section-body">
              <p>The Queenstown Marathon matters because it sits at the end of a story that has already asked too much of Nicole. It follows seizures, scans, four brain surgeries, chemo, radiation, long hospital corridors, and the kind of fatigue that does not disappear just because treatment ends.</p>
              <br />
              <p>This is not a glossy comeback story where everything is suddenly easy. It is Nicole choosing a hard thing on purpose, after a long stretch where hard things kept choosing her.</p>
              <br />
              <p>Queenstown gives the campaign a visible finish line. Every training run, every donation, every share, and every conversation has somewhere to point.</p>
            </div>
          </RevealOnScroll>
          <RevealOnScroll direction="right" className="marathon-intro-image-wrap">
            <img src="/images/lores/running-front.jpg" alt="Nicole running toward the camera" />
            <div className="marathon-image-caption">Training is about rebuilding, not pretending the last year did not happen.</div>
          </RevealOnScroll>
        </div>
      </section>

      <section className="marathon-video-section">
        <div className="marathon-video-grid">
          <RevealOnScroll direction="left" className="marathon-video-copy">
            <p className="section-label">2026 Announcement</p>
            <ScrollZoomFocus origin="left"><h2 className="section-title">The moment the next chapter became real.</h2></ScrollZoomFocus>
            <div className="gold-line" />
            <div className="section-body">
              <p>The marathon announcement is not just a training update. It is the point where the campaign turns from remembering what happened into building toward what comes next.</p>
              <br />
              <p>It gives people something to follow, something to share, and something to stand behind. Queenstown becomes the place where the story, the fundraising, and Nicole's own unfinished business meet.</p>
            </div>
          </RevealOnScroll>

          <RevealOnScroll direction="right" className="marathon-video-card">
            <div className="marathon-video-frame">
              <iframe
                src="https://www.youtube.com/embed/VifN_bxzM3o"
                title="Why Not Me Queenstown Marathon 2026 announcement video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <p className="marathon-video-caption">Queenstown Marathon 2026 announcement video</p>
          </RevealOnScroll>
        </div>
      </section>

      <section className="marathon-history-section">
        <RevealOnScroll>
          <div className="marathon-section-heading">
            <p className="section-label">The Running History</p>
            <ScrollZoomFocus><h2 className="section-title">The road to Queenstown started years ago.</h2></ScrollZoomFocus>
          </div>
        </RevealOnScroll>

        <div className="marathon-history-track">
          {historyItems.map((item, index) => (
            <RevealOnScroll key={item.year} className="marathon-history-item" delay={index * 0.06}>
              <div className="marathon-history-number">{String(index + 1).padStart(2, '0')}</div>
              <div>
                <div className="marathon-history-year">{item.year}</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <section className="marathon-dunedin-section">
        <div className="marathon-dunedin-grid">
          <RevealOnScroll direction="left" className="marathon-dunedin-copy">
            <p className="section-label">Dunedin Half Marathon</p>
            <ScrollZoomFocus origin="left"><h2 className="section-title">The day Uncle Andy ran beside her.</h2></ScrollZoomFocus>
            <div className="gold-line" />
            <div className="section-body">
              <p>Dunedin became one of those days that stays with you. Nicole had already decided to challenge herself and use the half marathon to raise money for Brain Tumour Support NZ, but it became even more meaningful when Uncle Andy asked to run it with her.</p>
              <br />
              <p>He did not just turn up for the photo at the end. He ran beside her, supported her through it, and helped make the whole day feel safe, proud, and unforgettable.</p>
              <br />
              <p>It became a core memory. Not because it was easy, but because it was shared. The road, the effort, the Brain Tumour Support NZ shirts, and that finish line all became part of the reason Queenstown means so much now.</p>
            </div>
          </RevealOnScroll>

          <div className="marathon-dunedin-gallery" aria-label="Dunedin half marathon photo gallery">
            {dunedinMarathonPhotos.map((photo, index) => (
              <RevealOnScroll key={photo.src} delay={index * 0.08} className={`marathon-dunedin-photo marathon-dunedin-photo-${index + 1}`}>
                <img src={photo.src} alt={photo.alt} />
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      <section className="marathon-vengeance-section">
        <div className="marathon-vengeance-bg" />
        <RevealOnScroll className="marathon-vengeance-card">
          <p className="section-label">A Little Bit of Vengeance</p>
          <ScrollZoomFocus><h2 className="section-title">This time, it is personal.</h2></ScrollZoomFocus>
          <div className="gold-line" style={{ margin: '24px auto' }} />
          <div className="section-body" style={{ maxWidth: 780, textAlign: 'center', margin: '0 auto' }}>
            <p>Nicole has said she was still on chemo in 2023 and was disappointed with her result. This time her aspiration is to push herself hard and see how far she can take it.</p>
            <br />
            <p>That is where the name of the documentary comes from. Not bitterness. Not anger for the sake of anger. More like the quiet drive of someone who has been told too many times what might not be possible and has decided to answer with movement.</p>
          </div>
          <blockquote>
            &ldquo;I think I have a bit of vengeance.&rdquo;
          </blockquote>
        </RevealOnScroll>
      </section>

      <section className="marathon-why-section">
        <div className="marathon-why-grid">
          <RevealOnScroll direction="left" className="marathon-why-image-stack">
            <img src="/images/lores/trail-light.jpg" alt="Nicole running through light on a trail" />
            <img src="/images/lores/running-dog.jpg" alt="Nicole running with Cindy" />
          </RevealOnScroll>
          <RevealOnScroll direction="right">
            <p className="section-label">Why Queenstown</p>
            <ScrollZoomFocus origin="left"><h2 className="section-title">A beautiful place for an ugly fight.</h2></ScrollZoomFocus>
            <div className="gold-line" />
            <div className="section-body">
              <p>Queenstown is a place that feels big enough for the story. It has mountains, water, distance, and a finish line that people can picture. For Nicole, it also carries history. She has been there before, while still carrying treatment in her body.</p>
              <br />
              <p>Returning to Queenstown turns the race into a chapter, not an event. It links the half marathon that raised $4,500, the marathon she was disappointed with, the year of radiation and chemo that followed, and the remission she is now learning to live inside.</p>
              <br />
              <p>The goal is not to make it look easy. The goal is to let people see what it takes to keep choosing life after the worst year of your life.</p>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <section className="marathon-cta-section">
        <RevealOnScroll>
          <p className="section-label">Follow the Build</p>
          <ScrollZoomFocus><h2 className="section-title">Run with her, share the story, back the cause.</h2></ScrollZoomFocus>
          <p className="section-body" style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
            The marathon gives the campaign a physical goal, but the purpose is bigger than the race. It is about raising money for Brain Tumour Support NZ, helping people talk about cancer without fear, and making sure families facing brain tumours feel less alone.
          </p>
          <div className="marathon-cta-buttons">
            <a href="https://nogoingback.nz/nicole-white" target="_blank" rel="noopener noreferrer" className="btn-primary">Donate Now</a>
            <Link to="/documentary" className="btn-outline">Watch the Documentary</Link>
          </div>
        </RevealOnScroll>
      </section>
    </PageTransition>
  )
}
