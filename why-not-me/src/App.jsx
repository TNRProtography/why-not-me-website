import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Nav from './components/Nav'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import ScrollAtmosphere from './components/ScrollAtmosphere'
import DonationGoalTracker from './components/DonationGoalTracker'
import HomePage from './pages/HomePage'
import DocumentaryPage from './pages/DocumentaryPage'
import DonationProgressPage from './pages/DonationProgressPage'
import MarathonPage from './pages/MarathonPage'
import DedicateKmPage from './pages/DedicateKmPage'
import QuizNightPage from './pages/QuizNightPage'
import LiveTrackerPage from './pages/LiveTrackerPage'
import NicolesStoryPage from './pages/NicolesStoryPage'
import AdminPage from './pages/AdminPage'
import { SiteConfigProvider, useSiteConfig } from './config/siteConfig'
import { trackPageView, initScrollTracking, initEngagementTracking, trackVisibilityChange } from './utils/analytics'

function PageViewTracker() {
  const location = useLocation()

  useEffect(() => {
    trackPageView(location.pathname, document.title)
    const cleanupScroll = initScrollTracking()
    const cleanupEngagement = initEngagementTracking()
    return () => {
      if (cleanupScroll) cleanupScroll()
      if (cleanupEngagement) cleanupEngagement()
    }
  }, [location.pathname])

  // Track tab visibility changes
  useEffect(() => {
    const handler = () => trackVisibilityChange(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  return null
}

function AnimatedRoutes() {
  const { quizEnabled, trackerEnabled } = useSiteConfig()
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/documentary" element={<DocumentaryPage />} />
      <Route path="/nicoles-story" element={<NicolesStoryPage />} />
      <Route path="/queenstown-marathon" element={<MarathonPage />} />
      <Route path="/dedicate" element={<DedicateKmPage />} />
      {quizEnabled && <Route path="/quiz-night" element={<QuizNightPage />} />}
      <Route path="/donate" element={<DonationProgressPage />} />
      <Route path="/donation-progress" element={<DonationProgressPage />} />
      {trackerEnabled && <Route path="/live" element={<LiveTrackerPage />} />}
      <Route path="/admin" element={<AdminPage />} />
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

function ComingSoon() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      textAlign: 'center',
    }}>
      <img
        src="/images/logos/logo-white-transparent.png"
        alt="Why Not Me?"
        style={{ width: 220, maxWidth: '60vw', marginBottom: 40 }}
      />
      <p style={{
        fontFamily: 'Damion, Georgia, serif',
        fontSize: 'clamp(28px, 5vw, 48px)',
        color: '#F5F3EC',
        margin: 0,
      }}>
        Something is coming soon.
      </p>
    </div>
  )
}

function AppInner() {
  const [isMobileView, setIsMobileView] = useState(getMobileView)
  const { loaded, comingSoon, trackerEnabled, quizEnabled } = useSiteConfig()
  const location = useLocation()

  // Allow /admin even in coming soon mode
  const isAdminRoute = location.pathname === '/admin'

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
    <>
      {loaded && comingSoon && !isAdminRoute ? (
        <ComingSoon />
      ) : (
        <div className={`site-shell ${isMobileView ? 'mobile-view' : 'desktop-view'}`} data-mobile-view={isMobileView}>
          <PageViewTracker />
          <ScrollToTop />
          <ScrollAtmosphere />
          <header className="site-header-sticky">
            <Nav
              trackerEnabled={trackerEnabled}
              quizEnabled={quizEnabled}
              mobileDonationTracker={isMobileView ? <DonationGoalTracker variant="nav" /> : null}
            />
            {!isMobileView && <DonationGoalTracker variant="compact" />}
          </header>
          <AnimatedRoutes />
          <Footer />
        </div>
      )}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SiteConfigProvider>
        <AppInner />
      </SiteConfigProvider>
    </BrowserRouter>
  )
}
