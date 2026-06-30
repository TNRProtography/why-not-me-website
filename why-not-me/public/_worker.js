/*
 * ============================================================
 * WHY NOT ME - API WORKER
 * ============================================================
 * Handles:
 *   /api/raisely-progress  — live donation progress from Raisely
 *   /api/donate             — redirect to Raisely donation page
 *   /api/dedications (GET)  — list all claimed km dedications
 *   /api/dedications (POST) — claim a km (requires verified donation)
 *   /api/dedications/check-email (POST) — check donation credits for email
 *   /api/dedications/message (POST) — leave a support message (requires donation)
 *   /api/quiz-bookings (GET)       — quiz night capacity info
 *   /api/quiz-booking (POST)       — book a quiz night team
 *
 * KV binding:      DEDICATIONS
 * Secret:          RAISELY_API_KEY
 * Secret:          EMAIL_WORKER_SECRET (shared with quiz-wnm worker)
 * Asset binding:   ASSETS (static site)
 * ============================================================
 */

const RAISELY_API_BASE = 'https://api.raisely.com/v3'
const RAISELY_PROFILE_UUID = '5726f720-4406-11f1-b02c-c194de4f7b8f'
const RAISELY_PROFILE_PATH = 'nicole-white'
const RAISELY_CAMPAIGN_UUID = 'e6ecc870-bfd9-11ee-925d-ab85a9665c6e'
const RAISELY_DONATION_URL = 'https://nogoingback.nz/nicole-white'
const CACHE_TTL_SECONDS = 45
const DONATION_LIMIT = 100
const MAX_DONATIONS = 2000

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

/* Fetch the public profile. MUST succeed. Tries UUID, then path. */
async function getProfile() {
  try {
    const byUuid = await raiselyFetch(`/profiles/${encodeURIComponent(RAISELY_PROFILE_UUID)}`)
    return byUuid.data || byUuid
  } catch (uuidError) {
    const byPath = await raiselyFetch(`/profiles/${encodeURIComponent(RAISELY_PROFILE_PATH)}`)
    return byPath.data || byPath
  }
}

/* Fetch public donations. Best-effort: returns [] on any failure. */
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

async function handleProgress() {
  const profile = await getProfile() // required

  let donations = []
  try {
    donations = await getAllPublicDonations() // optional
  } catch {
    donations = []
  }

  return jsonResponse({
    profile: normaliseProfile(profile),
    donations: donations.map(normaliseDonation),
    updatedAt: new Date().toISOString(),
  })
}

/* Serve a static asset, falling back to index.html for SPA routes. */
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

// ── Dedications ──────────────────────────────────────────────

const LEGACY_DEDICATIONS_KEY = 'dedications_v1'
const DEDICATION_KEY_PREFIX = 'dedication_km_'
const DEDICATION_MESSAGES_KEY = 'dedication_messages_v1'
const TOTAL_KILOMETRES = 42

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

function dedicationKey(km) {
  return `${DEDICATION_KEY_PREFIX}${km}`
}

