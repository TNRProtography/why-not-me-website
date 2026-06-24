/*
 * ============================================================
 * RAISELY LIVE DONATION PROGRESS + DEDICATION APPROVAL SYSTEM
 * ============================================================
 * This handler powers:
 *   /api/raisely-progress  - live fundraising numbers
 *   /api/dedications       - GET/POST km dedications
 *   /api/dedications/message - overflow messages
 *   /api/dedications/review  - approve/deny from email link
 *   /api/donate            - redirect to Raisely
 *
 * Dedication flow:
 *   1. User submits → saved as PENDING in KV
 *   2. Approval email sent via Cloudflare Email with last 5 donations
 *   3. Admin clicks Approve/Deny link in email
 *   4. Approved → visible on site. Denied → km released.
 *
 * Environment bindings required:
 *   ASSETS       - Cloudflare static assets
 *   DEDICATIONS  - KV namespace for dedications
 *   SEND_EMAIL   - Cloudflare send_email binding (Email Routing)
 *   APPROVAL_EMAIL - Destination email (vars in wrangler config)
 *   SENDER_EMAIL   - From address on your domain (vars in wrangler config)
 * ============================================================
 */

import { EmailMessage } from 'cloudflare:email'
import { createMimeMessage } from 'mimetext'

const RAISELY_API_BASE = 'https://api.raisely.com/v3'
const RAISELY_PROFILE_UUID = '5726f720-4406-11f1-b02c-c194de4f7b8f'
const RAISELY_PROFILE_PATH = 'nicole-white'
const RAISELY_CAMPAIGN_UUID = 'e6ecc870-bfd9-11ee-925d-ab85a9665c6e'
const RAISELY_DONATION_URL = 'https://nogoingback.nz/nicole-white'
const CACHE_TTL_SECONDS = 45
const DONATION_LIMIT = 100
const MAX_DONATIONS = 2000

const LEGACY_DEDICATIONS_KEY = 'dedications_v1'
const DEDICATION_KEY_PREFIX = 'dedication_km_'
const DEDICATION_MESSAGES_KEY = 'dedication_messages_v1'
const APPROVAL_TOKEN_PREFIX = 'approval_token_'
const TOTAL_KILOMETRES = 42

const STATUS_PENDING = 'pending'
const STATUS_APPROVED = 'approved'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type',
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
    },
  })
}

function dedicationResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  })
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}

function centsToCurrency(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return number / 100
}

function goalToCurrency(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return number > 100000 ? number / 100 : number
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '')
}

function truncate(value, maxLength = 220) {
  if (!value || typeof value !== 'string') return ''
  const clean = value.replace(/\s+/g, ' ').trim()
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 3)}...` : clean
}

function dedicationKey(km) {
  return `${DEDICATION_KEY_PREFIX}${km}`
}

function tokenKey(token) {
  return `${APPROVAL_TOKEN_PREFIX}${token}`
}

// ── Raisely helpers ─────────────────────────────────────────

async function raiselyFetch(path, params = {}) {
  const url = new URL(`${RAISELY_API_BASE}${path}`)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Raisely request failed (${response.status}) for ${path}`)
  }

  return response.json()
}

function resolveGoal(profile) {
  const rawGoal = firstValue(
    profile.goal,
    profile.donationGoal,
    profile.fundraisingGoal,
    profile.target,
    profile.public?.goal,
    profile.public?.donationGoal,
    profile.public?.fundraisingGoal,
  )

  if (rawGoal) return goalToCurrency(rawGoal)

  const total = Number(profile.total)
  const percent = Number(profile.totalPercent)
  if (Number.isFinite(total) && Number.isFinite(percent) && percent > 0) {
    return centsToCurrency(total / (percent / 100))
  }

  return 0
}

