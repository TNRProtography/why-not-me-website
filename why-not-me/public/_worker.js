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

// ── Quiz Booking Management ──────────────────────────────────

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

async function notifyEmailWorker(type, booking, env) {
  if (!env.EMAIL_WORKER_SECRET) return
  try {
    await fetch(QUIZ_EMAIL_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.EMAIL_WORKER_SECRET },
      body: JSON.stringify({ type, id: booking.id, teamName: booking.teamName, members: booking.members, email: booking.email, memberCount: booking.memberCount }),
    })
  } catch { /* best effort */ }
}

function managePage(booking, token, flash) {
  const teamLabel = booking ? (booking.teamName || 'No team name') : ''
  const totalCost = booking ? booking.memberCount * 10 : 0

  const memberRows = booking ? booking.members.map(function(m, i) {
    return '<div class="member-row" data-index="' + i + '">' +
      '<span class="member-num">' + (i + 1) + '</span>' +
      '<span class="member-name" id="name-display-' + i + '">' + m + '</span>' +
      '<input type="text" class="member-input" id="name-input-' + i + '" value="' + m.replace(/"/g, '&quot;') + '" maxlength="80" style="display:none" />' +
      '<button class="btn-edit" onclick="editName(' + i + ')" id="btn-edit-' + i + '">Edit</button>' +
      '<button class="btn-save-name" onclick="saveName(' + i + ')" id="btn-save-' + i + '" style="display:none">Save</button>' +
      (booking.members.length > QUIZ_MIN_TEAM ? '<button class="btn-remove" onclick="removeMember(' + i + ')">Remove</button>' : '') +
      '</div>'
  }).join('') : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Manage Booking - Why Not Me?</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0D0D0D;color:#F5F3EC;font-family:Arial,Helvetica,sans-serif;min-height:100vh}
.wrap{max-width:560px;margin:0 auto;padding:40px 20px 60px}
.logo{text-align:center;margin-bottom:32px}
.logo img{height:50px}
.card{background:#151515;border:1px solid #2A2A2A;padding:32px 28px;margin-bottom:20px}
.label{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#A88E5D;margin-bottom:6px}
h1{font-size:24px;font-family:Georgia,serif;margin-bottom:20px;text-align:center}
.flash{padding:14px 20px;margin-bottom:20px;text-align:center;font-size:14px;line-height:1.5}
.flash-success{background:#1a2e1a;border:1px solid #2d4a2d;color:#7bc67b}
.flash-error{background:#2e1a1a;border:1px solid #4a2d2d;color:#d9534f}
.detail-grid{display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:14px;margin-bottom:20px}
.detail-label{color:#A88E5D}
.detail-value{color:#F5F3EC;text-align:right}
.detail-value.bold{font-weight:700}
.divider{border-top:1px solid #2A2A2A;margin:20px 0}
.member-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #1f1f1f}
.member-row:last-child{border-bottom:none}
.member-num{width:24px;font-size:13px;font-weight:700;color:#A88E5D;flex-shrink:0}
.member-name{flex:1;font-size:14px}
.member-input{flex:1;background:#0D0D0D;border:1px solid #A88E5D;color:#F5F3EC;font-family:inherit;font-size:14px;padding:8px 12px}
.btn-edit,.btn-save-name,.btn-remove{font-size:11px;letter-spacing:1px;text-transform:uppercase;border:none;cursor:pointer;padding:6px 12px;font-family:inherit;font-weight:600}
.btn-edit{background:transparent;color:#A88E5D;border:1px solid #3D3424}
.btn-save-name{background:#A88E5D;color:#0D0D0D}
.btn-remove{background:transparent;color:#888;border:1px solid #333}
.btn-remove:hover{color:#d9534f;border-color:#d9534f}
.event-details{background:#1A1A1A;border:1px solid #3D3424;padding:20px;margin-bottom:20px}
.section-title{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#A88E5D;margin-bottom:12px}
.btn-primary{display:block;width:100%;padding:16px;background:#A88E5D;color:#0D0D0D;border:none;cursor:pointer;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;font-family:inherit;text-align:center;text-decoration:none;margin-bottom:12px}
.btn-cancel{display:block;width:100%;padding:16px;background:transparent;color:#d9534f;border:2px solid #d9534f;cursor:pointer;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;font-family:inherit;text-align:center}
.btn-cancel:hover{background:#d9534f;color:#fff}
.cancel-confirm{display:none;background:#1a1010;border:1px solid #4a2d2d;padding:20px;margin-top:12px;text-align:center}
.cancel-confirm p{font-size:14px;color:#ccc;line-height:1.6;margin-bottom:16px}
.back-link{display:block;text-align:center;margin-top:16px;font-size:13px;color:#A88E5D;text-decoration:underline}
.footer{text-align:center;margin-top:32px;font-size:12px;color:#555}
.footer a{color:#A88E5D;text-decoration:underline}
</style>
</head>
<body>
<div class="wrap">
  <div class="logo"><a href="https://whynotme.co.nz"><img src="https://whynotme.co.nz/images/logos/logo-white-transparent.png" alt="Why Not Me?" /></a></div>

  <h1>Manage Your Booking</h1>

  ${flash ? '<div class="flash ' + (flash.type === 'error' ? 'flash-error' : 'flash-success') + '">' + flash.message + '</div>' : ''}

  ${booking ? `
  <div class="card">
    <div class="event-details">
      <div class="detail-grid">
        <span class="detail-label">Event</span><span class="detail-value">Quiz Night Fundraiser</span>
        <span class="detail-label">Date</span><span class="detail-value">Wednesday 7 October 2026</span>
        <span class="detail-label">Time</span><span class="detail-value">6:00 PM</span>
        <span class="detail-label">Venue</span><span class="detail-value">Monteith's Brewery, Greymouth</span>
      </div>
    </div>

    <div class="detail-grid">
      <span class="detail-label">Team</span><span class="detail-value">${teamLabel}</span>
      <span class="detail-label">Email</span><span class="detail-value">${booking.email}</span>
      <span class="detail-label">People</span><span class="detail-value">${booking.memberCount}</span>
      <span class="detail-label bold">Total Cost</span><span class="detail-value bold">$${totalCost}</span>
    </div>
    <p style="font-size:12px;color:#666;margin-top:-12px">Paid at the door on the night (cash or card)</p>
  </div>

  <div class="card">
    <p class="section-title">Team Members</p>
    <p style="font-size:12px;color:#666;margin-bottom:16px">Edit names if someone has changed, or remove a member who can no longer make it (minimum 4 required).</p>
    <div id="members-list">
      ${memberRows}
    </div>
  </div>

  <div class="card" style="text-align:center">
    <p class="section-title">Cancel Booking</p>
    <p style="font-size:13px;color:#888;line-height:1.6;margin-bottom:16px">If your whole team can no longer make it, you can cancel your booking below. Your spots will be released for others.</p>
    <button class="btn-cancel" onclick="showCancelConfirm()">Cancel Entire Booking</button>
    <div class="cancel-confirm" id="cancel-confirm">
      <p>Are you sure? This will cancel the booking for all ${booking.memberCount} team members and cannot be undone.</p>
      <form method="POST" action="/api/quiz-booking/cancel?token=${token}">
        <button type="submit" class="btn-cancel" style="background:#d9534f;color:#fff;border-color:#d9534f;margin-bottom:8px">Yes, Cancel My Booking</button>
      </form>
      <button onclick="hideCancelConfirm()" style="background:none;border:none;color:#A88E5D;cursor:pointer;font-size:13px;text-decoration:underline;font-family:inherit">No, keep my booking</button>
    </div>
  </div>

  <a href="https://whynotme.co.nz/quiz-night" class="back-link">Back to Quiz Night</a>
  ` : ''}

  <div class="footer"><a href="https://whynotme.co.nz">whynotme.co.nz</a></div>
</div>

<script>
function editName(i) {
  document.getElementById('name-display-'+i).style.display='none';
  document.getElementById('name-input-'+i).style.display='';
  document.getElementById('btn-edit-'+i).style.display='none';
  document.getElementById('btn-save-'+i).style.display='';
  document.getElementById('name-input-'+i).focus();
}

function saveName(i) {
  var input = document.getElementById('name-input-'+i);
  var val = input.value.trim();
  if (!val) { alert('Name cannot be empty.'); return; }
  var form = document.createElement('form');
  form.method = 'POST';
  form.action = '/api/quiz-booking/modify?token=${token || ''}';
  var hi = document.createElement('input'); hi.type='hidden'; hi.name='index'; hi.value=i;
  var hn = document.createElement('input'); hn.type='hidden'; hn.name='newName'; hn.value=val;
  var ha = document.createElement('input'); ha.type='hidden'; ha.name='action'; ha.value='rename';
  form.appendChild(hi); form.appendChild(hn); form.appendChild(ha);
  document.body.appendChild(form);
  form.submit();
}

function removeMember(i) {
  if (!confirm('Remove this team member?')) return;
  var form = document.createElement('form');
  form.method = 'POST';
  form.action = '/api/quiz-booking/modify?token=${token || ''}';
  var hi = document.createElement('input'); hi.type='hidden'; hi.name='index'; hi.value=i;
  var ha = document.createElement('input'); ha.type='hidden'; ha.name='action'; ha.value='remove';
  form.appendChild(hi); form.appendChild(ha);
  document.body.appendChild(form);
  form.submit();
}

function showCancelConfirm() { document.getElementById('cancel-confirm').style.display='block'; }
function hideCancelConfirm() { document.getElementById('cancel-confirm').style.display='none'; }
</script>
</body>
</html>`
}

function resultPage(title, message) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title} - Why Not Me?</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0D0D0D;color:#F5F3EC;font-family:Arial,Helvetica,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}.card{max-width:520px;width:100%;margin:40px 20px;background:#151515;border:1px solid #2A2A2A;padding:40px 32px;text-align:center}.logo{margin-bottom:24px}.logo img{height:50px}h1{font-size:24px;font-family:Georgia,serif;margin-bottom:16px}.msg{font-size:14px;line-height:1.7;color:#888;margin-bottom:28px}.btn{display:inline-block;padding:14px 32px;background:#A88E5D;color:#0D0D0D;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase}</style></head>
<body><div class="card">
<div class="logo"><a href="https://whynotme.co.nz"><img src="https://whynotme.co.nz/images/logos/logo-white-transparent.png" alt="Why Not Me?" /></a></div>
<h1>${title}</h1>
<p class="msg">${message}</p>
<a href="https://whynotme.co.nz/quiz-night" class="btn">Back to Quiz Night</a>
</div></body></html>`
}

async function handleManagePage(url, env) {
  const token = url.searchParams.get('token')
  if (!token) return new Response(resultPage('Invalid Link', 'This link is not valid. Check your confirmation email for the correct link.'), { status: 400, headers: { 'Content-Type': 'text/html' } })

  const result = await findBookingByToken(token, env)
  if (!result) return new Response(resultPage('Booking Not Found', 'This booking has already been cancelled or could not be found.'), { status: 404, headers: { 'Content-Type': 'text/html' } })

  return new Response(managePage(result.booking, token, null), { status: 200, headers: { 'Content-Type': 'text/html' } })
}

async function handleModifyBooking(request, url, env) {
  const token = url.searchParams.get('token')
  if (!token) return new Response(resultPage('Invalid Link', 'This link is not valid.'), { status: 400, headers: { 'Content-Type': 'text/html' } })

  const result = await findBookingByToken(token, env)
  if (!result) return new Response(resultPage('Booking Not Found', 'This booking has already been cancelled or could not be found.'), { status: 404, headers: { 'Content-Type': 'text/html' } })

  const formData = await request.formData()
  const action = formData.get('action')
  const index = parseInt(formData.get('index'), 10)
  const booking = result.booking
  let flash = null

  if (action === 'rename') {
    const newName = (formData.get('newName') || '').trim().slice(0, 80)
    if (!newName) {
      flash = { type: 'error', message: 'Name cannot be empty.' }
    } else if (index >= 0 && index < booking.members.length) {
      const oldName = booking.members[index]
      booking.members[index] = newName
      await env.DEDICATIONS.put(result.key, JSON.stringify(booking), { metadata: { memberCount: booking.memberCount } })
      flash = { type: 'success', message: 'Updated: ' + oldName + ' changed to ' + newName }
      await notifyEmailWorker('modification_admin', booking, env)
    }
  } else if (action === 'remove') {
    if (booking.members.length <= QUIZ_MIN_TEAM) {
      flash = { type: 'error', message: 'You need at least ' + QUIZ_MIN_TEAM + ' team members. Cancel the booking instead if your whole team cannot make it.' }
    } else if (index >= 0 && index < booking.members.length) {
      const removed = booking.members.splice(index, 1)[0]
      booking.memberCount = booking.members.length
      await env.DEDICATIONS.put(result.key, JSON.stringify(booking), { metadata: { memberCount: booking.memberCount } })
      flash = { type: 'success', message: removed + ' has been removed from the team.' }
      await notifyEmailWorker('modification_admin', booking, env)
    }
  }

  return new Response(managePage(booking, token, flash), { status: 200, headers: { 'Content-Type': 'text/html' } })
}

async function handleCancelBooking(request, url, env) {
  const token = url.searchParams.get('token')
  if (!token) return new Response(resultPage('Invalid Link', 'This link is not valid.'), { status: 400, headers: { 'Content-Type': 'text/html' } })

  const result = await findBookingByToken(token, env)
  if (!result) return new Response(resultPage('Booking Not Found', 'This booking has already been cancelled or could not be found.'), { status: 404, headers: { 'Content-Type': 'text/html' } })

  await env.DEDICATIONS.delete(result.key)

  const spotsBooked = await getQuizSpotsBooked(env)
  if (spotsBooked < QUIZ_FINAL_THRESHOLD) {
    await env.DEDICATIONS.put(QUIZ_STATUS_KEY, 'open')
  } else {
    await env.DEDICATIONS.put(QUIZ_STATUS_KEY, 'final')
  }

  // Notify the booker and admin
  await notifyEmailWorker('cancellation', result.booking, env)
  await notifyEmailWorker('cancellation_admin', result.booking, env)

  const teamLabel = result.booking.teamName || 'Your team'
  return new Response(
    resultPage('Booking Cancelled', 'Your booking for <strong style="color:#F5F3EC;">' + teamLabel + '</strong> (' + result.booking.memberCount + ' people) has been cancelled. A confirmation has been sent to <strong style="color:#A88E5D;">' + result.booking.email + '</strong>.'),
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

    if (url.pathname === '/api/quiz-booking/manage' && request.method === 'GET') {
      try {
        return await handleManagePage(url, env)
      } catch (error) {
        return new Response('Something went wrong.', { status: 500, headers: { 'Content-Type': 'text/plain' } })
      }
    }

    if (url.pathname === '/api/quiz-booking/modify' && request.method === 'POST') {
      try {
        return await handleModifyBooking(request, url, env)
      } catch (error) {
        return new Response('Something went wrong.', { status: 500, headers: { 'Content-Type': 'text/plain' } })
      }
    }

    if (url.pathname === '/api/quiz-booking/cancel' && request.method === 'POST') {
      try {
        return await handleCancelBooking(request, url, env)
      } catch (error) {
        return new Response('Something went wrong.', { status: 500, headers: { 'Content-Type': 'text/plain' } })
      }
    }

    return handleAsset(request, env)
  },
}
