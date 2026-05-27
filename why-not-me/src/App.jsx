/*
 * ============================================================
 * APP.JSX - Main Application Shell
 * ============================================================
 * This is the root component. It sets up:
 *   - React Router for multi-page navigation
 *   - AnimatePresence for page exit/enter animations
 *   - The persistent Nav and Footer across all pages
 *   - ScrollToTop utility so pages start at the top
 *
 * PAGES:
 *   /              -> HomePage (scrolling homepage with all main sections)
 *   /documentary   -> DocumentaryPage (YouTube embed + sharing)
 *   /donate        -> DonatePage (donation links + charity info)
 *   /sponsorship   -> SponsorshipPage (DISABLED - file still in repo, re-enable below)
 *   /media         -> MediaPage (DISABLED - file still in repo, re-enable below)
 *
 * TO RE-ENABLE SPONSORSHIP OR MEDIA:
 *   1. Uncomment the imports below
 *   2. Uncomment the <Route> lines in AnimatedRoutes
 *   3. Uncomment the nav links in src/components/Nav.jsx
 *
 * TO ADD A NEW PAGE:
 *   1. Create a new file in src/pages/
 *   2. Import it below
 *   3. Add a <Route> inside the <Routes> block
 *   4. Add a nav link in src/components/Nav.jsx
 * ============================================================
 */

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Nav from './components/Nav'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import HomePage from './pages/HomePage'
import DocumentaryPage from './pages/DocumentaryPage'
import DonatePage from './pages/DonatePage'
// import SponsorshipPage from './pages/SponsorshipPage'  // DISABLED - uncomment to re-enable
// import MediaPage from './pages/MediaPage'              // DISABLED - uncomment to re-enable

/* AnimatedRoutes needs useLocation which requires being inside BrowserRouter */
function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/documentary" element={<DocumentaryPage />} />
        <Route path="/donate" element={<DonatePage />} />
        {/* <Route path="/sponsorship" element={<SponsorshipPage />} /> */}
        {/* <Route path="/media" element={<MediaPage />} /> */}
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Nav />
      <AnimatedRoutes />
      <Footer />
    </BrowserRouter>
  )
}