function normaliseProfile(profile) {
  const raised = centsToCurrency(firstValue(
    profile.total,
    profile.grandTotal,
    profile.campaignDisplayTotal,
    profile.campaignTotal,
    profile.selfDonationTotal,
  ))
  const goal = resolveGoal(profile)
  const percent = goal > 0 ? (raised / goal) * 100 : Number(profile.totalPercent) || 0

  return {
    id: profile.uuid || profile.path,
    name: (profile.name || profile.path || 'Why Not Me?').replace(/\s+/g, ' ').trim(),
    path: profile.path,
    raised,
    goal,
    percent,
    currency: profile.currency || profile.parent?.currency || 'NZD',
    donorCount: Number(firstValue(profile.uniqueDonors, profile.uniqueDonorCount, profile.donorCount)) || 0,
    donationCount: Number(profile.donationCount) || 0,
    allDonationCount: Number(profile.donationCount) || 0,
  }
}

function normaliseDonation(donation) {
  const publicData = donation.public || {}
  const name = firstValue(
    donation.displayName,
    donation.name,
    donation.preferredName,
    donation.user?.preferredName,
    donation.user?.displayName,
    [donation.firstName, donation.lastName].filter(Boolean).join(' '),
    publicData.name,
  )
  const message = firstValue(
    donation.message,
    donation.comment,
    donation.note,
    publicData.message,
    publicData.comment,
  )

  return {
    id: donation.uuid || `${donation.createdAt}-${donation.total}`,
    name: donation.anonymous ? 'Anonymous supporter' : (truncate(name, 80) || 'Anonymous supporter'),
    message: truncate(message),
    amount: centsToCurrency(firstValue(donation.total, donation.amount, donation.displayTotal)),
    currency: donation.currency || 'NZD',
    createdAt: donation.createdAt || donation.paidAt || donation.updatedAt,
  }
}

async function getProfile() {
  try {
    const byUuid = await raiselyFetch(`/profiles/${encodeURIComponent(RAISELY_PROFILE_UUID)}`)
    return byUuid.data || byUuid
  } catch (uuidError) {
    const byPath = await raiselyFetch(`/profiles/${encodeURIComponent(RAISELY_PROFILE_PATH)}`)
    return byPath.data || byPath
  }
}

async function getAllPublicDonations() {
  const donations = []
  let offset = 0

  const endpoints = [
    (params) => raiselyFetch(`/profiles/${encodeURIComponent(RAISELY_PROFILE_UUID)}/donations`, params),
    (params) => raiselyFetch('/donations', { ...params, profile: RAISELY_PROFILE_UUID }),
    (params) => raiselyFetch(`/campaigns/${encodeURIComponent(RAISELY_CAMPAIGN_UUID)}/donations`, { ...params, profile: RAISELY_PROFILE_UUID }),
  ]

  let chosen = null

  while (donations.length < MAX_DONATIONS) {
    const params = { limit: DONATION_LIMIT, offset }
    let page = null

    if (chosen) {
      try {
        const response = await chosen(params)
        page = response.data || []
      } catch {
        break
      }
    } else {
      for (const endpoint of endpoints) {
        try {
          const response = await endpoint(params)
          page = response.data || []
          chosen = endpoint
          break
        } catch {
          // try next candidate
        }
      }
      if (!chosen) break
    }

    if (!page || page.length === 0) break
    donations.push(...page)
    if (page.length < DONATION_LIMIT) break
    offset += DONATION_LIMIT
  }

  return donations.slice(0, MAX_DONATIONS)
}

/* Fetch just the 5 most recent donations for the approval email */
async function fetchRecentDonationsForEmail() {
  const endpoints = [
    (params) => raiselyFetch(`/profiles/${encodeURIComponent(RAISELY_PROFILE_UUID)}/donations`, params),
    (params) => raiselyFetch('/donations', { ...params, profile: RAISELY_PROFILE_UUID }),
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await endpoint({ limit: 5, offset: 0 })
      return (response.data || []).map(normaliseDonation)
    } catch {
      // try next
    }
  }
  return []
}

async function handleProgress() {
  const profile = await getProfile()

  let donations = []
  try {
    donations = await getAllPublicDonations()
  } catch {
    donations = []
  }

  return jsonResponse({
    profile: normaliseProfile(profile),
    donations: donations.map(normaliseDonation),
    updatedAt: new Date().toISOString(),
  })
}

