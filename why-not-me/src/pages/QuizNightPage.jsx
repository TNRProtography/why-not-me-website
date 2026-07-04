/*
 * ============================================================
 * QUIZ NIGHT PAGE - /quiz-night
 * ============================================================
 * Booking form for the Why Not Me quiz night fundraiser.
 * October 7, 2026 at Monteith's Brewery, Greymouth.
 * Teams of 4-6, $10 per person, cash on the night.
 * Sold out at 114 people.
 * ============================================================
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import PageTransition from '../components/PageTransition'
import RevealOnScroll from '../components/RevealOnScroll'
import ScrollZoomFocus from '../components/ScrollZoomFocus'
import CountdownTimer from '../components/CountdownTimer'
import { trackQuizPageView, trackQuizFieldFocus, trackQuizMemberFilled, trackQuizFormSubmit, trackQuizBookingSuccess, trackQuizBookingError, trackQuizSoldOutView, trackQuizUrgencyView, trackQuizDocumentaryClick, trackQuizDonateClick, trackDonateClick, trackExternalLink } from '../utils/analytics'
import './QuizNightPage.css'

const MAX_CAPACITY = 114
const MIN_TEAM = 4
const MAX_TEAM = 6
const COST_PER_PERSON = 10
// Quiz Night: Oct 7, 2026, 6:00pm NZST (UTC+13)
const QUIZ_DATE = new Date('2026-10-07T18:00:00+13:00').getTime()

export default function QuizNightPage() {
  const [loading, setLoading] = useState(true)
  const [spotsBooked, setSpotsBooked] = useState(0)
  const [status, setStatus] = useState('open')
  const [teamName, setTeamName] = useState('')
  const [members, setMembers] = useState(['', '', '', '', '', ''])
  const [email, setEmail] = useState('')
  const [lowTable, setLowTable] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const filledMembers = members.filter((m) => m.trim() !== '')
  const memberCount = filledMembers.length
  const totalCost = memberCount * COST_PER_PERSON
  const isSoldOut = status === 'sold_out'

  const teamTooSmall = memberCount < MIN_TEAM
  const teamTooBig = memberCount > MAX_TEAM

  const fetchCapacity = useCallback(async () => {
    try {
      const res = await fetch('/api/quiz-bookings')
      if (res.ok) {
        const data = await res.json()
        setSpotsBooked(data.spotsBooked || 0)
        setStatus(data.status || 'open')
        trackQuizPageView(data.spotsBooked || 0, data.status || 'open')
        if (data.status === 'sold_out') trackQuizSoldOutView()
        else if ((data.spotsBooked || 0) >= 80) trackQuizUrgencyView('nearly_sold_out')
        else if ((data.spotsBooked || 0) >= 40) trackQuizUrgencyView('selling_fast')
        else if ((data.spotsBooked || 0) >= 5) trackQuizUrgencyView('filling_quick')
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchCapacity() }, [fetchCapacity])

  const updateMember = (index, value) => {
    const next = [...members]
    next[index] = value
    setMembers(next)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (teamTooSmall) {
      setError(`You need at least ${MIN_TEAM} team members.`)
      return
    }

    setSubmitting(true)
    trackQuizFormSubmit(memberCount)
    try {
      const res = await fetch('/api/quiz-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName: teamName.trim(),
          members: filledMembers.map((m) => m.trim()),
          email: email.trim(),
          lowTable,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        trackQuizBookingError(data.error || 'unknown', memberCount)
        if (data.status) setStatus(data.status)
        setSubmitting(false)
        return
      }

      setSpotsBooked(data.spotsBooked || spotsBooked + memberCount)
      if (data.status) setStatus(data.status)
      trackQuizBookingSuccess(memberCount, teamName.trim())
      setSuccess({
        teamName: teamName.trim() || 'Your team',
        members: filledMembers.map((m) => m.trim()),
        email: email.trim(),
        memberCount,
        totalCost,
        lowTable,
      })
      setSubmitting(false)
    } catch {
      setError('Could not connect. Please try again.')
      setSubmitting(false)
    }
  }

  const closeSuccess = () => {
    setSuccess(null)
    setTeamName('')
    setMembers(['', '', '', '', '', ''])
    setEmail('')
    setLowTable(false)
  }

  if (loading) {
    return <PageTransition><div className="quiz-loading">Loading...</div></PageTransition>
  }

  return (
    <PageTransition>
      {/* Hero */}
      <section className="quiz-hero">
        <div className="quiz-hero-bg" />
        <div className="quiz-hero-content">
          <p className="section-label">Fundraiser Event</p>
          <ScrollZoomFocus><h1>Quiz Night.</h1></ScrollZoomFocus>
          <p className="quiz-hero-subtitle">
            Get a team together, watch the documentary, and come ready to play. Over $2,000 in prizes across quiz winners, raffles and spot prizes. All proceeds support Brain Tumour Support NZ.
          </p>
        </div>
      </section>

      {/* Event details bar */}
      <div className="quiz-details-bar">
        <div className="quiz-details-inner">
          <div className="quiz-detail-item">
            <span className="quiz-detail-value">Oct 7</span>
            <span className="quiz-detail-label">2026</span>
          </div>
          <div className="quiz-detail-divider" />
          <div className="quiz-detail-item">
            <span className="quiz-detail-value">6pm</span>
            <span className="quiz-detail-label">Doors Open</span>
          </div>
          <div className="quiz-detail-divider" />
          <div className="quiz-detail-item">
            <span className="quiz-detail-value">$10</span>
            <span className="quiz-detail-label">Per Person</span>
          </div>
          <div className="quiz-detail-divider" />
          <div className="quiz-detail-item">
            <span className="quiz-detail-value" style={{ fontSize: '18px' }}>Monteith's Brewery</span>
            <span className="quiz-detail-label">Greymouth</span>
          </div>
        </div>
      </div>

      {/* Countdown */}
      {Date.now() < QUIZ_DATE && (
        <div className="quiz-countdown-section">
          <CountdownTimer targetDate={QUIZ_DATE} label="Countdown to Quiz Night" passedMessage="Tonight!" />
        </div>
      )}

      {/* Urgency messaging */}
      {!isSoldOut && spotsBooked >= 5 && (
        <div style={{ textAlign: 'center', padding: '20px 40px 0' }}>
          <p style={{
            display: 'inline-block',
            background: 'rgba(168,142,93,0.1)',
            border: '1px solid rgba(168,142,93,0.25)',
            padding: '12px 24px',
            fontSize: '0.9rem',
            fontWeight: 700,
            color: '#A88E5D',
            letterSpacing: '0.5px',
          }}>
            {spotsBooked >= 80
              ? '🔥 Limited spots left. Nearly sold out!'
              : spotsBooked >= 40
                ? 'Selling out quick, get in so you don\'t miss out!'
                : 'Spots are filling quick, book fast!'}
          </p>
        </div>
      )}

      {/* What to expect */}
      <section className="quiz-info-section">
        <RevealOnScroll>
          <p className="section-label">On the Night</p>
          <div className="quiz-info-grid">
            <div className="quiz-info-card">
              <div className="quiz-info-card-icon">🎬</div>
              <div className="quiz-info-card-title">Documentary Round</div>
              <p className="quiz-info-card-desc">
                There's a dedicated documentary round based on "A Bit of Vengeance - Nicole White - Her Story." Watch it before you come, all the answers are in the doco!
              </p>
            </div>
            <div className="quiz-info-card">
              <div className="quiz-info-card-icon">🏆</div>
              <div className="quiz-info-card-title">$2,000+ in Prizes</div>
              <p className="quiz-info-card-desc">
                Heaps of prizes on the night. Quiz winners, spot prizes and raffles. It's going to be a great night out.
              </p>
            </div>
            <div className="quiz-info-card">
              <div className="quiz-info-card-icon">🃏</div>
              <div className="quiz-info-card-title">Joker &amp; The Thief</div>
              <p className="quiz-info-card-desc">
                Every team gets one free Joker to double a round's score. Buy power-ups on the night to gain the edge.
              </p>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* Power-ups section */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '0 40px 48px', textAlign: 'center' }}>
        <RevealOnScroll>
          <p className="section-label">Power-Ups</p>
          <p style={{ color: 'var(--white-50)', fontSize: '14px', lineHeight: '1.7', marginBottom: '24px' }}>
            Available for purchase on the night. Use them wisely — they can make or break your final score.
          </p>
          <div className="quiz-info-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="quiz-info-card">
              <div className="quiz-info-card-icon">💡</div>
              <div className="quiz-info-card-title">Buy a Hint</div>
              <p className="quiz-info-card-desc" style={{ marginBottom: '8px' }}>
                Stuck on a question? Buy a hint for $2 to nudge your team in the right direction.
              </p>
              <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '13px' }}>$2 per question</span>
            </div>
            <div className="quiz-info-card">
              <div className="quiz-info-card-icon">🃏</div>
              <div className="quiz-info-card-title">Extra Joker</div>
              <p className="quiz-info-card-desc" style={{ marginBottom: '8px' }}>
                Every team gets one free Joker that doubles your score for a round. Buy a second one for $10.
              </p>
              <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '13px' }}>$10</span>
            </div>
            <div className="quiz-info-card">
              <div className="quiz-info-card-icon">🦹</div>
              <div className="quiz-info-card-title">The Thief</div>
              <p className="quiz-info-card-desc" style={{ marginBottom: '8px' }}>
                Steal half of another team's points for a round. But if they play their Joker on that same round, they take YOUR points instead. High risk, high reward.
              </p>
              <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '13px' }}>$20</span>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* Booking form or sold out */}
      {isSoldOut ? (
        <section className="quiz-sold-out-section">
          <RevealOnScroll>
            <p className="section-label">Sold Out</p>
            <h2>Every seat is taken.</h2>
            <p>
              The quiz night is fully booked. Thank you to everyone who grabbed a spot. If you still want to support Nicole and Brain Tumour Support NZ, you can donate directly.
            </p>
            <div style={{ marginTop: '28px', display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="https://nogoingback.nz/nicole-white" target="_blank" rel="noopener noreferrer" className="btn-primary" onClick={() => trackQuizDonateClick('sold_out')}>Donate Now</a>
              <Link to="/documentary" className="btn-outline" onClick={() => trackQuizDocumentaryClick('sold_out')}>Watch the Documentary</Link>
            </div>
          </RevealOnScroll>
        </section>
      ) : (
        <section className="quiz-form-section">
          <RevealOnScroll>
            <p className="section-label">Book Your Team</p>
            <ScrollZoomFocus><h2 className="section-title">Grab your spot.</h2></ScrollZoomFocus>
            <p className="quiz-form-intro">
              Teams of 4 to 6. Add your team members below and we will send a confirmation to your email with everything you need, including a link to the documentary.
            </p>

            <form className="quiz-form" onSubmit={handleSubmit}>
              {/* Team name */}
              <div className="quiz-field">
                <label htmlFor="quiz-team-name">
                  Team Name
                  <span className="quiz-field-optional">optional</span>
                </label>
                <input
                  id="quiz-team-name"
                  type="text"
                  placeholder="The Brain Busters, etc."
                  maxLength={60}
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  onFocus={() => trackQuizFieldFocus('team_name')}
                />
                <div className="quiz-field-hint">Leave blank and you can decide on the night</div>
              </div>

              {/* Team members */}
              <div className="quiz-field">
                <label>Team Members</label>
                <div className="quiz-members-group">
                  {members.map((name, i) => (
                    <div className="quiz-member-row" key={i}>
                      <span className={`quiz-member-number ${i >= MIN_TEAM ? 'is-optional' : ''}`}>
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        placeholder={i === 0 ? 'Your name' : i < MIN_TEAM ? `Team member ${i + 1}` : `Team member ${i + 1} (optional)`}
                        maxLength={80}
                        value={name}
                        onChange={(e) => updateMember(i, e.target.value)}
                        onFocus={() => trackQuizFieldFocus('member_' + (i + 1))}
                        onBlur={(e) => { if (e.target.value.trim()) trackQuizMemberFilled(i + 1, members.filter(m => m.trim()).length) }}
                        required={i < MIN_TEAM}
                      />
                    </div>
                  ))}
                </div>
                <div className="quiz-field-hint">
                  Minimum {MIN_TEAM} people, maximum {MAX_TEAM}. Only fill in the spots you need.
                </div>
              </div>

              {/* Email */}
              <div className="quiz-field">
                <label htmlFor="quiz-email">Email Address</label>
                <input
                  id="quiz-email"
                  type="email"
                  placeholder="Where we'll send your confirmation"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => trackQuizFieldFocus('email')}
                  required
                />
                <div className="quiz-field-hint">You will receive a confirmation email with the event details and a link to the documentary</div>
              </div>

              {/* Cost summary */}
              {memberCount >= MIN_TEAM && (
                <div className="quiz-cost-summary">
                  <div className="quiz-cost-total">${totalCost}</div>
                  <div className="quiz-cost-breakdown">{memberCount} {memberCount === 1 ? 'person' : 'people'} × ${COST_PER_PERSON}</div>
                  <div className="quiz-cost-note">Paid on the night at the door (cash only)</div>
                </div>
              )}

              {/* Accessibility */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', color: 'rgba(245,243,236,0.7)', lineHeight: '1.5', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={lowTable}
                  onChange={(e) => setLowTable(e.target.checked)}
                  style={{ marginTop: '3px', accentColor: '#A88E5D', flexShrink: 0 }}
                />
                <span>We require a low table for wheelchair or accessibility needs</span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || teamTooSmall || isSoldOut}
                style={{ width: '100%', marginTop: '8px', position: 'relative' }}
              >
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <span className="quiz-spinner" />
                    Booking your spots...
                  </span>
                ) : `Book ${memberCount >= MIN_TEAM ? memberCount : ''} Spot${memberCount !== 1 ? 's' : ''}`}
              </button>

              {error && <p className="quiz-error">{error}</p>}
            </form>
          </RevealOnScroll>
        </section>
      )}

      {/* Bottom CTA */}
      <section style={{ textAlign: 'center', padding: '48px 40px 80px', borderTop: '1px solid var(--white-15)', maxWidth: 700, margin: '0 auto' }}>
        <RevealOnScroll>
          <p className="section-label">Before the Night</p>
          <p className="section-body" style={{ maxWidth: '100%', textAlign: 'center', marginBottom: '24px' }}>
            There's a full round dedicated to the documentary "A Bit of Vengeance - Nicole White - Her Story." All the answers are in the doco, so watch it before quiz night or you'll cost your team points. No excuses.
          </p>
          <Link to="/documentary" className="btn-outline" onClick={() => trackQuizDocumentaryClick('bottom_cta')}>Watch "A Bit of Vengeance"</Link>
        </RevealOnScroll>
      </section>

      {/* Success modal */}
      {success && (
        <div className="quiz-success-overlay" onClick={closeSuccess}>
          <div className="quiz-success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="quiz-success-icon">✓</div>
            <div className="quiz-success-title">You're in.</div>
            <p className="quiz-success-subtitle">
              A confirmation has been sent to <strong style={{ color: 'var(--gold)' }}>{success.email}</strong> with everything you need, including a link to the documentary. See you there.
            </p>
            <div className="quiz-success-details">
              <div className="quiz-success-detail-row">
                <span>Team</span>
                <span>{success.teamName || 'TBC on the night'}</span>
              </div>
              <div className="quiz-success-detail-row">
                <span>Members</span>
                <span>{success.memberCount} people</span>
              </div>
              <div className="quiz-success-detail-row">
                <span>Date</span>
                <span>Wednesday 7 October 2026</span>
              </div>
              <div className="quiz-success-detail-row">
                <span>Time</span>
                <span>6:00 PM</span>
              </div>
              <div className="quiz-success-detail-row">
                <span>Venue</span>
                <span>Monteith's Brewery, Greymouth</span>
              </div>
              <div className="quiz-success-detail-row">
                <span>Cost</span>
                <span>${success.totalCost} (cash on the night)</span>
              </div>
              {success.lowTable && (
                <div className="quiz-success-detail-row">
                  <span>Accessibility</span>
                  <span>Low table required</span>
                </div>
              )}
            </div>
            <button className="btn-primary" onClick={closeSuccess} style={{ position: 'relative', zIndex: 1 }}>Done</button>
          </div>
        </div>
      )}
    </PageTransition>
  )
}