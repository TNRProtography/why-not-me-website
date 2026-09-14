import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

// Shared, single-poller donation feed. Everything that needs live donation
// data (the nav/compact/detail trackers, the "new donation" celebration
// banner) reads from this one context instead of each polling the API on
// its own timer - one fetch feeds every consumer, and it also gives us a
// single place to notice a donation that wasn't there a moment ago.

// The worker edge-caches /api/raisely-progress for ~45s (see public/_worker.js),
// so polling faster than that doesn't hit Raisely any harder - it just lets a
// visitor see a new donation as soon as the shared cache has it.
const REFRESH_INTERVAL_MS = 15000
const MAX_EVENT_LOG = 30

const currencyFormatter = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  maximumFractionDigits: 0,
})

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

const initialState = {
  loading: true,
  error: '',
  profile: null,
  donations: [],
  updatedAt: null,
  newDonationEvents: [],
}

const DonationFeedContext = createContext({
  ...initialState,
  progress: {
    raised: 0,
    goal: 0,
    percent: 0,
    displayPercent: 0,
    currency: 'NZD',
    donorCount: 0,
    donationCount: 0,
    allDonationCount: 0,
  },
})

export function DonationFeedProvider({ children }) {
  const [state, setState] = useState(initialState)

  // Every donation id we've already shown/counted, so a page refresh (or the
  // very first load) doesn't replay the whole donation history as "new".
  const seenIdsRef = useRef(new Set())
  const hasSeededRef = useRef(false)
  const seqRef = useRef(0)

  useEffect(() => {
    let cancelled = false

    async function loadDonationData(isRefresh = false) {
      try {
        if (!isRefresh) {
          setState((current) => ({ ...current, loading: true, error: '' }))
        }

        // Cache-bust so this actually reaches the worker's shared edge cache
        // instead of being satisfied silently from this browser's own HTTP
        // cache (which would make the poll pointless).
        const cacheBust = `${Date.now()}-${Math.random().toString(36).slice(2)}`

        const [raiselyRes, manualRes] = await Promise.all([
          fetch(`/api/raisely-progress?_=${cacheBust}`, { headers: { Accept: 'application/json' } }),
          fetch('https://quiz-wnm.thenamesrock.workers.dev/donations')
            .then((r) => r.json())
            .catch(() => ({ donations: [] })),
        ])

        if (!raiselyRes.ok) {
          throw new Error(`Donation progress request failed with ${raiselyRes.status}`)
        }

        const payload = await raiselyRes.json()
        const manualDonations = (manualRes && manualRes.donations) ? manualRes.donations : []

        const mergedDonations = [...(payload.donations || [])]
        let manualTotal = 0
        let manualCount = 0

        for (const entry of manualDonations) {
          manualTotal += (entry.amount || 0)
          manualCount++
          mergedDonations.push({
            id: entry.id,
            name: entry.name || 'Anonymous supporter',
            message: entry.message || '',
            amount: entry.amount || 0,
            currency: 'NZD',
            createdAt: entry.createdAt,
            kind: entry.kind || 'donation',
            source: 'admin',
          })
        }

        const profile = payload.profile || {}
        profile.raised = (Number(profile.raised) || 0) + manualTotal
        profile.donorCount = (Number(profile.donorCount) || 0) + manualCount
        profile.donationCount = (Number(profile.donationCount) || 0) + manualCount
        profile.allDonationCount = (Number(profile.allDonationCount) || 0) + manualCount
        if (profile.goal > 0) {
          profile.percent = (profile.raised / profile.goal) * 100
        }

        // Spot donations we haven't seen yet. On the very first load these
        // are just "everything that already existed" - seed silently rather
        // than announcing the whole donation history as brand new.
        let freshEvents = []
        if (!hasSeededRef.current) {
          mergedDonations.forEach((d) => { if (d.id) seenIdsRef.current.add(d.id) })
          hasSeededRef.current = true
        } else {
          const freshOnes = mergedDonations.filter((d) => d.id && !seenIdsRef.current.has(d.id))
          if (freshOnes.length) {
            freshOnes.forEach((d) => seenIdsRef.current.add(d.id))
            freshEvents = [...freshOnes]
              .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
              .map((d) => ({ ...d, seq: ++seqRef.current }))
          }
        }

        if (!cancelled) {
          setState((current) => ({
            loading: false,
            error: '',
            profile,
            donations: mergedDonations,
            updatedAt: payload.updatedAt || new Date().toISOString(),
            newDonationEvents: freshEvents.length
              ? [...current.newDonationEvents, ...freshEvents].slice(-MAX_EVENT_LOG)
              : current.newDonationEvents,
          }))
        }
      } catch (error) {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            loading: false,
            error: 'Donation updates are having a breather. Please check back soon.',
          }))
        }
      }
    }

    loadDonationData()
    const interval = window.setInterval(() => loadDonationData(true), REFRESH_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  const progress = useMemo(() => {
    const profile = state.profile || {}
    const raised = Number(profile.raised) || 0
    const goal = Number(profile.goal) || 0
    const percent = goal > 0 ? (raised / goal) * 100 : Number(profile.percent) || 0

    return {
      raised,
      goal,
      percent: clampPercent(percent),
      displayPercent: Math.round(clampPercent(percent)),
      currency: profile.currency || 'NZD',
      donorCount: Number(profile.donorCount) || 0,
      donationCount: Number(profile.donationCount) || 0,
      allDonationCount: Number(profile.allDonationCount) || state.donations.length,
    }
  }, [state.profile, state.donations.length])

  const value = useMemo(() => ({ ...state, progress }), [state, progress])

  return (
    <DonationFeedContext.Provider value={value}>
      {children}
    </DonationFeedContext.Provider>
  )
}

export function useDonationFeed() {
  return useContext(DonationFeedContext)
}

export function formatDonationCurrency(value, currency = 'NZD') {
  const amount = Number(value) || 0
  try {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency,
      maximumFractionDigits: amount >= 100 ? 0 : 2,
    }).format(amount)
  } catch {
    return currencyFormatter.format(amount)
  }
}