// ── Dedication helpers ──────────────────────────────────────

async function getDedications(env) {
  const dedications = {}

  await Promise.all(Array.from({ length: TOTAL_KILOMETRES }, async (_, index) => {
    const km = String(index + 1)
    const raw = await env.DEDICATIONS.get(dedicationKey(km))
    if (raw) dedications[km] = JSON.parse(raw)
  }))

  // Backwards compatibility for data written before per-km KV entries
  const legacyRaw = await env.DEDICATIONS.get(LEGACY_DEDICATIONS_KEY)
  if (legacyRaw) {
    const legacyDedications = JSON.parse(legacyRaw)
    for (const [km, dedication] of Object.entries(legacyDedications)) {
      if (!dedications[km]) dedications[km] = dedication
    }
  }

  return dedications
}

async function getDedicationMessages(env) {
  const raw = await env.DEDICATIONS.get(DEDICATION_MESSAGES_KEY)
  if (!raw) return []
  const messages = JSON.parse(raw)
  return Array.isArray(messages) ? messages : []
}

/*
 * Sanitise dedications for public consumption.
 * - Approved (or legacy without status) → full details
 * - Pending → only expose status and km, hide message content
 */
function sanitiseDedicationsForPublic(dedications) {
  const result = {}
  for (const [km, ded] of Object.entries(dedications)) {
    const status = ded.status || STATUS_APPROVED // legacy compat
    if (status === STATUS_APPROVED) {
      result[km] = { ...ded, status: STATUS_APPROVED }
    } else if (status === STATUS_PENDING) {
      result[km] = { status: STATUS_PENDING, createdAt: ded.createdAt }
    }
  }
  return result
}

async function handleGetDedications(env) {
  const dedications = await getDedications(env)
  const messages = await getDedicationMessages(env)
  const publicDedications = sanitiseDedicationsForPublic(dedications)
  const approvedCount = Object.values(dedications).filter(d => (d.status || STATUS_APPROVED) === STATUS_APPROVED).length
  const pendingCount = Object.values(dedications).filter(d => d.status === STATUS_PENDING).length

  return dedicationResponse({
    dedications: publicDedications,
    messages,
    totalKilometres: TOTAL_KILOMETRES,
    claimed: approvedCount,
    pending: pendingCount,
    remaining: TOTAL_KILOMETRES - approvedCount - pendingCount,
  })
}

async function handlePostDedication(request, env) {
  let body
  try {
    body = await request.json()
  } catch {
    return dedicationResponse({ error: 'Invalid JSON.' }, 400)
  }

  const km = Number(body.km)
  if (!Number.isInteger(km) || km < 1 || km > TOTAL_KILOMETRES) {
    return dedicationResponse({ error: 'Invalid kilometre number.' }, 400)
  }

  const name = (body.name || '').trim().slice(0, 80)
  const dedicatedTo = (body.dedicatedTo || '').trim().slice(0, 80)
  const message = (body.message || '').trim().slice(0, 150)

  if (!name) {
    return dedicationResponse({ error: 'Name is required.' }, 400)
  }
  if (!dedicatedTo) {
    return dedicationResponse({ error: 'Please say who this kilometre is for.' }, 400)
  }

  const dedications = await getDedications(env)

  if (dedications[String(km)]) {
    return dedicationResponse({ error: 'This kilometre has already been claimed.' }, 409)
  }

  const approvalToken = crypto.randomUUID()

  const dedication = {
    name,
    dedicatedTo,
    message,
    status: STATUS_PENDING,
    token: approvalToken,
    createdAt: new Date().toISOString(),
  }

  dedications[String(km)] = dedication

  // Save dedication to KV
  await env.DEDICATIONS.put(dedicationKey(km), JSON.stringify(dedication))
  // Save token → km mapping for quick lookup
  await env.DEDICATIONS.put(tokenKey(approvalToken), String(km))

  // Send approval email (best-effort, don't block on failure)
  const siteUrl = new URL(request.url).origin
  try {
    const recentDonations = await fetchRecentDonationsForEmail()
    await sendApprovalEmail(dedication, km, recentDonations, siteUrl, env)
  } catch (emailError) {
    // Email failed but dedication is saved as pending
    console.error('Approval email failed:', emailError)
  }

  return dedicationResponse({
    success: true,
    km,
    status: STATUS_PENDING,
    dedications: sanitiseDedicationsForPublic(dedications),
    totalKilometres: TOTAL_KILOMETRES,
    claimed: Object.values(dedications).filter(d => (d.status || STATUS_APPROVED) === STATUS_APPROVED).length,
    pending: Object.values(dedications).filter(d => d.status === STATUS_PENDING).length,
    remaining: TOTAL_KILOMETRES - Object.keys(dedications).length,
  })
}

