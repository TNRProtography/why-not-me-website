import { useEffect, useMemo, useState } from 'react'
import './DonationGoalTracker.css'

const REFRESH_INTERVAL_MS = 60000

const currencyFormatter = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('en-NZ', {
  day: 'numeric',
  month: 'short',
})

const initialState = {
  loading: true,
  error: '',
  profile: null,
  donations: [],
  updatedAt: null,
}

function formatCurrency(value, currency = 'NZD') {
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

function formatDate(value) {
  if (!value) return 'Recent'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recent'
  return dateFormatter.format(date)
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

export default function DonationGoalTracker() {
  const [state, setState] = useState(initialState)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadDonationData(isRefresh = false) {
      try {
        if (!isRefresh) {
          setState((current) => ({ ...current, loading: true, error: '' }))
        }

        const response = await fetch('/api/raisely-progress', {
          headers: { Accept: 'application/json' },
        })

        if (!response.ok) {
          throw new Error(`Donation progress request failed with ${response.status}`)
        }

        const payload = await response.json()

        if (!cancelled) {
          setState({
            loading: false,
            error: '',
            profile: payload.profile,
            donations: payload.donations || [],
            updatedAt: payload.updatedAt || new Date().toISOString(),
          })
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
    }
  }, [state.profile])

  const visibleDonations = expanded ? state.donations : state.donations.slice(0, 3)
  const hasDonations = state.donations.length > 0

  return (
    <section className="donation-goal" aria-label="Donation goal tracker">
      <div className="donation-goal__glow" aria-hidden="true" />
      <div className="donation-goal__inner">
        <div className="donation-goal__summary">
          <p className="section-label donation-goal__label">Live Fundraising Progress</p>
          <div className="donation-goal__headline">
            <h2>Help Nicole reach the finish line.</h2>
            <a href="https://nogoingback.nz/nicole-white" className="btn-primary donation-goal__button" target="_blank" rel="noopener noreferrer">
              Donate now
            </a>
          </div>

          <div className="donation-goal__amounts" aria-live="polite">
            <span className="donation-goal__raised">
              {state.loading ? 'Loading' : formatCurrency(progress.raised, progress.currency)}
            </span>
            <span className="donation-goal__target">
              {progress.goal > 0 ? `of ${formatCurrency(progress.goal, progress.currency)} goal` : 'raised so far'}
            </span>
          </div>

          <div className="donation-goal__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress.displayPercent}>
            <span style={{ width: `${progress.percent}%` }} />
          </div>

          <div className="donation-goal__meta">
            <span>{progress.displayPercent}% funded</span>
            <span>{progress.donorCount || progress.donationCount} supporters</span>
            <span>{state.updatedAt ? `Updated ${formatDate(state.updatedAt)}` : 'Live from Raisely'}</span>
          </div>

          {state.error && <p className="donation-goal__error">{state.error}</p>}
        </div>

        <div className="donation-goal__stream">
          <div className="donation-goal__stream-head">
            <p>Recent donations</p>
            {hasDonations && state.donations.length > 3 && (
              <button type="button" onClick={() => setExpanded((value) => !value)}>
                {expanded ? 'Show less' : 'Show all'}
              </button>
            )}
          </div>

          {hasDonations ? (
            <ul className="donation-goal__list">
              {visibleDonations.map((donation) => (
                <li key={donation.id} className="donation-goal__donation">
                  <div>
                    <strong>{donation.name || 'Anonymous supporter'}</strong>
                    {donation.message && <p>{donation.message}</p>}
                  </div>
                  <span>
                    {formatCurrency(donation.amount, donation.currency || progress.currency)}
                    <small>{formatDate(donation.createdAt)}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="donation-goal__empty">
              {state.loading ? 'Loading the latest gifts from Raisely.' : 'Donations will appear here when Raisely shares them publicly.'}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
