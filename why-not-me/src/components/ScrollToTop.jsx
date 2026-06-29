/*
 * ScrollToTop - Scrolls to top of page on route change.
 * Without this, navigating to a new page keeps the scroll
 * position from the previous page.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
