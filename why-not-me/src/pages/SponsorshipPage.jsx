/*
 * ============================================================
 * SPONSORSHIP PAGE - /sponsorship
 * ============================================================
 * This is the HTML version of the sponsorship pack PDF.
 * Contains all sponsorship tiers, deliverables, press coverage,
 * and imagery usage info.
 *
 * SECTIONS:
 *   1. Hero
 *   2. About the Campaign
 *   3. Sponsorship Tiers (7 tiers from the PDF)
 *   4. What Sponsors Get (deliverables grid)
 *   5. Press & Media Coverage
 *   6. Imagery Usage Guidelines
 *   7. Get Involved CTA
 *
 * TO UPDATE TIERS:
 *   Edit the tier objects in the tiersData array below.
 *   Each tier has: name, price, spots, features[], highlight (bool)
 *
 * TO ADD A NEW PRESS ITEM:
 *   Add to the confirmed[] or upcoming[] arrays in the press section.
 * ============================================================
 */
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import RevealOnScroll from '../components/RevealOnScroll'
import './SponsorshipPage.css'

/* ---- SPONSORSHIP TIER DATA ----
 * Edit this array to update tiers. The page auto-renders from this data.
 * highlight: true gives the tier a gold border (used for Supreme)
 */
const tiersData = [
  {
    name: 'Supreme Sponsor',
    price: '$5,000',
    spots: '1 spot',
    spotsNote: 'Exclusive',
    highlight: true,
    features: [
      'Logo on front of marathon shirt',
      'Dedicated posts and video features',
      'Highest-level recognition across all channels',
    ],
  },
  {
    name: 'Elite Sponsor',
    price: '$1,000 - $2,000',
    spots: '5 spots',
    spotsNote: 'Five spots available',
    highlight: false,
    features: [
      'Logo on back of marathon shirt',
      'Multiple dedicated social posts',
      'Key build-up content slot',
      'Tagged across the campaign',
    ],
  },
  {
    name: 'Premium Sponsor',
    price: '$500 - $999',
    spots: '10 spots',
    spotsNote: 'Ten spots available',
    highlight: false,
    features: [
      'Logo on back of marathon shirt',
      'One dedicated social media post',
      'Tagged recognition in build-up content',
    ],
  },
  {
    name: 'Equipment & Gear',
    price: 'In-kind',
    spots: '10 spots',
    spotsNote: 'Gear, nutrition, recovery',
    highlight: false,
    features: [
      'Logo on marathon shirt',
      'Dedicated gear-feature posts',
      'Tagged mentions across training content',
    ],
  },
  {
    name: 'Business Sponsor',
    price: '$250 - $499',
    spots: '20 spots',
    spotsNote: '',
    highlight: false,
    features: [
      'NoGoingBack donation',
      'Recognition as a Business Sponsor across social channels',
    ],
  },
  {
    name: 'Community Sponsor',
    price: 'Any amount',
    spots: 'Open to all',
    spotsNote: '',
    highlight: false,
    features: [
      'Donate directly via NoGoingBack',
      'Every dollar reaches Brain Tumour Support NZ, no fee, no cut',
    ],
  },
  {
    name: 'Raffle Prize',
    price: 'Donated items',
    spots: 'In-kind',
    spotsNote: '',
    highlight: false,
    features: [
      'Business featured alongside the prize',
      'Tagged in raffle posts and thank-you content',
    ],
  },
]