async function handlePostDedicationMessage(request, env) {
  let body
  try {
    body = await request.json()
  } catch {
    return dedicationResponse({ error: 'Invalid JSON.' }, 400)
  }

  const name = (body.name || '').trim().slice(0, 80)
  const dedicatedTo = (body.dedicatedTo || '').trim().slice(0, 80)
  const message = (body.message || '').trim().slice(0, 150)

  if (!name) {
    return dedicationResponse({ error: 'Name is required.' }, 400)
  }
  if (!dedicatedTo) {
    return dedicationResponse({ error: 'Please say who this message is for.' }, 400)
  }
  if (!message) {
    return dedicationResponse({ error: 'Please add a message.' }, 400)
  }

  const messages = await getDedicationMessages(env)
  const nextMessage = {
    id: crypto.randomUUID(),
    name,
    dedicatedTo,
    message,
    createdAt: new Date().toISOString(),
  }
  const nextMessages = [nextMessage, ...messages].slice(0, 200)

  await env.DEDICATIONS.put(DEDICATION_MESSAGES_KEY, JSON.stringify(nextMessages))

  return dedicationResponse({
    success: true,
    message: nextMessage,
    messages: nextMessages,
  })
}

// ── Review (approve / deny) ─────────────────────────────────

async function handleReview(request, env) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  const action = url.searchParams.get('action')

  if (!token || !['approve', 'deny'].includes(action)) {
    return htmlResponse(generateReviewPageHtml('error', null, null, 'Invalid review link.'), 400)
  }

  // Look up which km this token belongs to
  const kmStr = await env.DEDICATIONS.get(tokenKey(token))
  if (!kmStr) {
    return htmlResponse(generateReviewPageHtml('error', null, null, 'This review link has already been used or has expired.'), 404)
  }

  const km = Number(kmStr)
  const raw = await env.DEDICATIONS.get(dedicationKey(km))
  if (!raw) {
    await env.DEDICATIONS.delete(tokenKey(token))
    return htmlResponse(generateReviewPageHtml('error', null, null, 'Dedication not found. It may have already been reviewed.'), 404)
  }

  const dedication = JSON.parse(raw)

  // Check token matches
  if (dedication.token !== token) {
    return htmlResponse(generateReviewPageHtml('error', null, null, 'Token mismatch. This link may be outdated.'), 403)
  }

  // Already approved?
  if (dedication.status === STATUS_APPROVED && action === 'approve') {
    return htmlResponse(generateReviewPageHtml('already-approved', km, dedication))
  }

  if (action === 'approve') {
    dedication.status = STATUS_APPROVED
    await env.DEDICATIONS.put(dedicationKey(km), JSON.stringify(dedication))
    await env.DEDICATIONS.delete(tokenKey(token))
    return htmlResponse(generateReviewPageHtml('approved', km, dedication))
  }

  if (action === 'deny') {
    // Delete the dedication → releases the km
    await env.DEDICATIONS.delete(dedicationKey(km))
    await env.DEDICATIONS.delete(tokenKey(token))
    return htmlResponse(generateReviewPageHtml('denied', km, dedication))
  }
}

// ── Email sending via Cloudflare Email Routing ──────────────

