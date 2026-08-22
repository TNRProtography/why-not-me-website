import { createContext, useContext, useEffect, useState } from 'react'
import { getCourse, DEFAULT_COURSE_ID } from './courses'

const SiteConfigContext = createContext({
  loaded: false,
  comingSoon: false,
  quizEnabled: false,
  trackerEnabled: false,
  furthestDistance: { km: 20, label: 'Longest run so far', quote: '' },
  trackerCourse: getCourse(DEFAULT_COURSE_ID),
  raw: null,
})

function isInDateRange(feature) {
  if (!feature || !feature.enabled) return false
  const now = Date.now()
  if (feature.startDate) {
    const start = new Date(feature.startDate).getTime()
    if (Number.isFinite(start) && now < start) return false
  }
  if (feature.endDate) {
    const end = new Date(feature.endDate).getTime()
    if (Number.isFinite(end) && now > end) return false
  }
  return true
}

export function SiteConfigProvider({ children }) {
  const [config, setConfig] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('https://quiz-wnm.thenamesrock.workers.dev/config')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.config) {
          setConfig(data.config)
          setLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true) // fail open: loaded but no config = defaults
      })
    return () => { cancelled = true }
  }, [])

  // Re-check date ranges every 30s
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  const value = {
    loaded,
    comingSoon: config?.comingSoon || false,
    quizEnabled: config ? isInDateRange(config.quiz) : false,
    trackerEnabled: config ? isInDateRange(config.tracker) : false,
    furthestDistance: config?.furthestDistance || { km: 20, label: 'Longest run so far', quote: '' },
    // Which race course the tracker map should show. Set in the admin page.
    trackerCourse: getCourse(config?.tracker?.course || DEFAULT_COURSE_ID),
    raw: config,
  }

  return (
    <SiteConfigContext.Provider value={value}>
      {children}
    </SiteConfigContext.Provider>
  )
}

export function useSiteConfig() {
  return useContext(SiteConfigContext)
}