async function getDedications(env) {
  const dedications = {}

  await Promise.all(Array.from({ length: TOTAL_KILOMETRES }, async (_, index) => {
    const km = String(index + 1)
    const raw = await env.DEDICATIONS.get(dedicationKey(km))
    if (raw) dedications[km] = JSON.parse(raw)
  }))

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

async function handleGetDedications(env) {
  const dedications = await getDedications(env)
  const messages = await getDedicationMessages(env)

  // Strip emails before sending public response
  const publicDedications = {}
  for (const [k, v] of Object.entries(dedications)) {
    const { email: _, ...rest } = v
    publicDedications[k] = rest
  }

  const publicMessages = messages.map(({ email: _, ...rest }) => rest)

  return dedicationResponse({
    dedications: publicDedications,
    messages: publicMessages,
    totalKilometres: TOTAL_KILOMETRES,
    claimed: Object.keys(dedications).length,
    remaining: TOTAL_KILOMETRES - Object.keys(dedications).length,
  })
}

// ── Raisely Donation Verification & Counting ────────────────

async function verifyAndCountDonations(email, env) {
  if (!email) return { verified: false, donationCount: 0 }
  if (!env.RAISELY_API_KEY) {
    console.error('RAISELY_API_KEY secret is not set')
    return { verified: false, donationCount: 0, error: 'Donation verification is not configured.' }
  }

  const normalised = email.trim().toLowerCase()
  const allMatches = []
  let offset = 0
  const PAGE = 100

  // Paginate through all donations matching the email
  while (offset < MAX_DONATIONS) {
    const url = new URL(`${RAISELY_API_BASE}/donations`)
    url.searchParams.set('campaign', RAISELY_CAMPAIGN_UUID)
    url.searchParams.set('private', 'true')
    url.searchParams.set('q', normalised)
    url.searchParams.set('status', 'OK')
    url.searchParams.set('limit', String(PAGE))
    url.searchParams.set('offset', String(offset))

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${env.RAISELY_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      console.error(`Raisely verification failed: ${res.status} ${res.statusText}`)
      return { verified: false, donationCount: 0, error: 'Could not verify donation status.' }
    }

    const data = await res.json()
    const page = data.data || []
    if (page.length === 0) break

    // The q param is fuzzy — only count exact email matches
    for (const d of page) {
      if (d.email?.toLowerCase() === normalised) {
        allMatches.push(d)
      }
    }

    if (page.length < PAGE) break
    offset += PAGE
  }

  return {
    verified: allMatches.length > 0,
    donationCount: allMatches.length,
  }
}

// Count how many dedications + messages this email has already used
async function countUsedCredits(email, env) {
  const normalised = email.trim().toLowerCase()
  let used = 0

  // Count km dedications by this email
  await Promise.all(Array.from({ length: TOTAL_KILOMETRES }, async (_, index) => {
    const km = String(index + 1)
    const raw = await env.DEDICATIONS.get(dedicationKey(km))
    if (raw) {
      const dedication = JSON.parse(raw)
      if (dedication.email?.toLowerCase() === normalised) used++
    }
  }))

  // Also check legacy dedications
  const legacyRaw = await env.DEDICATIONS.get(LEGACY_DEDICATIONS_KEY)
  if (legacyRaw) {
    const legacy = JSON.parse(legacyRaw)
    for (const dedication of Object.values(legacy)) {
      if (dedication.email?.toLowerCase() === normalised) used++
    }
  }

  // Count messages by this email
  const messages = await getDedicationMessages(env)
  for (const msg of messages) {
    if (msg.email?.toLowerCase() === normalised) used++
  }

  return used
}

// ── Post Dedication (with verification) ──────────────────────

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
  const email = (body.email || '').trim().toLowerCase()
  const dedicatedTo = (body.dedicatedTo || '').trim().slice(0, 80)
  const message = (body.message || '').trim().slice(0, 150)

  if (!name) {
    return dedicationResponse({ error: 'Name is required.' }, 400)
  }
  if (!dedicatedTo) {
    return dedicationResponse({ error: 'Please say who this kilometre is for.' }, 400)
  }
  if (!email) {
    return dedicationResponse({ error: 'Please enter the email you donated with.' }, 400)
  }

  // ── Verify donation via Raisely & count donations ──
  const verification = await verifyAndCountDonations(email, env)

  if (verification.error) {
    return dedicationResponse({
      error: 'Unable to verify your donation right now. Please try again shortly.',
    }, 503)
  }

  if (!verification.verified) {
    return dedicationResponse({
      error: "We couldn't find a donation matching that email. Donate via No Going Back to dedicate a kilometre!",
      donateUrl: RAISELY_DONATION_URL,
    }, 403)
  }

  // ── Check remaining credits (1 donation = 1 dedication or message) ──
  const usedCredits = await countUsedCredits(email, env)
  const remaining = verification.donationCount - usedCredits

  if (remaining <= 0) {
    return dedicationResponse({
      error: `You've used all ${verification.donationCount} dedication${verification.donationCount === 1 ? '' : 's'} from your donation${verification.donationCount === 1 ? '' : 's'}. Donate again to dedicate another km!`,
      donateUrl: RAISELY_DONATION_URL,
    }, 403)
  }

  // ── Credits available — proceed with claiming ──
  const dedications = await getDedications(env)

  if (dedications[String(km)]) {
    return dedicationResponse({ error: 'This kilometre has already been claimed.' }, 409)
  }

  dedications[String(km)] = {
    name,
    dedicatedTo,
    message,
    email,
    createdAt: new Date().toISOString(),
  }

  await env.DEDICATIONS.put(dedicationKey(km), JSON.stringify(dedications[String(km)]))

  // Strip emails before sending response
  const publicDedications = {}
  for (const [k, v] of Object.entries(dedications)) {
    const { email: _, ...rest } = v
    publicDedications[k] = rest
  }

  return dedicationResponse({
    success: true,
    km,
    dedications: publicDedications,
    totalKilometres: TOTAL_KILOMETRES,
    claimed: Object.keys(dedications).length,
    remaining: TOTAL_KILOMETRES - Object.keys(dedications).length,
    creditsRemaining: remaining - 1,
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
  const email = (body.email || '').trim().toLowerCase()
  const dedicatedTo = (body.dedicatedTo || '').trim().slice(0, 80)
  const message = (body.message || '').trim().slice(0, 150)

  if (!name) {
    return dedicationResponse({ error: 'Name is required.' }, 400)
  }
  if (!email) {
    return dedicationResponse({ error: 'Please enter the email you donated with.' }, 400)
  }
  if (!dedicatedTo) {
    return dedicationResponse({ error: 'Please say who this message is for.' }, 400)
  }
  if (!message) {
    return dedicationResponse({ error: 'Please add a message.' }, 400)
  }

  // ── Verify donation via Raisely & count donations ──
  const verification = await verifyAndCountDonations(email, env)

  if (verification.error) {
    return dedicationResponse({
      error: 'Unable to verify your donation right now. Please try again shortly.',
    }, 503)
  }

  if (!verification.verified) {
    return dedicationResponse({
      error: "We couldn't find a donation matching that email. Donate via No Going Back to leave a message!",
      donateUrl: RAISELY_DONATION_URL,
    }, 403)
  }

  // ── Check remaining credits ──
  const usedCredits = await countUsedCredits(email, env)
  const remaining = verification.donationCount - usedCredits

  if (remaining <= 0) {
    return dedicationResponse({
      error: `You've used all ${verification.donationCount} dedication${verification.donationCount === 1 ? '' : 's'} from your donation${verification.donationCount === 1 ? '' : 's'}. Donate again to leave another message!`,
      donateUrl: RAISELY_DONATION_URL,
    }, 403)
  }

  const messages = await getDedicationMessages(env)
  const nextMessage = {
    id: crypto.randomUUID(),
    name,
    email,
    dedicatedTo,
    message,
    createdAt: new Date().toISOString(),
  }
  const nextMessages = [nextMessage, ...messages].slice(0, 200)

  await env.DEDICATIONS.put(DEDICATION_MESSAGES_KEY, JSON.stringify(nextMessages))

  // Strip emails from public response
  const publicMessages = nextMessages.map(({ email: _, ...rest }) => rest)

  return dedicationResponse({
    success: true,
    message: { ...nextMessage, email: undefined },
    messages: publicMessages,
    creditsRemaining: remaining - 1,
  })
}

// ── Check email credits ──────────────────────────────────────

async function handleCheckEmail(request, env) {
  let body
  try {
    body = await request.json()
  } catch {
    return dedicationResponse({ error: 'Invalid JSON.' }, 400)
  }

  const email = (body.email || '').trim().toLowerCase()
  if (!email) {
    return dedicationResponse({ error: 'Email is required.' }, 400)
  }

  const verification = await verifyAndCountDonations(email, env)

  if (verification.error) {
    return dedicationResponse({
      error: 'Unable to verify your donation right now. Please try again shortly.',
    }, 503)
  }

  if (!verification.verified) {
    return dedicationResponse({
      verified: false,
      donationCount: 0,
      usedCredits: 0,
      remainingCredits: 0,
    })
  }

  const usedCredits = await countUsedCredits(email, env)
  const remainingCredits = Math.max(0, verification.donationCount - usedCredits)

  return dedicationResponse({
    verified: true,
    donationCount: verification.donationCount,
    usedCredits,
    remainingCredits,
  })
}

// ── Quiz Night Bookings ──────────────────────────────────────
// Each booking is its own KV entry so you can browse and delete
// them individually in the Cloudflare dashboard.
// Key format:  quiz_TeamName_abc123  (or quiz_email_abc123 if no team name)
// Metadata:    { memberCount }  (used for quick capacity counting)

const QUIZ_KEY_PREFIX = 'quiz_'
const QUIZ_STATUS_KEY = 'quiz_status'
const QUIZ_MAX_CAPACITY = 120
const QUIZ_FINAL_THRESHOLD = 110
const QUIZ_MIN_TEAM = 4
const QUIZ_MAX_TEAM = 6

function quizKey(teamName, email, id) {
  const label = (teamName || email || 'team').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40)
  const short = id.split('-')[0]
  return `${QUIZ_KEY_PREFIX}${label}_${short}`
}

async function getQuizSpotsBooked(env) {
  let spotsBooked = 0
  let cursor = null

  do {
    const result = await env.DEDICATIONS.list({ prefix: QUIZ_KEY_PREFIX, cursor })
    for (const key of result.keys) {
      spotsBooked += key.metadata?.memberCount || 0
    }
    cursor = result.list_complete ? null : result.cursor
  } while (cursor)

  return spotsBooked
}

async function getQuizStatus(env) {
  const raw = await env.DEDICATIONS.get(QUIZ_STATUS_KEY)
  return raw || 'open'
}

async function handleGetQuizBookings(env) {
  const spotsBooked = await getQuizSpotsBooked(env)
  const status = await getQuizStatus(env)
  return dedicationResponse({ spotsBooked, status })
}

async function handlePostQuizBooking(request, env) {
  let body
  try {
    body = await request.json()
  } catch {
    return dedicationResponse({ error: 'Invalid request.' }, 400)
  }

  const teamName = (body.teamName || '').trim().slice(0, 60)
  const email = (body.email || '').trim().toLowerCase()
  const rawMembers = Array.isArray(body.members) ? body.members : []
  const members = rawMembers
    .map((m) => (typeof m === 'string' ? m.trim().slice(0, 80) : ''))
    .filter((m) => m !== '')

  if (!email || !email.includes('@')) {
    return dedicationResponse({ error: 'Please enter a valid email address.' }, 400)
  }
  if (members.length < QUIZ_MIN_TEAM) {
    return dedicationResponse({ error: `You need at least ${QUIZ_MIN_TEAM} team members.` }, 400)
  }
  if (members.length > QUIZ_MAX_TEAM) {
    return dedicationResponse({ error: `Maximum ${QUIZ_MAX_TEAM} team members allowed.` }, 400)
  }

  const status = await getQuizStatus(env)

  // If already sold out, reject
  if (status === 'sold_out') {
    return dedicationResponse({ error: 'Sorry, the quiz night is fully booked.' }, 409)
  }

  const spotsBooked = await getQuizSpotsBooked(env)

  // Hard cap safety check
  if (members.length > (QUIZ_MAX_CAPACITY - spotsBooked)) {
    return dedicationResponse({ error: 'Sorry, the quiz night is fully booked.' }, 409)
  }

  // If status is 'final', this is the last team allowed
  // After this booking, mark as sold out
  const willSellOut = status === 'final'

  const id = crypto.randomUUID()
  const booking = {
    id,
    teamName: teamName || null,
    members,
    email,
    memberCount: members.length,
    createdAt: new Date().toISOString(),
  }

  const key = quizKey(teamName, email, id)
  await env.DEDICATIONS.put(key, JSON.stringify(booking), {
    metadata: { memberCount: members.length },
  })

  const newSpotsBooked = spotsBooked + members.length

  // Update status based on new total
  if (willSellOut) {
    await env.DEDICATIONS.put(QUIZ_STATUS_KEY, 'sold_out')
  } else if (newSpotsBooked >= QUIZ_FINAL_THRESHOLD) {
    await env.DEDICATIONS.put(QUIZ_STATUS_KEY, 'final')
  }

  const newStatus = willSellOut ? 'sold_out' : (newSpotsBooked >= QUIZ_FINAL_THRESHOLD ? 'final' : 'open')

  // Send confirmation email (best-effort)
  try {
    await sendQuizConfirmationEmail(booking, env)
  } catch (emailError) {
    console.error('Quiz confirmation email failed:', emailError)
  }

  return dedicationResponse({
    success: true,
    booking: { ...booking, email: undefined },
    spotsBooked: newSpotsBooked,
    status: newStatus,
  })
}

const QUIZ_EMAIL_WORKER_URL = 'https://quiz-wnm.thenamesrock.workers.dev'

async function sendQuizConfirmationEmail(booking, env) {
  if (!env.EMAIL_WORKER_SECRET) {
    console.error('EMAIL_WORKER_SECRET not set, skipping confirmation email')
    return
  }

  const res = await fetch(QUIZ_EMAIL_WORKER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.EMAIL_WORKER_SECRET}`,
    },
    body: JSON.stringify({
      type: 'booking',
      id: booking.id,
      teamName: booking.teamName,
      members: booking.members,
      email: booking.email,
      memberCount: booking.memberCount,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Email worker error: ${res.status} ${errText}`)
  }
}

