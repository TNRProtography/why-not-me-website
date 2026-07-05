import { useState, useEffect } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { trackNavClick, trackMobileMenuToggle, trackDonateClick, trackExternalLink } from '../utils/analytics'
import './Nav.css'

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/nicoles-story', label: "Nicole's Story" },
  { to: '/live', label: 'Live Tracker', trackerOnly: true },
  { to: '/quiz-night', label: 'Quiz Night', quizOnly: true },
  { to: '/dedicate', label: 'Dedicate a Km' },
  { to: '/donate', label: 'Donate', isDonate: true },
  { to: '/documentary', label: 'Documentary' },
  { to: '/queenstown-marathon', label: 'Marathon' },
]

export default function Nav({ trackerEnabled = false, quizEnabled = false, mobileDonationTracker = null }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

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

  const currentPath = location.pathname
  const visibleItems = navItems
    .filter((item) => !item.trackerOnly || trackerEnabled)
    .filter((item) => !item.quizOnly || quizEnabled)
    .filter((item) => {
      if (item.end) return currentPath !== item.to
      return !currentPath.startsWith(item.to)
    })

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
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={item.isDonate ? 'nav-donate-btn' : 'nav-link'}
              onClick={() => trackNavClick(item.label, item.to)}
            >
              {item.label}
            </NavLink>
          ))}
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
          <button className="mobile-menu-close" onClick={() => { setMobileOpen(false); trackMobileMenuToggle(false) }} aria-label="Close menu">&times;</button>
          <div className="mobile-menu-inner">
            {visibleItems.map((item) => (
              <div key={item.to}>
                <NavLink to={item.to} end={item.end} onClick={() => { closeMobile(); trackNavClick(item.label, item.to) }}>{item.label}</NavLink>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