export default function SponsorshipPage() {
  return (
    <PageTransition>
      {/* ===== HERO ===== */}
      <section style={{
        height: '55vh', position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/images/lores/rain-run.jpg)',
          backgroundSize: 'cover', backgroundPosition: '52% 44%',
          filter: 'brightness(0.2)',
        }} />
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 20px' }}>
          <p className="section-label">Sponsorship Pack 2026</p>
          <h1 style={{ fontFamily: 'var(--font-hero)', fontSize: 'clamp(40px, 8vw, 100px)', lineHeight: 1 }}>
            Run with us.
          </h1>
          <p style={{ marginTop: 15, color: 'var(--warm)', fontSize: 15, maxWidth: 550, marginLeft: 'auto', marginRight: 'auto' }}>
            A marathon. A movement. A second chance.
          </p>
        </div>
      </section>

      {/* ===== ABOUT THE CAMPAIGN ===== */}
      <section style={{ padding: '100px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, maxWidth: 1300, margin: '0 auto', alignItems: 'center' }} className="sp-two-col">
          <RevealOnScroll direction="left">
            <h2 style={{ fontFamily: 'var(--font-hero)', fontSize: 'clamp(36px, 5vw, 60px)', lineHeight: 1.1, fontStyle: 'italic', color: 'var(--warm)' }}>
              Not "why me?"
            </h2>
            <h2 style={{ fontFamily: 'var(--font-hero)', fontSize: 'clamp(40px, 6vw, 70px)', lineHeight: 1.1, marginTop: 10 }}>
              But "why not me?"
            </h2>
            <div className="gold-line" />
            <div className="section-body" style={{ maxWidth: '100%' }}>
              <p>Why Not Me? is Nicole's personal platform, launched in May 2026 to document her recovery, her marathon training, and her life after a terminal diagnosis. Rather than asking "why me?" in despair, Nicole turns it into a challenge: why not choose to fight, to run, to advocate, to live fully?</p>
              <br />
              <p>All proceeds support Brain Tumour Support NZ, the charity Nicole has championed since 2022, via their official #NoGoingBack fundraising page.</p>
            </div>
            <div style={{ display: 'flex', gap: 40, marginTop: 40 }}>
              <div>
                <p className="section-label" style={{ marginBottom: 6 }}>Documentary</p>
                <p style={{ fontSize: 14, color: 'var(--white-70)' }}>A Little Bit of Vengeance<br />Released May 2026</p>
              </div>
              <div>
                <p className="section-label" style={{ marginBottom: 6 }}>Photography</p>
                <p style={{ fontSize: 14, color: 'var(--white-70)' }}>Professional library by TNR Protography.<br />Sponsors may use campaign imagery on socials.</p>
              </div>
            </div>
          </RevealOnScroll>
          <RevealOnScroll direction="right">
            <img src="/images/lores/running-dog.jpg" alt="Nicole running with Cindy" style={{ width: '100%', objectFit: 'cover', filter: 'brightness(0.9)' }} />
          </RevealOnScroll>
        </div>
      </section>

      {/* ===== SPONSORSHIP TIERS ===== */}
      <section style={{ padding: '100px 40px', background: 'var(--blue)' }} className="tiers-section">
        {/* Gradient blends at top/bottom */}
        <div style={{ position: 'absolute', top: -1, left: 0, right: 0, height: 120, background: 'linear-gradient(to bottom, var(--black), transparent)', zIndex: 1 }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1300, margin: '0 auto' }}>
          <RevealOnScroll>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <p className="section-label">Sponsorship Opportunities</p>
              <h2 className="section-title">Six ways to back Nicole's marathon.</h2>
              <p className="section-body" style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
                All monetary contributions go directly to Brain Tumour Support NZ via #NoGoingBack. We can provide an invoice or you can pay via card.
              </p>
            </div>
          </RevealOnScroll>

          {/* Tier cards grid */}
          <div className="tiers-grid">
            {tiersData.map((tier, i) => (
              <RevealOnScroll key={tier.name} delay={i * 0.06}>
                <motion.div
                  className={`tier-card ${tier.highlight ? 'tier-highlight' : ''}`}
                  whileHover={{ y: -6, borderColor: 'var(--gold)' }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="tier-spots">{tier.spots}</div>
                  <h3 className="tier-name">{tier.name}</h3>
                  <div className="tier-price">{tier.price}</div>
                  {tier.spotsNote && <p className="tier-note">{tier.spotsNote}</p>}
                  <div className="tier-divider" />
                  <ul className="tier-features">
                    {tier.features.map((f, j) => (
                      <li key={j}>{f}</li>
                    ))}
                  </ul>
                </motion.div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ===== WHAT WE CAN DO FOR YOU (Deliverables) ===== */}
      <section style={{ padding: '120px 40px' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto' }}>
          <RevealOnScroll>
            <p className="section-label">What We Can Do For You</p>
            <h2 className="section-title">A live campaign, with your brand on every kilometre.</h2>
          </RevealOnScroll>

          <div className="deliverables-grid">
            {[
              { icon: 'Now', title: 'Marathon training, in real time', desc: 'Weekly long runs, training milestones, race build-up. Sponsors can be visible through social media posting.' },
              { icon: 'Shirt', title: 'Logo on the marathon kit', desc: 'Worn every training run, every race-day mile, every photoshoot. The kit travels, your logo travels with it.' },
              { icon: 'Social', title: 'Dedicated posts & tagged content', desc: 'Build-up posts across Instagram, Facebook and TikTok. Tagged, credited, and worked into the regular content rhythm.' },
              { icon: 'Press', title: 'Print, radio, podcast', desc: 'Nicole is available for interviews, awareness campaigns and brand collaborations tied to the marathon and Brain Tumour Support NZ.' },
            ].map((item, i) => (
              <RevealOnScroll key={item.icon} delay={i * 0.1} className="deliverable-card">
                <div className="deliverable-icon">{item.icon}</div>
                <h4 className="deliverable-title">{item.title}</h4>
                <p className="deliverable-desc">{item.desc}</p>
              </RevealOnScroll>
            ))}
          </div>

          <RevealOnScroll>
            <div style={{ marginTop: 60, borderTop: '1px solid var(--gold-20)', paddingTop: 30, display: 'flex', gap: 60, flexWrap: 'wrap' }}>
              <div>
                <p className="section-label" style={{ marginBottom: 8 }}>Use of Imagery</p>
                <p style={{ fontSize: 14, color: 'var(--white-70)', maxWidth: 500 }}>
                  A professional photography library by TNR Protography is in production. Sponsors are welcome to use campaign imagery on their own channels. Share your support with your own audience, free of charge.
                </p>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ===== PRESS & MEDIA COVERAGE ===== */}
      <section style={{ padding: '100px 40px', background: 'var(--blue)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center', position: 'relative', zIndex: 2 }} className="sp-two-col">
          <RevealOnScroll direction="left">
            <p className="section-label">Press & Media Coverage</p>
            <h2 style={{ fontFamily: 'var(--font-hero)', fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1.1, marginBottom: 20 }}>
              The story is spreading.
            </h2>
            <div className="gold-line" />
            <p className="section-body" style={{ maxWidth: '100%', marginBottom: 40 }}>
              Nicole's story has already attracted attention from national and regional media across New Zealand. Coverage is building around the documentary release and the Queenstown Marathon campaign.
            </p>

            <p className="section-label" style={{ marginBottom: 12 }}>Confirmed Coverage</p>
            <div className="press-list">
              <div className="press-item"><strong>The Press (Stuff)</strong> - Feature article published May 2026</div>
              <div className="press-item"><strong>Greymouth Star</strong> - Feature article published May 2026</div>
              <div className="press-item"><strong>RNZ (Radio New Zealand)</strong> - Currently in production</div>
              <div className="press-item"><strong>Development West Coast</strong> - Social media support and national media introductions</div>
            </div>

            <p className="section-label" style={{ marginBottom: 12, marginTop: 40 }}>Upcoming & In Discussion</p>
            <div className="press-list">
              <div className="press-item"><strong>Seven Sharp (TVNZ)</strong> - Segment planned for November, around the Queenstown Marathon</div>
              <div className="press-item"><strong>TVNZ Breakfast</strong> - Segment planned for November, around the Queenstown Marathon</div>
            </div>
          </RevealOnScroll>
          <RevealOnScroll direction="right">
            <img src="/images/lores/cliff-pose.jpg" alt="Nicole on the coast" style={{ width: '100%', objectFit: 'cover', filter: 'brightness(0.85)' }} />
          </RevealOnScroll>
        </div>
      </section>

      {/* ===== GET INVOLVED CTA ===== */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '120px 40px', textAlign: 'center' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/images/lores/bridge-back.jpg)',
          backgroundSize: 'cover', backgroundPosition: '50% 44%',
          filter: 'brightness(0.15)',
        }} />
        <RevealOnScroll>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <p className="section-label">Get Involved</p>
            <h2 style={{ fontFamily: 'var(--font-hero)', fontSize: 'clamp(48px, 8vw, 100px)', lineHeight: 1 }}>
              Run with me.
            </h2>
            <p className="section-body" style={{ maxWidth: 600, margin: '20px auto 0', textAlign: 'center' }}>
              Reach out about a sponsorship tier, or donate directly via #NoGoingBack. Every contribution supports Brain Tumour Support NZ and helps Nicole get to the start line.
            </p>

            {/* Contact grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 30, marginTop: 50, textAlign: 'left', maxWidth: 900, margin: '50px auto 0' }} className="contact-grid">
              <div>
                <p className="section-label" style={{ marginBottom: 6 }}>Email</p>
                <a href="mailto:why.not.me.nicole.white@gmail.com" style={{ fontSize: 14, color: 'var(--white-70)' }}>
                  why.not.me.nicole.white@gmail.com
                </a>
              </div>
              <div>
                <p className="section-label" style={{ marginBottom: 6 }}>Donate</p>
                <a href="https://nogoingback.nz/nicole-white" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: 'var(--gold)' }}>
                  Open Nicole's Raisely page
                </a>
              </div>
              <div>
                <p className="section-label" style={{ marginBottom: 6 }}>Socials</p>
                <p style={{ fontSize: 14, color: 'var(--white-70)' }}>
                  Facebook: /nicole.white.why.not.me<br />
                  TikTok: @nicole.white.why.not.me<br />
                  #WhyNotMe
                </p>
              </div>
              <div>
                <p className="section-label" style={{ marginBottom: 6 }}>Partners</p>
                <p style={{ fontSize: 14, color: 'var(--white-70)' }}>
                  Brain Tumour Support NZ<br />
                  <a href="https://braintumoursupport.org.nz" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>braintumoursupport.org.nz</a><br />
                  Photography: <a href="https://tnrprotography.co.nz" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>TNR Protography</a>
                </p>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </section>
    </PageTransition>
  )
}
