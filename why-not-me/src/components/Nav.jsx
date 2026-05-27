import { useState, useEffect } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import './Nav.css'

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/documentary', label: 'Documentary' },
  { to: '/queenstown-marathon', label: 'Marathon' },
  { to: '/live', label: 'Live Tracker' },
]

export default function Nav() {
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

  return (
    <>
      <motion.nav
        className={`main-nav ${scrolled ? 'scrolled' : ''}`}
        initial={{ y: -90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.19, 1, 0.22, 1] }}
      >
        <Link to="/" className="nav-logo-link" aria-label="Why Not Me home">
          <motion.img
            src="/images/logos/logo-white-transparent.png"
            alt="Why Not Me?"
            className="nav-logo"
            whileHover={{ scale: 1.06, rotate: -2 }}
            transition={{ duration: 0.45, ease: [0.19, 1, 0.22, 1] }}
          />
        </Link>

        <div className="nav-links">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/donate" className="nav-donate-btn">Donate</NavLink>
        </div>

        <button
          className={`hamburger ${mobileOpen ? 'open' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          <span /><span /><span />
        </button>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.19, 1, 0.22, 1] }}
          >
            <motion.div
              className="mobile-menu-bg"
              aria-hidden="true"
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.04, opacity: 0 }}
              transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
            />
            <motion.div
              className="mobile-menu-inner"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
              }}
            >
              {[...navItems, { to: '/donate', label: 'Donate' }].map((item) => (
                <motion.div
                  key={item.to}
                  variants={{
                    hidden: { opacity: 0, y: 24, filter: 'blur(10px)' },
                    visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
                  }}
                  transition={{ duration: 0.65, ease: [0.19, 1, 0.22, 1] }}
                >
                  <NavLink to={item.to} end={item.end} onClick={closeMobile}>{item.label}</NavLink>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
