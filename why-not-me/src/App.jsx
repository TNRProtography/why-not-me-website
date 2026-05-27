import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Nav from './components/Nav'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import ScrollAtmosphere from './components/ScrollAtmosphere'
import HomePage from './pages/HomePage'
import DocumentaryPage from './pages/DocumentaryPage'
import DonatePage from './pages/DonatePage'
import MarathonPage from './pages/MarathonPage'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/documentary" element={<DocumentaryPage />} />
        <Route path="/queenstown-marathon" element={<MarathonPage />} />
        <Route path="/donate" element={<DonatePage />} />
      </Routes>
    </AnimatePresence>
  )
}

function getMobileView() {
  if (typeof window === 'undefined') return false

  const viewportMatch = window.matchMedia('(max-width: 820px)').matches
  const touchMatch = window.matchMedia('(hover: none) and (pointer: coarse)').matches
  const compactLandscape = window.matchMedia('(max-height: 540px) and (max-width: 980px)').matches

  return viewportMatch || (touchMatch && window.innerWidth <= 980) || compactLandscape
}

export default function App() {
  const [isMobileView, setIsMobileView] = useState(getMobileView)

  useEffect(() => {
    const updateMobileView = () => setIsMobileView(getMobileView())
    const viewportQuery = window.matchMedia('(max-width: 820px)')
    const touchQuery = window.matchMedia('(hover: none) and (pointer: coarse)')
    const compactQuery = window.matchMedia('(max-height: 540px) and (max-width: 980px)')

    updateMobileView()

    window.addEventListener('resize', updateMobileView, { passive: true })
    window.addEventListener('orientationchange', updateMobileView)
    viewportQuery.addEventListener('change', updateMobileView)
    touchQuery.addEventListener('change', updateMobileView)
    compactQuery.addEventListener('change', updateMobileView)

    return () => {
      window.removeEventListener('resize', updateMobileView)
      window.removeEventListener('orientationchange', updateMobileView)
      viewportQuery.removeEventListener('change', updateMobileView)
      touchQuery.removeEventListener('change', updateMobileView)
      compactQuery.removeEventListener('change', updateMobileView)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.device = isMobileView ? 'mobile' : 'desktop'
    document.body.classList.toggle('is-mobile-view', isMobileView)
    document.body.classList.toggle('is-desktop-view', !isMobileView)

    return () => {
      document.documentElement.removeAttribute('data-device')
      document.body.classList.remove('is-mobile-view', 'is-desktop-view')
    }
  }, [isMobileView])

  return (
    <BrowserRouter>
      <div className={`site-shell ${isMobileView ? 'mobile-view' : 'desktop-view'}`} data-mobile-view={isMobileView}>
        <ScrollToTop />
        <ScrollAtmosphere />
        <Nav />
        <AnimatedRoutes />
        <Footer />
      </div>
    </BrowserRouter>
  )
}