async function sendApprovalEmail(dedication, km, recentDonations, siteUrl, env) {
  if (!env.SEND_EMAIL) {
    console.log('SEND_EMAIL binding not configured. Skipping approval email.')
    return
  }

  const toEmail = env.APPROVAL_EMAIL
  const fromEmail = env.SENDER_EMAIL || 'noreply@whynotme.co.nz'
  if (!toEmail) {
    console.log('APPROVAL_EMAIL not set. Skipping approval email.')
    return
  }

  const approveUrl = `${siteUrl}/api/dedications/review?token=${dedication.token}&action=approve`
  const denyUrl = `${siteUrl}/api/dedications/review?token=${dedication.token}&action=deny`

  const donationRows = recentDonations.length > 0
    ? recentDonations.map(d => {
        const amount = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: d.currency || 'NZD', maximumFractionDigits: 0 }).format(d.amount)
        const date = d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) : 'Recent'
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;color:#ccc;font-size:14px;">${escapeHtml(d.name)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;color:#A88E5D;font-size:14px;font-weight:600;">${amount}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;color:#888;font-size:13px;">${date}</td>
        </tr>`
      }).join('')
    : `<tr><td colspan="3" style="padding:12px;color:#666;text-align:center;">No recent public donations found.</td></tr>`

  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">

    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#A88E5D;">New Dedication Request</div>
      <div style="font-size:36px;font-weight:300;color:#F5F3EC;margin-top:8px;">Km ${km}</div>
    </div>

    <div style="background:#151515;border:1px solid #2a2a2a;padding:28px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;width:100px;">From</td>
          <td style="padding:6px 0;color:#F5F3EC;font-size:15px;font-weight:600;">${escapeHtml(dedication.name)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">For</td>
          <td style="padding:6px 0;color:#F5F3EC;font-size:15px;font-weight:600;">${escapeHtml(dedication.dedicatedTo)}</td>
        </tr>
        ${dedication.message ? `<tr>
          <td style="padding:6px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;vertical-align:top;">Message</td>
          <td style="padding:6px 0;color:#ccc;font-size:14px;font-style:italic;line-height:1.6;">"${escapeHtml(dedication.message)}"</td>
        </tr>` : ''}
      </table>
    </div>

    <div style="text-align:center;margin-bottom:32px;">
      <a href="${approveUrl}" style="display:inline-block;background:#A88E5D;color:#0D0D0D;padding:14px 36px;font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;margin:0 8px 12px;">✓ Approve</a>
      <a href="${denyUrl}" style="display:inline-block;background:transparent;border:1px solid #666;color:#ccc;padding:14px 36px;font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;margin:0 8px 12px;">✗ Deny</a>
    </div>

    <div style="margin-bottom:12px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#A88E5D;margin-bottom:14px;">Last 5 Raisely Donations</div>
      <table style="width:100%;border-collapse:collapse;background:#151515;border:1px solid #2a2a2a;">
        <tr>
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #333;">Name</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #333;">Amount</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #333;">Date</th>
        </tr>
        ${donationRows}
      </table>
      <div style="margin-top:8px;font-size:12px;color:#555;">Cross-reference the dedicator's name against recent donors above.</div>
    </div>

    <div style="text-align:center;margin-top:32px;padding-top:20px;border-top:1px solid #2a2a2a;">
      <div style="font-size:11px;color:#555;">Why Not Me? &middot; whynotme.co.nz</div>
    </div>
  </div>
</body>
</html>`

  const subject = `Km ${km} dedication from ${dedication.name} for ${dedication.dedicatedTo}`

  const msg = createMimeMessage()
  msg.setSender({ name: 'Why Not Me', addr: fromEmail })
  msg.setRecipient(toEmail)
  msg.setSubject(subject)
  msg.addMessage({ contentType: 'text/html', data: emailHtml })

  const emailMessage = new EmailMessage(fromEmail, toEmail, msg.asRaw())
  await env.SEND_EMAIL.send(emailMessage)
}

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Review confirmation page ────────────────────────────────

