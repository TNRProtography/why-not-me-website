/*
 * ============================================================
 * BRAIN TUMOUR SUPPORT NZ SECTION (reusable)
 * ============================================================
 * A shared section introducing Brain Tumour Support NZ, used on
 * the Home, Marathon, and Donation Progress pages. Each page
 * passes its own copy so the tone fits where it sits, but the
 * layout, logo, and calls to action stay consistent.
 *
 * PROPS:
 *   eyebrow     - small label above the heading
 *   title       - the heading
 *   paragraphs  - array of strings, one per paragraph
 *   imageSide   - 'left' or 'right' (desktop layout), default 'left'
 *
 * TO UPDATE THE DONATION LINKS: edit the two <a> hrefs below.
 * ============================================================
 */
import RevealOnScroll from './RevealOnScroll'
import ScrollZoomFocus from './ScrollZoomFocus'
import './BrainTumourSupportSection.css'

export default function BrainTumourSupportSection({
  eyebrow = 'The Charity',
  title = 'Brain Tumour Support NZ.',
  paragraphs = [],
  imageSide = 'left',
  compact = false,
}) {
  return (
    <section
      className={`btsnz-block btsnz-block--image-${imageSide}${compact ? ' btsnz-block--compact' : ''}`}
      aria-label="About Brain Tumour Support NZ"
    >
      <div className="btsnz-block__inner">
        <RevealOnScroll className="btsnz-block__media">
          <a
            href="https://braintumoursupport.org.nz"
            target="_blank"
            rel="noopener noreferrer"
            className="btsnz-block__media-link"
            aria-label="Visit the Brain Tumour Support NZ website"
          >
            <img
              src="/images/logos/btsnz.png"
              alt="Brain Tumour Support NZ"
              className="btsnz-block__logo"
            />
          </a>
        </RevealOnScroll>

        <RevealOnScroll className="btsnz-block__copy">
          <p className="section-label">{eyebrow}</p>
          <ScrollZoomFocus origin="left">
            <h2 className="section-title">{title}</h2>
          </ScrollZoomFocus>
          <div className="gold-line" />
          <div className="section-body">
            {paragraphs.map((paragraph, index) => (
              <p key={index} style={index > 0 ? { marginTop: 18 } : undefined}>
                {paragraph}
              </p>
            ))}
          </div>
          <div className="btsnz-block__actions">
            <a
              href="https://nogoingback.nz/nicole-white"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Donate at No Going Back
            </a>
            <a
              href="https://braintumoursupport.org.nz"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
            >
              Visit Brain Tumour Support NZ
            </a>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  )
}
