import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import ScrollAtmosphere from './components/ScrollAtmosphere'
import DonationGoalTracker from './components/DonationGoalTracker'
import HomePage from './pages/HomePage'
import DocumentaryPage from './pages/DocumentaryPage'
import DonatePage from './pages/DonatePage'
import DonationProgressPage from './pages/DonationProgressPage'
import MarathonPage from './pages/MarathonPage'
import LiveTrackerPage from './pages/LiveTrackerPage'
import { isTrackerWindowOpen } from './config/trackerAvailability'

function AnimatedRoutes({ trackerEnabled }) {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/documentary" element={<DocumentaryPage />} />
      <Route path="/queenstown-marathon" element={<MarathonPage />} />
      <Route path="/donate" element={<DonatePage />} />
      <Route path="/donation-progress" element={<DonationProgressPage />} />
      {trackerEnabled && <Route path="/live" element={<LiveTrackerPage />} />}
    </Routes>
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
  const [nowMs, setNowMs] = useState(Date.now())
  const trackerEnabled = isTrackerWindowOpen(nowMs)

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [])

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
        <Nav trackerEnabled={trackerEnabled} />
        <DonationGoalTracker variant="compact" />
        <AnimatedRoutes trackerEnabled={trackerEnabled} />
        <Footer />
      </div>
    </BrowserRouter>
  )
}
