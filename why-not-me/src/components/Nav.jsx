import { useState, useEffect } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { trackNavClick, trackMobileMenuToggle, trackDonateClick, trackExternalLink } from '../utils/analytics'
import './Nav.css'

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/nicoles-story', label: "Nicole's Story" },
  { to: '/documentary', label: 'Documentary' },
  { to: '/queenstown-marathon', label: 'Marathon' },
  { to: '/dedicate', label: 'Dedicate a Km' },
]

export default function Nav({ trackerEnabled = false, mobileDonationTracker = null }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 70)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const closeMobile = () => setMobileOpen(false)
  const visibleNavItems = trackerEnabled
    ? [...navItems, { to: '/live', label: 'Live Tracker' }]
    : navItems

  return (
    <>
      <nav className={`main-nav ${scrolled ? 'scrolled' : ''}`}>
        <Link to="/" className="nav-logo-link" aria-label="Why Not Me home">
          <img
            src="/images/logos/logo-white-transparent.png"
            alt="Why Not Me?"
            className="nav-logo"
          />
        </Link>

        {mobileDonationTracker && (
          <div className="nav-mobile-donation">
            {mobileDonationTracker}
          </div>
        )}

        <div className="nav-links">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              onClick={() => trackNavClick(item.label, item.to)}
            >
              {item.label}
            </NavLink>
          ))}
          <a href="https://braintumoursupport.org.nz" target="_blank" rel="noopener noreferrer" className="nav-link" onClick={() => trackExternalLink('https://braintumoursupport.org.nz', 'Support', 'nav')}>Support</a>
          <NavLink to="/donate" className="nav-donate-btn" onClick={() => trackNavClick('Donate', '/donate')}>Donate</NavLink>
        </div>

        <button
          className={`hamburger ${mobileOpen ? 'open' : ''}`}
          onClick={() => { const next = !mobileOpen; setMobileOpen(next); trackMobileMenuToggle(next) }}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          <span /><span /><span />
        </button>
      </nav>

      {mobileOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-bg" aria-hidden="true" />
          <div className="mobile-menu-inner">
            {[...visibleNavItems, { to: '/donate', label: 'Donate' }].map((item) => (
              <div key={item.to}>
                <NavLink to={item.to} end={item.end} onClick={() => { closeMobile(); trackNavClick(item.label, item.to) }}>{item.label}</NavLink>
              </div>
            ))}
            <div>
              <a href="https://braintumoursupport.org.nz" target="_blank" rel="noopener noreferrer" onClick={() => { closeMobile(); trackExternalLink('https://braintumoursupport.org.nz', 'Support', 'mobile_menu') }}>Support</a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
