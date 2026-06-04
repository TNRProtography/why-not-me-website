import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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

function useDonationProgress() {
  const [state, setState] = useState(initialState)

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

  return { ...state, progress }
}

function CompactDonationTracker() {
  const { loading, error, progress } = useDonationProgress()
  const supporterCount = progress.donorCount || progress.donationCount

  return (
    <section className="donation-strip" aria-label="Live donation progress">
      <div className="donation-strip__content">
        <div className="donation-strip__copy">
          <span className="donation-strip__eyebrow">Live fundraising</span>
          <strong>{loading ? 'Loading progress' : `${formatCurrency(progress.raised, progress.currency)} raised`}</strong>
          <span>{progress.goal > 0 ? `${progress.displayPercent}% of ${formatCurrency(progress.goal, progress.currency)}` : 'Progress updating from Raisely'}</span>
        </div>

        <div className="donation-strip__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress.displayPercent}>
          <span style={{ width: `${progress.percent}%` }} />
        </div>

        <div className="donation-strip__actions">
          <span>{supporterCount ? `${supporterCount} supporters` : 'Live from Raisely'}</span>
          <Link to="/donation-progress">Learn more</Link>
        </div>
      </div>
      {error && <p className="donation-strip__error">{error}</p>}
    </section>
  )
}

function DetailedDonationTracker() {
  const { loading, error, profile, donations, updatedAt, progress } = useDonationProgress()
  const recentDonations = donations.slice(0, 12)
  const supporterCount = progress.donorCount || progress.donationCount

  return (
    <section className="donation-detail" aria-label="Donation progress details">
      <div className="donation-detail__glow" aria-hidden="true" />
      <div className="donation-detail__inner">
        <div className="donation-detail__hero-card">
          <div className="donation-detail__copy">
            <p className="section-label">Live Fundraising Progress</p>
            <h2>Every gift carries Nicole closer.</h2>
            <p>
              The totals below update from Raisely and show the public support behind Nicole's marathon for Brain Tumour Support NZ.
            </p>
            <div className="donation-detail__actions">
              <a href="https://nogoingback.nz/nicole-white" className="btn-primary" target="_blank" rel="noopener noreferrer">Donate now</a>
              <a href="#recent-donations" className="btn-outline">See donations</a>
            </div>
          </div>

          <div className="donation-detail__orb" style={{ '--progress': `${progress.percent * 3.6}deg` }} aria-hidden="true">
            <div>
              <strong>{loading ? '...' : `${progress.displayPercent}%`}</strong>
              <span>Funded</span>
            </div>
          </div>
        </div>

        <div className="donation-detail__stats" aria-live="polite">
          <div>
            <span>Raised</span>
            <strong>{loading ? 'Loading' : formatCurrency(progress.raised, progress.currency)}</strong>
          </div>
          <div>
            <span>Goal</span>
            <strong>{progress.goal > 0 ? formatCurrency(progress.goal, progress.currency) : 'Updating'}</strong>
          </div>
          <div>
            <span>Supporters</span>
            <strong>{supporterCount || 'Updating'}</strong>
          </div>
          <div>
            <span>Last update</span>
            <strong>{updatedAt ? formatDate(updatedAt) : 'Live'}</strong>
          </div>
        </div>

        <div className="donation-detail__progress-card">
          <div className="donation-detail__progress-head">
            <span>{profile?.name || 'Nicole White'}</span>
            <span>{progress.displayPercent}%</span>
          </div>
          <div className="donation-detail__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress.displayPercent}>
            <span style={{ width: `${progress.percent}%` }} />
          </div>
          {error && <p className="donation-detail__error">{error}</p>}
        </div>

        <div className="donation-detail__donations" id="recent-donations">
          <div className="donation-detail__section-head">
            <p className="section-label">Recent donations</p>
            <h3>Names, notes, and generous moments.</h3>
          </div>

          {recentDonations.length > 0 ? (
            <div className="donation-detail__grid">
              {recentDonations.map((donation, index) => (
                <article className="donation-detail__donation-card" key={donation.id} style={{ '--delay': `${index * 45}ms` }}>
                  <div className="donation-detail__donation-top">
                    <strong>{donation.name || 'Anonymous supporter'}</strong>
                    <span>{formatCurrency(donation.amount, donation.currency || progress.currency)}</span>
                  </div>
                  {donation.message && <p>{donation.message}</p>}
                  <small>{formatDate(donation.createdAt)}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="donation-detail__empty">
              {loading ? 'Loading the latest gifts from Raisely.' : 'Public donations will appear here when Raisely shares them.'}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export default function DonationGoalTracker({ variant = 'compact' }) {
  if (variant === 'detail') return <DetailedDonationTracker />
  return <CompactDonationTracker />
}
