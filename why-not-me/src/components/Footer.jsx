import { Link } from 'react-router-dom'
import ScrollZoomFocus from './ScrollZoomFocus'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      <ScrollZoomFocus className="footer-logo-scroll-focus" scaleTo={1.9} yTo={-54} blurTo={8} opacityTo={0.18}>
        <Link to="/" aria-label="Why Not Me home">
          <img src="/images/logos/logo-white-transparent.png" alt="Why Not Me?" className="footer-logo" />
        </Link>
      </ScrollZoomFocus>

      <div className="footer-links">
        <a href="https://braintumoursupport.org.nz" target="_blank" rel="noopener noreferrer">Brain Tumour Support NZ</a>
        <span className="footer-dot">&middot;</span>
        <Link to="/queenstown-marathon">Queenstown Marathon</Link>
        <span className="footer-dot">&middot;</span>
        <a href="https://tnrprotography.co.nz" target="_blank" rel="noopener noreferrer">Photography by TNR Protography</a>
        <span className="footer-dot">&middot;</span>
        <a href="https://nogoingback.nz/nicole-white" target="_blank" rel="noopener noreferrer">Donate through Raisely</a>
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