// ── Quiz Booking Cancellation ────────────────────────────────

function cancelPageHtml(booking, token, message) {
  const teamLabel = booking ? (booking.teamName || 'Your team') : ''
  const isConfirmed = !!message

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${isConfirmed ? 'Booking Cancelled' : 'Cancel Booking'} - Why Not Me?</title></head>
<body style="margin:0;padding:0;background:#0D0D0D;color:#F5F3EC;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:60px 20px;">
<table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;background:#151515;border:1px solid #2A2A2A;">
<tr><td style="padding:40px 32px;text-align:center;">
<p style="margin:0 0 24px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#A88E5D;">Quiz Night</p>
<h1 style="margin:0 0 16px;font-size:24px;font-family:Georgia,serif;color:#F5F3EC;">${isConfirmed ? 'Booking Cancelled' : 'Cancel Your Booking?'}</h1>
${isConfirmed
  ? '<p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#888;">' + message + '</p><a href="https://whynotme.co.nz/quiz-night" style="display:inline-block;padding:14px 32px;background:#A88E5D;color:#0D0D0D;text-decoration:none;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Back to Quiz Night</a>'
  : '<p style="margin:0 0 8px;font-size:14px;color:#888;">Team: <strong style="color:#F5F3EC;">' + teamLabel + '</strong></p><p style="margin:0 0 8px;font-size:14px;color:#888;">People: <strong style="color:#F5F3EC;">' + booking.memberCount + '</strong></p><p style="margin:0 0 24px;font-size:14px;color:#888;">Email: <strong style="color:#F5F3EC;">' + booking.email + '</strong></p><p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#666;">This will remove your booking and free up your spots. You will receive a confirmation email. This cannot be undone.</p><form method="POST" action="/api/quiz-booking/cancel?token=' + token + '"><button type="submit" style="padding:14px 32px;background:#d9534f;color:#fff;border:none;cursor:pointer;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Yes, Cancel My Booking</button></form><p style="margin:16px 0 0;font-size:12px;color:#555;"><a href="https://whynotme.co.nz/quiz-night" style="color:#A88E5D;text-decoration:underline;">No, keep my booking</a></p>'
}
</td></tr></table>
</td></tr></table></body></html>`
}

async function findBookingByToken(token, env) {
  let cursor = null
  do {
    const result = await env.DEDICATIONS.list({ prefix: QUIZ_KEY_PREFIX, cursor })
    for (const key of result.keys) {
      const raw = await env.DEDICATIONS.get(key.name)
      if (raw) {
        const booking = JSON.parse(raw)
        if (booking.id === token) return { key: key.name, booking }
      }
    }
    cursor = result.list_complete ? null : result.cursor
  } while (cursor)
  return null
}

async function handleCancelPage(url, env) {
  const token = url.searchParams.get('token')
  if (!token) {
    return new Response(cancelPageHtml(null, null, 'Invalid cancellation link.'), { status: 400, headers: { 'Content-Type': 'text/html' } })
  }

  const result = await findBookingByToken(token, env)
  if (!result) {
    return new Response(cancelPageHtml(null, null, 'This booking has already been cancelled or could not be found.'), { status: 404, headers: { 'Content-Type': 'text/html' } })
  }

  return new Response(cancelPageHtml(result.booking, token, null), { status: 200, headers: { 'Content-Type': 'text/html' } })
}

async function handleCancelBooking(request, url, env) {
  const token = url.searchParams.get('token')
  if (!token) {
    return new Response(cancelPageHtml(null, null, 'Invalid cancellation link.'), { status: 400, headers: { 'Content-Type': 'text/html' } })
  }

  const result = await findBookingByToken(token, env)
  if (!result) {
    return new Response(cancelPageHtml(null, null, 'This booking has already been cancelled or could not be found.'), { status: 404, headers: { 'Content-Type': 'text/html' } })
  }

  // Delete the booking from KV
  await env.DEDICATIONS.delete(result.key)

  // Recalculate spots and update status
  const spotsBooked = await getQuizSpotsBooked(env)
  if (spotsBooked < QUIZ_FINAL_THRESHOLD) {
    await env.DEDICATIONS.put(QUIZ_STATUS_KEY, 'open')
  } else {
    await env.DEDICATIONS.put(QUIZ_STATUS_KEY, 'final')
  }

  // Send cancellation confirmation email
  try {
    if (env.EMAIL_WORKER_SECRET) {
      await fetch(QUIZ_EMAIL_WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + env.EMAIL_WORKER_SECRET,
        },
        body: JSON.stringify({
          type: 'cancellation',
          teamName: result.booking.teamName,
          members: result.booking.members,
          email: result.booking.email,
          memberCount: result.booking.memberCount,
        }),
      })
    }
  } catch { /* best effort */ }

  const teamLabel = result.booking.teamName || 'Your team'
  return new Response(
    cancelPageHtml(null, null, 'Your booking for <strong style="color:#F5F3EC;">' + teamLabel + '</strong> (' + result.booking.memberCount + ' people) has been cancelled. A confirmation has been sent to <strong style="color:#A88E5D;">' + result.booking.email + '</strong>.'),
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )
}

// ── Main router ──────────────────────────────────────────────

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

    if (url.pathname === '/api/dedications/check-email' && request.method === 'POST') {
      try {
        return await handleCheckEmail(request, env)
      } catch (error) {
        return dedicationResponse({ error: 'Unable to check donation status.' }, 500)
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

    if (url.pathname === '/api/quiz-bookings' && request.method === 'GET') {
      try {
        return await handleGetQuizBookings(env)
      } catch (error) {
        return dedicationResponse({ error: 'Unable to load quiz bookings.' }, 500)
      }
    }

    if (url.pathname === '/api/quiz-booking' && request.method === 'POST') {
      try {
        return await handlePostQuizBooking(request, env)
      } catch (error) {
        return dedicationResponse({ error: 'Unable to process booking.' }, 500)
      }
    }

    if (url.pathname === '/api/quiz-booking/cancel') {
      try {
        if (request.method === 'GET') return await handleCancelPage(url, env)
        if (request.method === 'POST') return await handleCancelBooking(request, url, env)
      } catch (error) {
        return new Response('Something went wrong. Please try again.', { status: 500, headers: { 'Content-Type': 'text/plain' } })
      }
    }

    return handleAsset(request, env)
  },
}
