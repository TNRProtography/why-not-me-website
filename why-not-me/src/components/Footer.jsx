/*
 * ============================================================
 * FOOTER.JSX - Site Footer
 * ============================================================
 * Shows on every page. Contains:
 *   - Logo
 *   - Partner links (BTSNZ, TNR Protography, NoGoingBack)
 *   - Copyright notice
 *
 * TO UPDATE LINKS: Edit the href values below.
 * ============================================================
 */
import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      {/* Logo */}
      <Link to="/">
        <img src="/images/logos/logo-white.png" alt="Why Not Me?" className="footer-logo" />
      </Link>

      {/* Partner links */}
      <div className="footer-links">
        <a href="https://braintumoursupport.org.nz" target="_blank" rel="noopener noreferrer">Brain Tumour Support NZ</a>
        <span className="footer-dot">&middot;</span>
        <a href="https://tnrprotography.co.nz" target="_blank" rel="noopener noreferrer">Photography by TNR Protography</a>
        <span className="footer-dot">&middot;</span>
        <a href="https://nogoingback.nz/nicole-white" target="_blank" rel="noopener noreferrer">Donate at nogoingback.nz</a>
      </div>

      {/* Credits */}
      <p className="footer-copy">
        All proceeds support Brain Tumour Support NZ &middot; #WhyNotMe
      </p>
      <p className="footer-copy">
        &copy; 2026 Why Not Me? All photography by TNR Protography. All rights reserved.
      </p>
    </footer>
  )
}
