import { Link } from 'react-router-dom'
import ScrollZoomFocus from './ScrollZoomFocus'
import { trackSocialClick, trackExternalLink, trackCtaClick, trackSponsorClick } from '../utils/analytics'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      <ScrollZoomFocus className="footer-logo-scroll-focus" scaleTo={1.9} yTo={-54} blurTo={8} opacityTo={0.18}>
        <Link to="/" aria-label="Why Not Me home">
          <img src="/images/logos/logo-white-transparent.png" alt="Why Not Me?" className="footer-logo" />
        </Link>
      </ScrollZoomFocus>

      <div className="footer-partner">
        <span className="footer-partner-label">Proudly supporting</span>
        <a
          href="https://braintumoursupport.org.nz"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-partner-link"
          aria-label="Brain Tumour Support NZ"
          onClick={() => trackExternalLink('https://braintumoursupport.org.nz', 'BTSNZ Logo', 'footer_partner')}
        >
          <img src="/images/logos/btsnz.png" alt="Brain Tumour Support NZ" className="footer-partner-logo" />
        </a>
      </div>

      <div className="footer-social">
        <a href="https://www.facebook.com/nicole.white.why.not.me/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" onClick={() => trackSocialClick('facebook', 'footer')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        </a>
        <a href="https://www.tiktok.com/@nicole_white_why_not_me" target="_blank" rel="noopener noreferrer" aria-label="TikTok" onClick={() => trackSocialClick('tiktok', 'footer')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13a8.28 8.28 0 005.58 2.16v-3.45a4.85 4.85 0 01-2.68-.81 4.83 4.83 0 01-1.32-4.21z"/></svg>
        </a>
        <a href="https://www.youtube.com/@WhyNotMeNicoleWhite" target="_blank" rel="noopener noreferrer" aria-label="YouTube" onClick={() => trackSocialClick('youtube', 'footer')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
        </a>
        <a href="mailto:nicole@whynotme.co.nz" aria-label="Email Nicole" onClick={() => trackSocialClick('email', 'footer')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4l-10 8L2 4"/></svg>
        </a>
      </div>

      <div className="footer-sponsors">
        <span className="footer-sponsors-label">Sponsors</span>
        <div className="footer-sponsors-logos">
          <a href="https://www.westpower.co.nz" target="_blank" rel="noopener noreferrer" onClick={() => trackSponsorClick('Westpower', 'https://www.westpower.co.nz')}>
            <img src="/images/sponsors/primary-logo-inverse.svg" alt="Westpower" className="footer-sponsor-logo" />
          </a>
          <a href="https://brightprint.co.nz/" target="_blank" rel="noopener noreferrer" onClick={() => trackSponsorClick('Bright Print', 'https://brightprint.co.nz/')}>
            <img src="/images/sponsors/brightprint.png" alt="Bright Print & Packaging" className="footer-sponsor-logo" />
          </a>
          <a href="https://mortgagelink.co.nz/find-an-adviser/mortgage-link-christchurch/jules-keillor/" target="_blank" rel="noopener noreferrer" onClick={() => trackSponsorClick('Mortgage Link', 'https://mortgagelink.co.nz/find-an-adviser/mortgage-link-christchurch/jules-keillor/')}>
            <img src="/images/sponsors/mortgagelink.png" alt="Mortgage Link" className="footer-sponsor-logo" />
          </a>
          <a href="https://www.badboygraphix.co.nz/" target="_blank" rel="noopener noreferrer" onClick={() => trackSponsorClick('Badboy Graphix', 'https://www.badboygraphix.co.nz/')}>
            <img src="/images/sponsors/badboy-graphix.png" alt="Badboy Graphix" className="footer-sponsor-logo footer-sponsor-logo--square" />
          </a>
          <a href="https://westfleet.co.nz/" target="_blank" rel="noopener noreferrer" onClick={() => trackSponsorClick('Westfleet Seafoods', 'https://westfleet.co.nz/')}>
            <img src="/images/sponsors/westfleet.png" alt="Westfleet Seafoods" className="footer-sponsor-logo" />
          </a>
          <a href="https://www.tnrprotography.co.nz" target="_blank" rel="noopener noreferrer" onClick={() => trackSponsorClick('TNR Protography', 'https://www.tnrprotography.co.nz')}>
            <img src="/images/sponsors/tnr-protography.png" alt="TNR Protography" className="footer-sponsor-logo" />
          </a>
        </div>
      </div>

      <div className="footer-links">
        <a href="https://braintumoursupport.org.nz" target="_blank" rel="noopener noreferrer" onClick={() => trackExternalLink('https://braintumoursupport.org.nz', 'Brain Tumour Support NZ', 'footer')}>Brain Tumour Support NZ</a>
        <span className="footer-dot">&middot;</span>
        <Link to="/queenstown-marathon" onClick={() => trackCtaClick('Queenstown Marathon', 'footer', '/queenstown-marathon')}>Queenstown Marathon</Link>
        <span className="footer-dot">&middot;</span>
        <a href="https://tnrprotography.co.nz" target="_blank" rel="noopener noreferrer" onClick={() => trackExternalLink('https://tnrprotography.co.nz', 'Photography by TNR Protography', 'footer')}>Photography by TNR Protography</a>
        <span className="footer-dot">&middot;</span>
        <a href="https://nogoingback.nz/nicole-white" target="_blank" rel="noopener noreferrer" onClick={() => trackExternalLink('https://nogoingback.nz/nicole-white', 'Donate through Raisely', 'footer')}>Donate through Raisely</a>
      </div>

      <p className="footer-copy">
        All proceeds support Brain Tumour Support NZ &middot; #WhyNotMe
      </p>
      <p className="footer-copy">
        &copy; 2026 Why Not Me? All photography by TNR Protography. All rights reserved.
      </p>
    </footer>
  )
}
