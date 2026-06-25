import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { trackDonateClick, trackDonationSortChange, trackCtaClick } from '../utils/analytics'
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
  year: 'numeric',
})

const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'largest', label: 'Largest gifts' },
  { value: 'smallest', label: 'Smallest gifts' },
  { value: 'name', label: 'Name A to Z' },
]

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

function getDonationTime(donation) {
  const time = new Date(donation.createdAt || 0).getTime()
  return Number.isNaN(time) ? 0 : time
}

function sortDonations(donations, sortBy) {
  return [...donations].sort((a, b) => {
    if (sortBy === 'oldest') return getDonationTime(a) - getDonationTime(b)
    if (sortBy === 'largest') return (Number(b.amount) || 0) - (Number(a.amount) || 0)
    if (sortBy === 'smallest') return (Number(a.amount) || 0) - (Number(b.amount) || 0)
    if (sortBy === 'name') return (a.name || 'Anonymous supporter').localeCompare(b.name || 'Anonymous supporter')
    return getDonationTime(b) - getDonationTime(a)
  })
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
      allDonationCount: Number(profile.allDonationCount) || state.donations.length,
    }
  }, [state.profile, state.donations.length])

  return { ...state, progress }
}

function NavDonationTracker() {
  const { loading, progress } = useDonationProgress()

  return (
    <Link className="donation-nav-mini" to="/donation-progress" aria-label="View live donation progress">
      <span className="donation-nav-mini__text">
        {loading ? 'Loading' : `${formatCurrency(progress.raised, progress.currency)} raised`}
      </span>
      <span className="donation-nav-mini__meta">
        {progress.goal > 0 ? `${progress.displayPercent}% of ${formatCurrency(progress.goal, progress.currency)}` : 'Live fundraising'}
      </span>
      <span className="donation-nav-mini__bar" aria-hidden="true">
        <span style={{ width: `${progress.percent}%` }} />
      </span>
    </Link>
  )
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
          <Link to="/dedicate">Donate &amp; Dedicate a Km</Link>
        </div>
      </div>
      {error && <p className="donation-strip__error">{error}</p>}
    </section>
  )
}

function DetailedDonationTracker({ middleSlot = null }) {
  const { loading, error, profile, donations, updatedAt, progress } = useDonationProgress()
  const [sortBy, setSortBy] = useState('newest')
  const sortedDonations = useMemo(() => sortDonations(donations, sortBy), [donations, sortBy])
  const supporterCount = progress.donorCount || progress.donationCount

  return (
    <section className="donation-detail" aria-label="Donation progress details">
      <div className="donation-detail__inner">
        <div className="donation-detail__hero-card">
          <div className="donation-detail__copy">
            <p className="section-label">Live Fundraising Progress</p>
            <h2>Every gift carries Nicole closer.</h2>
            <p>
              The totals below update from Raisely and show the public support behind Nicole's marathon for Brain Tumour Support NZ.
            </p>
            <div className="donation-detail__actions">
              <a href="https://nogoingback.nz/nicole-white" className="btn-primary" target="_blank" rel="noopener noreferrer" onClick={() => trackDonateClick('donation_detail')}>Donate now</a>
              <Link to="/dedicate" className="btn-outline" onClick={() => trackCtaClick('Dedicate a Km - Free', 'donation_detail', '/dedicate')}>Dedicate a Km - Free</Link>
              <a href="#all-donations" className="btn-outline" onClick={() => trackCtaClick('See all donations', 'donation_detail', '#all-donations')}>See all donations</a>
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
            <span>Public gifts</span>
            <strong>{loading ? 'Loading' : sortedDonations.length}</strong>
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

        {middleSlot && (
          <div className="donation-detail__interlude">
            {middleSlot}
          </div>
        )}

        <div className="donation-detail__donations-shell" id="all-donations">
          <div className="donation-detail__donations">
            <div className="donation-detail__section-head">
              <div>
                <p className="section-label">All public donations</p>
                <h3>Names, notes, and generous moments.</h3>
              </div>
              <label className="donation-detail__sort">
                <span>Sort by</span>
                <select value={sortBy} onChange={(event) => { setSortBy(event.target.value); trackDonationSortChange(event.target.value) }}>
                  {sortOptions.map((option) => (
                    <option value={option.value} key={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {sortedDonations.length > 0 ? (
              <div className="donation-detail__grid">
                {sortedDonations.map((donation) => (
                  <article className="donation-detail__donation-card" key={donation.id} id={`donation-${donation.id}`}>
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
                {loading ? 'Loading every public gift from Raisely.' : 'Public donations will appear here when Raisely shares them.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function DonationGoalTracker({ variant = 'compact', middleSlot = null }) {
  if (variant === 'detail') return <DetailedDonationTracker middleSlot={middleSlot} />
  if (variant === 'nav') return <NavDonationTracker />
  return <CompactDonationTracker />
}
