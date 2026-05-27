/*
 * ============================================================
 * NAV.JSX - Site Navigation
 * ============================================================
 * Features:
 *   - Fixed position, always visible
 *   - Transparent at top, dark/blurred when scrolled
 *   - Active route highlighting (gold underline)
 *   - Mobile hamburger menu with full-screen overlay
 *   - Donate button always visible as CTA
 *
 * TO ADD A NAV LINK:
 *   Add a new <NavLink> inside the nav-links div, and a
 *   matching one inside the mobile-menu div.
 * ============================================================
 */
import { useState, useEffect } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import './Nav.css'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  /* Listen for scroll to toggle nav background */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Close mobile menu when clicking a link */
  const closeMobile = () => setMobileOpen(false)

  return (
    <>
      <nav className={`main-nav ${scrolled ? 'scrolled' : ''}`}>
        {/* Logo - click to go home */}
        <Link to="/" className="nav-logo-link">
          <img
            src="/images/logos/logo-white.png"
            alt="Why Not Me?"
            className="nav-logo"
          />
        </Link>

        {/* Desktop links */}
        <div className="nav-links">
          <NavLink to="/" end className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Home</NavLink>
          <NavLink to="/documentary" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Documentary</NavLink>
          {/* <NavLink to="/sponsorship" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Sponsorship</NavLink> */}
          {/* <NavLink to="/media" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Media</NavLink> */}
          <NavLink to="/donate" className="nav-donate-btn">Donate</NavLink>
        </div>

        {/* Mobile hamburger */}
        <button
          className={`hamburger ${mobileOpen ? 'open' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* Mobile full-screen menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <NavLink to="/" onClick={closeMobile}>Home</NavLink>
            <NavLink to="/documentary" onClick={closeMobile}>Documentary</NavLink>
            {/* <NavLink to="/sponsorship" onClick={closeMobile}>Sponsorship</NavLink> */}
            {/* <NavLink to="/media" onClick={closeMobile}>Media</NavLink> */}
            <NavLink to="/donate" onClick={closeMobile}>Donate</NavLink>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}