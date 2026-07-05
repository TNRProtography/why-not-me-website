import { useState, useEffect } from 'react'
import './AdminPage.css'

export default function AdminPage() {
  const [token, setToken] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [config, setConfig] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [donationsKey, setDonationsKey] = useState(0)

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

        {/* Donations & Sponsorships */}
        <div className="admin-card">
          <h2 className="admin-card-title">Donations & Sponsorships</h2>
          <p className="admin-card-desc">
            Manually add a donation or sponsorship. These appear alongside Raisely donations
            on the site. Each entry is stored separately in KV so you can delete individually.
          </p>
          <DonationForm token={token} onToast={setToast} onAdded={() => setDonationsKey((k) => k + 1)} />
          <div className="admin-divider" />
          <DonationList token={token} onToast={setToast} refreshKey={donationsKey} />
        </div>
      </div>
    </div>
  )
}

function DonationForm({ token, onToast, onAdded }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [kind, setKind] = useState('donation')
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
          kind,
        }),
      })
      const d = await res.json()
      if (d.success) {
        onToast({ ok: true, msg: `${kind === 'sponsorship' ? 'Sponsorship' : 'Donation'} of $${amount} recorded for ${name || 'Anonymous'}.` })
        setName('')
        setAmount('')
        setMessage('')
        if (onAdded) onAdded()
      } else {
        onToast({ ok: false, msg: d.error || 'Failed to record.' })
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
      <div className="admin-row-pair">
        <div className="admin-field">
          <label>Type</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', background: '#1A1A1A',
              border: '1px solid #2A2A2A', color: '#F5F3EC',
              fontFamily: 'Montserrat, Arial, Helvetica, sans-serif', fontSize: 14,
            }}
          >
            <option value="donation">Donation</option>
            <option value="sponsorship">Sponsorship</option>
          </select>
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
      </div>
      <button type="submit" className="admin-btn" disabled={sending}>
        {sending ? 'Recording...' : 'Add'}
      </button>
    </form>
  )
}

function DonationList({ token, onToast, refreshKey }) {
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch('https://quiz-wnm.thenamesrock.workers.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type: 'list_donations' }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.donations) setDonations(d.donations)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [token, refreshKey])

  const handleDelete = async (kvKey, name) => {
    if (!window.confirm(`Delete ${name}'s entry?`)) return
    setDeleting(kvKey)
    try {
      const res = await fetch('https://quiz-wnm.thenamesrock.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'delete_donation', kvKey }),
      })
      const d = await res.json()
      if (d.success) {
        setDonations((prev) => prev.filter((don) => don.kvKey !== kvKey))
        onToast({ ok: true, msg: `Deleted ${name}.` })
      } else {
        onToast({ ok: false, msg: d.error || 'Delete failed.' })
      }
    } catch {
      onToast({ ok: false, msg: 'Network error.' })
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <p style={{ color: '#555', fontSize: 13 }}>Loading entries...</p>
  if (!donations.length) return <p style={{ color: '#555', fontSize: 13 }}>No manual entries yet.</p>

  return (
    <div>
      <p style={{ fontSize: 12, color: '#A88E5D', letterSpacing: 1.5, textTransform: 'uppercase', margin: '0 0 12px' }}>
        Manual Entries ({donations.length})
      </p>
      {donations.map((d) => (
        <div key={d.kvKey} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#1A1A1A', border: '1px solid #2A2A2A', padding: '10px 14px',
          marginBottom: 6, fontSize: 13, fontFamily: 'Montserrat, Arial, Helvetica, sans-serif',
        }}>
          <div style={{ flex: 1 }}>
            <span style={{ color: '#F5F3EC', fontWeight: 600 }}>{d.name}</span>
            <span style={{
              display: 'inline-block', background: d.kind === 'sponsorship' ? '#3D3424' : '#1a2e1a',
              color: d.kind === 'sponsorship' ? '#A88E5D' : '#8fbc8f',
              padding: '2px 8px', fontSize: 10, fontWeight: 700, letterSpacing: 1,
              textTransform: 'uppercase', marginLeft: 8, borderRadius: 2,
            }}>
              {d.kind || 'donation'}
            </span>
            <span style={{ color: '#F5F3EC', fontWeight: 700, marginLeft: 12 }}>${d.amount}</span>
            {d.message && <span style={{ color: '#666', marginLeft: 8 }}>"{d.message}"</span>}
            <span style={{ color: '#444', marginLeft: 8, fontSize: 11 }}>
              {new Date(d.createdAt).toLocaleDateString()}
            </span>
          </div>
          <button
            onClick={() => handleDelete(d.kvKey, d.name)}
            disabled={deleting === d.kvKey}
            style={{
              background: 'none', border: '1px solid #5a2d2d', color: '#e08080',
              padding: '4px 12px', fontSize: 11, cursor: 'pointer', marginLeft: 12,
              fontFamily: 'Montserrat, Arial, Helvetica, sans-serif',
              opacity: deleting === d.kvKey ? 0.5 : 1,
            }}
          >
            {deleting === d.kvKey ? '...' : 'Delete'}
          </button>
        </div>
      ))}
    </div>
  )
}
