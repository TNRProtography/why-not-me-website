const RAISELY_API_BASE = 'https://api.raisely.com/v3'
const RAISELY_PROFILE_UUID = '5726f720-4406-11f1-b02c-c194de4f7b8f'
const RAISELY_CAMPAIGN_UUID = 'e6ecc870-bfd9-11ee-925d-ab85a9665c6e'
const RAISELY_DONATION_URL = 'https://nogoingback.nz/nicole-white'
const CACHE_TTL_SECONDS = 45
const DONATION_LIMIT = 100
const MAX_DONATIONS = 5000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Raisely request failed: ${response.status}`)
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
    name: profile.name || profile.path || 'Why Not Me?',
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
    name: donation.anonymous ? 'Anonymous supporter' : truncate(name, 80),
    message: truncate(message),
    amount: centsToCurrency(firstValue(donation.total, donation.amount, donation.displayTotal)),
    currency: donation.currency || 'NZD',
    createdAt: donation.createdAt || donation.paidAt || donation.updatedAt,
  }
}

async function getDonationPage(path, params) {
  const response = await raiselyFetch(path, params)
  return response.data || []
}

async function getAllPublicDonations() {
  const donations = []
  let offset = 0

  while (donations.length < MAX_DONATIONS) {
    const baseParams = {
      profile: RAISELY_PROFILE_UUID,
      limit: DONATION_LIMIT,
      offset,
      sort: 'createdAt',
      order: 'desc',
      status: 'OK',
    }

    let page
    try {
      page = await getDonationPage(`/campaigns/${encodeURIComponent(RAISELY_CAMPAIGN_UUID)}/donations`, baseParams)
    } catch (error) {
      try {
        page = await getDonationPage('/donations', baseParams)
      } catch (fallbackError) {
        page = await getDonationPage(`/profiles/${encodeURIComponent(RAISELY_PROFILE_UUID)}/donations`, {
          limit: DONATION_LIMIT,
          offset,
          sort: 'createdAt',
          order: 'desc',
        })
      }
    }

    donations.push(...page)

    if (page.length < DONATION_LIMIT) break
    offset += DONATION_LIMIT
  }

  return donations.slice(0, MAX_DONATIONS)
}

async function handleProgress() {
  const [profileResponse, donations] = await Promise.all([
    raiselyFetch(`/profiles/${encodeURIComponent(RAISELY_PROFILE_UUID)}`),
    getAllPublicDonations(),
  ])

  return jsonResponse({
    profile: normaliseProfile(profileResponse.data || profileResponse),
    donations: donations.map(normaliseDonation),
    updatedAt: new Date().toISOString(),
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

    return env.ASSETS.fetch(request)
  },
}
