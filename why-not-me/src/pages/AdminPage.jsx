import { useState, useEffect } from 'react'
import './AdminPage.css'

export default function AdminPage() {
  const [token, setToken] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [config, setConfig] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  // Load config on auth
  useEffect(() => {
    if (!authed) return
    fetch('https://quiz-wnm.thenamesrock.workers.dev/config')
      .then((r) => r.json())
      .then((d) => {
        if (d.config) setConfig(d.config)
      })
      .catch(() => setToast({ ok: false, msg: 'Failed to load config.' }))
  }, [authed])

  const handleLogin = (e) => {
    e.preventDefault()
    if (!token.trim()) {
      setAuthError('Enter the admin secret.')
      return
    }
    // Test the token by making a POST with save_config (no changes)
    fetch('https://quiz-wnm.thenamesrock.workers.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type: 'save_config', config: {} }),
    })
      .then((r) => {
        if (r.status === 401) {
          setAuthError('Invalid secret.')
          return
        }
        return r.json()
      })
      .then((d) => {
        if (d?.config) {
          setConfig(d.config)
          setAuthed(true)
          setAuthError('')
        }
      })
      .catch(() => setAuthError('Connection failed.'))
  }

  const save = async (updates) => {
    setSaving(true)
    setToast(null)
    try {
      const res = await fetch('https://quiz-wnm.thenamesrock.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'save_config', config: updates }),
      })
      const d = await res.json()
      if (d.config) {
        setConfig(d.config)
        setToast({ ok: true, msg: 'Saved.' })
      } else {
        setToast({ ok: false, msg: d.error || 'Save failed.' })
      }
    } catch {
      setToast({ ok: false, msg: 'Network error.' })
    } finally {
      setSaving(false)
    }
  }

  const updateField = (section, key, value) => {
    setConfig((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }))
  }

  if (!authed) {
    return (
      <div className="admin-page">
        <div className="admin-login">
          <p className="admin-brand">Why Not Me?</p>
          <h1 className="admin-title">Site Admin</h1>
          <div className="admin-divider" />
          <form onSubmit={handleLogin}>
            <div className="admin-field">
              <label>Admin Secret</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter EMAIL_WORKER_SECRET"
                autoFocus
              />
            </div>
            {authError && <p className="admin-error">{authError}</p>}
            <button type="submit" className="admin-btn">Log In</button>
          </form>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="admin-page">
        <div className="admin-login">
          <p className="admin-brand">Loading...</p>
        </div>
      </div>
    )
  }

  const quiz = config.quiz || {}
  const tracker = config.tracker || {}
  const fd = config.furthestDistance || {}

  return (
    <div className="admin-page">
      <div className="admin-wrap">
        <div className="admin-header">
          <div>
            <p className="admin-brand">Why Not Me?</p>
            <h1 className="admin-title">Site Admin</h1>
          </div>
          <button className="admin-btn-ghost" onClick={() => { setAuthed(false); setToken('') }}>
            Log Out
          </button>
        </div>

        <div className="admin-divider" />

        {toast && (
          <div className={`admin-toast ${toast.ok ? 'ok' : 'err'}`}>
            {toast.ok ? '✓' : '✕'} {toast.msg}
          </div>
        )}

        {/* Coming Soon */}
        <div className="admin-card" style={config.comingSoon ? { borderColor: '#d9534f' } : {}}>
          <h2 className="admin-card-title">Coming Soon Mode</h2>
          <p className="admin-card-desc">
            When enabled, the entire website is replaced with a simple splash page showing only the logo
            and "Something is coming soon." No navigation, no content, no links. The admin page at /admin still works.
          </p>
          <div className="admin-row">
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={config.comingSoon || false}
                onChange={(e) => setConfig((prev) => ({ ...prev, comingSoon: e.target.checked }))}
              />
              <span>{config.comingSoon ? 'Site is hidden' : 'Site is live'}</span>
            </label>
          </div>
          <button
            className="admin-btn"
            disabled={saving}
            onClick={() => save({ comingSoon: config.comingSoon })}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Quiz Night */}
        <div className="admin-card">
          <h2 className="admin-card-title">Quiz Night</h2>
          <p className="admin-card-desc">
            Controls the quiz page, booking form, countdown timer, homepage CTA, and nav link.
            When disabled or outside the date range, all quiz content is hidden site-wide.
          </p>
          <div className="admin-row">
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={quiz.enabled || false}
                onChange={(e) => updateField('quiz', 'enabled', e.target.checked)}
              />
              <span>Enabled</span>
            </label>
          </div>
          <div className="admin-row-pair">
            <div className="admin-field">
              <label>Show From</label>
              <input
                type="datetime-local"
                value={quiz.startDate || ''}
                onChange={(e) => updateField('quiz', 'startDate', e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label>Show Until</label>
              <input
                type="datetime-local"
                value={quiz.endDate || ''}
                onChange={(e) => updateField('quiz', 'endDate', e.target.value)}
              />
            </div>
          </div>
          <button
            className="admin-btn"
            disabled={saving}
            onClick={() => save({ quiz: config.quiz })}
          >
            {saving ? 'Saving...' : 'Save Quiz Settings'}
          </button>
        </div>

        {/* Marathon Tracker */}
        <div className="admin-card">
          <h2 className="admin-card-title">Marathon Tracker</h2>
          <p className="admin-card-desc">
            Controls the live tracker page and nav link. When disabled or outside the date range,
            the tracker page and its nav link are hidden.
          </p>
          <div className="admin-row">
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={tracker.enabled || false}
                onChange={(e) => updateField('tracker', 'enabled', e.target.checked)}
              />
              <span>Enabled</span>
            </label>
          </div>
          <div className="admin-row-pair">
            <div className="admin-field">
              <label>Show From</label>
              <input
                type="datetime-local"
                value={tracker.startDate || ''}
                onChange={(e) => updateField('tracker', 'startDate', e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label>Show Until</label>
              <input
                type="datetime-local"
                value={tracker.endDate || ''}
                onChange={(e) => updateField('tracker', 'endDate', e.target.value)}
              />
            </div>
          </div>
          <button
            className="admin-btn"
            disabled={saving}
            onClick={() => save({ tracker: config.tracker })}
          >
            {saving ? 'Saving...' : 'Save Tracker Settings'}
          </button>
        </div>

        {/* Furthest Distance */}
        <div className="admin-card">
          <h2 className="admin-card-title">Training Progress</h2>
          <p className="admin-card-desc">
            The furthest distance stat and quote shown on the homepage marathon section.
          </p>
          <div className="admin-row-pair">
            <div className="admin-field">
              <label>Distance (km)</label>
              <input
                type="number"
                step="0.1"
                value={fd.km ?? ''}
                onChange={(e) => updateField('furthestDistance', 'km', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="admin-field">
              <label>Label</label>
              <input
                type="text"
                value={fd.label || ''}
                onChange={(e) => updateField('furthestDistance', 'label', e.target.value)}
                placeholder="e.g. Longest run so far"
              />
            </div>
          </div>
          <div className="admin-field">
            <label>Quote / Paragraph</label>
            <textarea
              rows={4}
              value={fd.quote || ''}
              onChange={(e) => updateField('furthestDistance', 'quote', e.target.value)}
              placeholder="Nicole's quote about her training progress"
            />
          </div>
          <button
            className="admin-btn"
            disabled={saving}
            onClick={() => save({ furthestDistance: config.furthestDistance })}
          >
            {saving ? 'Saving...' : 'Save Training Progress'}
          </button>
        </div>

        {/* Raisely Donation */}
        <div className="admin-card">
          <h2 className="admin-card-title">Add Donation</h2>
          <p className="admin-card-desc">
            Record an individual donation. This will be sent to the Raisely API so it appears
            in the donation tracker on the site.
          </p>
          <DonationForm token={token} onToast={setToast} />
        </div>
      </div>
    </div>
  )
}

function DonationForm({ token, onToast }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) {
      onToast({ ok: false, msg: 'Enter an amount.' })
      return
    }
    setSending(true)
    onToast(null)
    try {
      const res = await fetch('https://quiz-wnm.thenamesrock.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: 'add_donation',
          name: name.trim() || 'Anonymous',
          amount: parseFloat(amount),
          message: message.trim(),
        }),
      })
      const d = await res.json()
      if (d.success) {
        onToast({ ok: true, msg: `Donation of $${amount} recorded for ${name || 'Anonymous'}.` })
        setName('')
        setAmount('')
        setMessage('')
      } else {
        onToast({ ok: false, msg: d.error || 'Failed to record donation.' })
      }
    } catch {
      onToast({ ok: false, msg: 'Network error.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="admin-row-pair">
        <div className="admin-field">
          <label>Donor Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Anonymous"
          />
        </div>
        <div className="admin-field">
          <label>Amount ($)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="50.00"
            required
          />
        </div>
      </div>
      <div className="admin-field">
        <label>Message (optional)</label>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Go Nicole!"
        />
      </div>
      <button type="submit" className="admin-btn" disabled={sending}>
        {sending ? 'Recording...' : 'Record Donation'}
      </button>
    </form>
  )
}