function generateReviewPageHtml(action, km, dedication, errorMessage = '') {
  const titles = {
    'approved': 'Dedication Approved',
    'denied': 'Dedication Denied',
    'already-approved': 'Already Approved',
    'error': 'Review Error',
  }
  const icons = {
    'approved': '✓',
    'denied': '✗',
    'already-approved': '✓',
    'error': '!',
  }
  const colors = {
    'approved': '#A88E5D',
    'denied': '#888',
    'already-approved': '#A88E5D',
    'error': '#d9534f',
  }
  const messages = {
    'approved': `Km ${km} is now live on the site. Dedicated to <strong>${escapeHtml(dedication?.dedicatedTo)}</strong> by <strong>${escapeHtml(dedication?.name)}</strong>.`,
    'denied': `Km ${km} has been released and is available for someone else. The dedication from <strong>${escapeHtml(dedication?.name)}</strong> for <strong>${escapeHtml(dedication?.dedicatedTo)}</strong> has been removed.`,
    'already-approved': `Km ${km} was already approved. Dedicated to <strong>${escapeHtml(dedication?.dedicatedTo)}</strong> by <strong>${escapeHtml(dedication?.name)}</strong>.`,
    'error': escapeHtml(errorMessage),
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titles[action]} - Why Not Me?</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0D0D0D; color: #F5F3EC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { max-width: 480px; width: 100%; text-align: center; background: #151515; border: 1px solid #2a2a2a; padding: 60px 40px; }
    .icon { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 32px; font-weight: 800; color: #0D0D0D; background: ${colors[action]}; }
    h1 { font-size: 28px; font-weight: 300; margin-bottom: 16px; }
    p { font-size: 15px; color: #999; line-height: 1.7; }
    p strong { color: #F5F3EC; }
    .link { display: inline-block; margin-top: 28px; color: #A88E5D; text-decoration: none; font-size: 13px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
    .link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icons[action]}</div>
    <h1>${titles[action]}</h1>
    <p>${messages[action]}</p>
    <a href="/dedicate" class="link">View Dedications →</a>
  </div>
</body>
</html>`
}

// ── Static asset serving ────────────────────────────────────

async function handleAsset(request, env) {
  const assetResponse = await env.ASSETS.fetch(request)

  if (
    assetResponse.status === 404 &&
    request.method === 'GET' &&
    (request.headers.get('Accept') || '').includes('text/html')
  ) {
    const indexUrl = new URL(request.url)
    indexUrl.pathname = '/index.html'
    return env.ASSETS.fetch(new Request(indexUrl.toString(), { headers: request.headers }))
  }

  return assetResponse
}

// ── Main router ─────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    if (url.pathname === '/api/raisely-progress') {
      try {
        return await handleProgress()
      } catch (error) {
        return jsonResponse({ error: 'Unable to load Raisely donation progress right now.' }, 502)
      }
    }

    if (url.pathname === '/api/donate') {
      return Response.redirect(RAISELY_DONATION_URL, 302)
    }

    if (url.pathname === '/api/dedications/review' && request.method === 'GET') {
      try {
        return await handleReview(request, env)
      } catch (error) {
        return htmlResponse(generateReviewPageHtml('error', null, null, 'Something went wrong processing this review.'), 500)
      }
    }

    if (url.pathname === '/api/dedications/message' && request.method === 'POST') {
      try {
        return await handlePostDedicationMessage(request, env)
      } catch (error) {
        return dedicationResponse({ error: 'Unable to save message.' }, 500)
      }
    }

    if (url.pathname === '/api/dedications') {
      if (request.method === 'GET') {
        try {
          return await handleGetDedications(env)
        } catch (error) {
          return dedicationResponse({ error: 'Unable to load dedications.' }, 500)
        }
      }
      if (request.method === 'POST') {
        try {
          return await handlePostDedication(request, env)
        } catch (error) {
          return dedicationResponse({ error: 'Unable to save dedication.' }, 500)
        }
      }
    }

    return handleAsset(request, env)
  },
}