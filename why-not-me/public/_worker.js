/*
 * ============================================================
 * RAISELY LIVE DONATION PROGRESS - request handler
 * ============================================================
 * This handler powers /api/raisely-progress, which the donation
 * tracker fetches for live fundraising numbers, and also serves
 * the static site with single-page-app fallback.
 *
 * It is written so the SAME code works in BOTH Cloudflare
 * deployment models:
 *   - Workers (wrangler.jsonc -> main: this file)
 *   - Pages "advanced mode" (a copy lives at public/_worker.js,
 *     which Vite emits to dist/_worker.js for Pages to run)
 *
 * In both models the static-assets binding is `env.ASSETS`.
 *
 * Data source: Raisely public API (https://api.raisely.com/v3).
 * Nicole's profile is publicly readable by UUID, so no API key
 * is required for read-only progress.
 *   Profile (headline numbers): GET /v3/profiles/{uuid}
 *   Public donations:           GET /v3/profiles/{uuid}/donations
 *
 * The headline numbers come from the PROFILE call alone. The
 * donations list is fetched separately and is allowed to fail
 * without breaking the page, so a hiccup on the donations feed
 * never blanks out the progress bar.
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
  // Raisely stores money in cents. Large values are treated as cents.
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

  // On Pages advanced mode, unknown routes 404. For HTML navigations,
  // serve the SPA shell so client-side routes (e.g. /donation-progress)
  // work on a hard refresh. (On Workers-with-assets, not_found_handling
  // already returns index.html, so this simply never triggers.)
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

const LEGACY_DEDICATIONS_KEY = 'dedications_v1'
const DEDICATION_KEY_PREFIX = 'dedication_km_'
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

  // Backwards compatibility for data written before each kilometre had its own KV entry.
  const legacyRaw = await env.DEDICATIONS.get(LEGACY_DEDICATIONS_KEY)
  if (legacyRaw) {
    const legacyDedications = JSON.parse(legacyRaw)
    for (const [km, dedication] of Object.entries(legacyDedications)) {
      if (!dedications[km]) dedications[km] = dedication
    }
  }

  return dedications
}

async function handleGetDedications(env) {
  const dedications = await getDedications(env)
  return dedicationResponse({
    dedications,
    totalKilometres: TOTAL_KILOMETRES,
    claimed: Object.keys(dedications).length,
    remaining: TOTAL_KILOMETRES - Object.keys(dedications).length,
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

  // Read current state, check availability, write back
  const dedications = await getDedications(env)

  if (dedications[String(km)]) {
    return dedicationResponse({ error: 'This kilometre has already been claimed.' }, 409)
  }

  dedications[String(km)] = {
    name,
    dedicatedTo,
    message,
    createdAt: new Date().toISOString(),
  }

  await env.DEDICATIONS.put(dedicationKey(km), JSON.stringify(dedications[String(km)]))

  return dedicationResponse({
    success: true,
    km,
    dedications,
    totalKilometres: TOTAL_KILOMETRES,
    claimed: Object.keys(dedications).length,
    remaining: TOTAL_KILOMETRES - Object.keys(dedications).length,
  })
}

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
