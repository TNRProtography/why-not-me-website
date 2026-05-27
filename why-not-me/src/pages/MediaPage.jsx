/*
 * ============================================================
 * MEDIA PAGE - /media
 * ============================================================
 * This is the digital media toolkit, replacing the PDF media pack.
 * Designed for journalists, bloggers, and media contacts to quickly
 * get everything they need about Nicole's story.
 *
 * SECTIONS:
 *   1. Hero
 *   2. Story Summary (quick overview for journalists)
 *   3. About PLNTY (the tumour)
 *   4. Key Timeline
 *   5. Brain Tumour Facts NZ
 *   6. Key Quotes
 *   7. The Campaign (What is Why Not Me?)
 *   8. Photography & Media Assets (usage rules, Google Drive link)
 *   9. Contact & Socials
 *
 * GOOGLE DRIVE MEDIA FOLDER:
 *   drive.google.com/drive/folders/1dPs5lWdQ1JJW_9sMPyfVsSE4rq88KWK3
 *
 * TO UPDATE: Edit copy inline. The structure matches the media pack PDF.
 * ============================================================
 */
import PageTransition from '../components/PageTransition'
import RevealOnScroll from '../components/RevealOnScroll'
import './MediaPage.css'

export default function MediaPage() {
  return (
    <PageTransition>
      {/* ===== HERO ===== */}
      <section style={{
        height: '55vh', position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/images/lores/coastal-wide.jpg)',
          backgroundSize: 'cover', backgroundPosition: 'center 42%',
          filter: 'brightness(0.2)',
        }} />
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 20px' }}>
          <p className="section-label">Media Toolkit 2026</p>
          <h1 style={{ fontFamily: 'var(--font-hero)', fontSize: 'clamp(40px, 8vw, 100px)', lineHeight: 1 }}>
            Everything you need.
          </h1>
          <p style={{ marginTop: 15, color: 'var(--warm)', fontSize: 14, letterSpacing: 2 }}>
            #WHYNOTME &middot; NICOLE WHITE &middot; BRAIN TUMOUR SURVIVOR
          </p>
        </div>
      </section>

      {/* ===== STORY SUMMARY ===== */}
      <section style={{ padding: '100px 40px' }}>
        <div className="media-two-col" style={{ maxWidth: 1300, margin: '0 auto' }}>
          <RevealOnScroll direction="left" className="media-col-text">
            <p className="section-label">Nicole's Story</p>
            <h2 className="section-title">Ten years. Four surgeries. Another marathon to run.</h2>
            <div className="gold-line" />
            <div className="section-body" style={{ maxWidth: '100%' }}>
              <p>At 16, Nicole had her first seizure behind the wheel during a driving lesson. By May 2017, she had a brain tumour diagnosis. By November, her first surgery. She was told it would not come back. It came back. Again and again.</p>
              <br />
              <p>Through four brain surgeries, years of chemotherapy and a six and a half week radiation programme in 2025, Nicole refused to stop. She graduated as a registered nurse on treatment, ran the Queenstown Marathon on chemo, and in late 2024 was told her tumour was now aggressive and would likely end her life.</p>
              <br />
              <p style={{ color: 'var(--warm)', fontStyle: 'italic', fontSize: 'clamp(17px, 1.5vw, 20px)' }}>In 2026, she was declared in remission.</p>
            </div>

            {/* Quick stats */}
            <div className="media-stats">
              <div><span className="media-stat-num">10</span><span className="media-stat-label">Year Journey</span></div>
              <div><span className="media-stat-num">4</span><span className="media-stat-label">Brain Surgeries</span></div>
              <div><span className="media-stat-num">26</span><span className="media-stat-label">Years Old</span></div>
              <div><span className="media-stat-num">2026</span><span className="media-stat-label">In Remission</span></div>
            </div>
          </RevealOnScroll>
          <RevealOnScroll direction="right">
            <img src="/images/lores/running-front.jpg" alt="Nicole running" style={{ width: '100%', objectFit: 'cover', filter: 'brightness(0.9)' }} />
          </RevealOnScroll>
        </div>
      </section>

      {/* ===== PLNTY ===== */}
      <section style={{ padding: '100px 40px', background: 'var(--blue)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -1, left: 0, right: 0, height: 100, background: 'linear-gradient(to bottom, var(--black), transparent)', zIndex: 1 }} />
        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <RevealOnScroll>
            <p className="section-label">The Tumour</p>
            <h2 className="section-title">PLNTY: One of only a few.</h2>
            <div className="gold-line" />
            <div className="section-body" style={{ maxWidth: '100%' }}>
              <p>Nicole's tumour is a Polymorphous Low-grade Neuro-epithelial Tumour of the Young, known as a PLNTY. It is an extremely rare brain tumour type, typically low-grade and slow-growing. There are only a couple of documented cases in the world of a PLNTY undergoing malignant transformation.</p>
              <br />
              <p>In late 2024, after her fourth brain surgery, histology confirmed the change. What had been a manageable, low-grade tumour for seven years had become something far more dangerous. Nicole was told it would most likely end her life.</p>
              <br />
              <p>What followed was radiation, concurrent with low-dose Temozolomide, then six months of high-dose chemotherapy. In 2026, Nicole was officially declared in remission.</p>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ===== TIMELINE ===== */}
      <section style={{ padding: '100px 40px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <RevealOnScroll>
            <p className="section-label">Key Timeline</p>
            <h2 className="section-title">A decade of fighting.</h2>
          </RevealOnScroll>
          <div className="media-timeline">
            {[
              { year: '2016', text: 'First seizure while driving at age 16. Epilepsy diagnosed. Anti-seizure medication begins.' },
              { year: '2017', text: 'Brain tumour diagnosed in May. First brain surgery in November at age 17. Told it would not grow back.' },
              { year: '2018', text: 'All clear reversed. Regrowth confirmed in November.' },
              { year: '2019', text: 'Started nursing at university in Dunedin. Second surgery in August. Studies paused.' },
              { year: '2020', text: 'Tumour regrows post-op. Started Dabrafenib (oral chemo).' },
              { year: '2021', text: 'Tumour officially stable. Continued studying through treatment.' },
              { year: '2022', text: 'Graduated as a registered nurse. Ran the Dunedin half marathon for Brain Tumour Support NZ, raising $4,500.' },
              { year: '2023', text: 'New grad nursing role on the West Coast. Met Dean. Ran the Queenstown Marathon while on chemotherapy.' },
              { year: '2024', text: 'Third and fourth brain surgeries. PLNTY undergoes malignant transformation. Terminal prognosis delivered.' },
              { year: '2025', text: 'Radiation for six and a half weeks plus high-dose Temozolomide for six months.' },
              { year: '2026', text: 'Declared in remission. Discharged from oncology on her birthday. Now training for the Queenstown Marathon in November.' },
            ].map((item, i) => (
              <RevealOnScroll key={item.year} className="media-tl-item">
                <span className="media-tl-year">{item.year}</span>
                <span className="media-tl-text">{item.text}</span>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BRAIN TUMOUR FACTS NZ ===== */}
      <section style={{ padding: '80px 40px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <RevealOnScroll>
            <p className="section-label">Brain Tumour Facts NZ</p>
            <h2 className="section-title">The numbers behind the silence.</h2>
          </RevealOnScroll>
          <div className="media-facts">
            <RevealOnScroll className="media-fact"><strong>#1</strong> cancer killer in people under 40</RevealOnScroll>
            <RevealOnScroll className="media-fact" delay={0.05}><strong>277</strong> deaths per year in New Zealand from brain cancer</RevealOnScroll>
            <RevealOnScroll className="media-fact" delay={0.1}><strong>17 years</strong> since the most recent drug used to treat brain cancer in NZ was approved</RevealOnScroll>
            <RevealOnScroll className="media-fact" delay={0.15}><strong>1 in 3</strong> people know someone affected by a brain tumour</RevealOnScroll>
            <RevealOnScroll className="media-fact" delay={0.2}>Brain cancer survival rates are among the <strong>lowest of all cancers</strong> and have barely changed in 30 years</RevealOnScroll>
            <RevealOnScroll className="media-fact" delay={0.25}>The <strong>cause of brain cancers is largely unknown</strong></RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ===== KEY QUOTES ===== */}
      <section style={{ padding: '80px 40px', background: 'var(--blue)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <RevealOnScroll>
            <p className="section-label">Key Quotes</p>
            <h2 className="section-title">In their own words.</h2>
          </RevealOnScroll>

          <RevealOnScroll>
            <blockquote className="media-quote">
              "I always wonder, I still wonder, what it is like for her to go to bed at night and know that this thing is lurking. You get told all is good and then all is not so good. And you think: where does it all end?"
            </blockquote>
            <cite className="media-cite">Vernon (Nicole's father)</cite>
          </RevealOnScroll>

          <RevealOnScroll>
            <blockquote className="media-quote">
              "There was just heartbreak, really. As soon as everyone left, we got into a big group hug. Nicole's niece was sitting on the floor playing and that was the only noise for probably three minutes. Apart from some sniffling."
            </blockquote>
            <cite className="media-cite">Dean (Nicole's partner) on the tumour turning malignant, 2024</cite>
          </RevealOnScroll>

          <RevealOnScroll>
            <blockquote className="media-quote">
              "I always thought there is no point in a relationship because I have got this big thing hanging over my head. Then when I told him, he did not even flinch."
            </blockquote>
            <cite className="media-cite">Nicole White on meeting Dean</cite>
          </RevealOnScroll>
        </div>
      </section>

      {/* ===== THE CAMPAIGN ===== */}
      <section style={{ padding: '100px 40px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <RevealOnScroll>
            <p className="section-label">About the Campaign</p>
            <h2 style={{ fontFamily: 'var(--font-hero)', fontSize: 'clamp(30px, 4vw, 50px)', fontStyle: 'italic', color: 'var(--warm)', lineHeight: 1.2 }}>Not "why me?"</h2>
            <h2 className="section-title">But "why not me?"</h2>
            <div className="gold-line" />
            <div className="section-body" style={{ maxWidth: '100%' }}>
              <p>Why Not Me? is Nicole's personal platform, launched in May 2026 to document her recovery, her marathon training, and her life after a terminal diagnosis. Rather than asking "why me?" in despair, Nicole turns it into a challenge: why not choose to fight, to run, to advocate, to live fully?</p>
              <br />
              <p>All proceeds support Brain Tumour Support NZ, the charity Nicole has championed since 2022, via their official #NoGoingBack fundraising page.</p>
            </div>
          </RevealOnScroll>

          <RevealOnScroll>
            <div style={{ display: 'flex', gap: 40, marginTop: 40, flexWrap: 'wrap' }}>
              <div>
                <p className="section-label" style={{ marginBottom: 6 }}>Available For</p>
                <p style={{ fontSize: 14, color: 'var(--white-70)', lineHeight: 1.8 }}>
                  Print and digital interviews<br />
                  TV and radio appearances<br />
                  Podcast features<br />
                  Brain tumour awareness campaigns<br />
                  Marathon and fundraising coverage<br />
                  Health and wellness storytelling
                </p>
              </div>
              <div>
                <p className="section-label" style={{ marginBottom: 6 }}>Documentary</p>
                <p style={{ fontSize: 14, color: 'var(--white-70)' }}>
                  "A Little Bit of Vengeance"<br />
                  Released May 22, 2026<br />
                  <a href="https://www.youtube.com/watch?v=pnLhzEzXKpc" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>Watch on YouTube</a>
                </p>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ===== PHOTOGRAPHY & MEDIA ASSETS ===== */}
      <section style={{ padding: '100px 40px', background: 'var(--blue)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center', position: 'relative', zIndex: 2 }} className="media-two-col">
          <RevealOnScroll direction="left">
            <p className="section-label">Media & Imagery</p>
            <h2 style={{ fontFamily: 'var(--font-hero)', fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1.1, marginBottom: 20 }}>
              Usage guidelines.
            </h2>
            <div className="gold-line" />
            <div className="section-body" style={{ maxWidth: '100%' }}>
              <p>All photography and videography for Why Not Me? is produced by TNR Protography, the creative business of Dean, Nicole's partner. Dean brings both a professional lens and a deeply personal one to this project, having been present through surgeries, treatment, and recovery.</p>
              <br />
              <p>All media is only to be used in relation to an article for, promotion of, or aiding this cause. No other use is permitted. All rights and ownership of these digital assets remain with the photographer.</p>
              <br />
              <p>Not all imagery associated with this campaign is TNR Protography's work.</p>
            </div>

            {/* Access media box */}
            <div className="media-access-box">
              <p className="section-label" style={{ marginBottom: 8 }}>Access Media</p>
              <p style={{ fontSize: 14, color: 'var(--white-70)', marginBottom: 12 }}>
                Logos, photography, video and other campaign assets are available via the link below. This folder is kept up to date as new content is produced. These are media ready and free to use, based on the rules above.
              </p>
              <a
                href="https://drive.google.com/drive/folders/1dPs5lWdQ1JJW_9sMPyfVsSE4rq88KWK3"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Open Google Drive Media Folder
              </a>
            </div>

            <div style={{ marginTop: 30, borderTop: '1px solid var(--gold-20)', paddingTop: 20 }}>
              <p className="section-label" style={{ marginBottom: 6 }}>Media Enquiries</p>
              <p style={{ fontSize: 14, color: 'var(--white-70)' }}>
                Image & video use: via contact form at{' '}
                <a href="https://tnrprotography.co.nz" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>tnrprotography.co.nz</a>
              </p>
            </div>
          </RevealOnScroll>

          <RevealOnScroll direction="right">
            <img src="/images/lores/trail-light.jpg" alt="Nicole running through sunlit bush" style={{ width: '100%', objectFit: 'cover', filter: 'brightness(0.9)' }} />
          </RevealOnScroll>
        </div>
      </section>

      {/* ===== CONTACT ===== */}
      <section style={{ padding: '80px 40px', textAlign: 'center' }}>
        <RevealOnScroll>
          <p className="section-label">Get in Touch</p>
          <h2 className="section-title">Run with me.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 30, marginTop: 40, textAlign: 'left', maxWidth: 900, margin: '40px auto 0' }}>
            <div>
              <p className="section-label" style={{ marginBottom: 6 }}>Email</p>
              <a href="mailto:why.not.me.nicole.white@gmail.com" style={{ fontSize: 14, color: 'var(--white-70)' }}>why.not.me.nicole.white@gmail.com</a>
            </div>
            <div>
              <p className="section-label" style={{ marginBottom: 6 }}>Donate</p>
              <a href="https://nogoingback.nz/nicole-white" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: 'var(--gold)' }}>nogoingback.nz/nicole-white</a>
            </div>
            <div>
              <p className="section-label" style={{ marginBottom: 6 }}>Socials</p>
              <p style={{ fontSize: 14, color: 'var(--white-70)' }}>
                <a href="https://www.facebook.com/nicole.white.why.not.me" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--white-70)' }}>Facebook</a><br />
                <a href="https://www.tiktok.com/@nicole.white.why.not.me" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--white-70)' }}>TikTok</a><br />
                #WhyNotMe
              </p>
            </div>
            <div>
              <p className="section-label" style={{ marginBottom: 6 }}>Partners</p>
              <p style={{ fontSize: 14, color: 'var(--white-70)' }}>
                <a href="https://braintumoursupport.org.nz" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>Brain Tumour Support NZ</a><br />
                <a href="https://tnrprotography.co.nz" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>TNR Protography</a>
              </p>
            </div>
          </div>
        </RevealOnScroll>
      </section>
    </PageTransition>
  )
}
