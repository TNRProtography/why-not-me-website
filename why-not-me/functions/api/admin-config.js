const CONFIG_KEY = 'admin_config'

const DEFAULT_CONFIG = {
  quiz: {
    enabled: false,
    startDate: '',
    endDate: '',
  },
  tracker: {
    enabled: false,
    startDate: '',
    endDate: '',
    // Which course the live tracker map draws: 'queenstown' | 'bottleLake'
    // (see src/config/courses.js)
    course: 'queenstown',
  },
  furthestDistance: {
    km: 20,
    label: 'Longest run so far',
    quote: "My longest run so far has been 20km! I'm feeling strong and have a fire in my belly to keep pushing. I'm so excited to see how far we can take this!",
  },
}

// GET: public (no auth) - returns config for the frontend
// POST: admin only (auth required) - saves config
export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (!env.DEDICATIONS) {
    return Response.json({ error: 'KV not configured.' }, { status: 500 })
  }

  if (request.method === 'GET') {
    try {
      const stored = await env.DEDICATIONS.get(CONFIG_KEY, 'json')
      const config = { ...DEFAULT_CONFIG, ...stored }
      return Response.json({ success: true, config })
    } catch {
      return Response.json({ success: true, config: DEFAULT_CONFIG })
    }
  }

  if (request.method === 'POST') {
    // Auth check
    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!env.EMAIL_SECRET || token !== env.EMAIL_SECRET) {
      return Response.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    try {
      const body = await request.json()
      const current = await env.DEDICATIONS.get(CONFIG_KEY, 'json') || DEFAULT_CONFIG
      const updated = { ...current, ...body }
      await env.DEDICATIONS.put(CONFIG_KEY, JSON.stringify(updated))
      return Response.json({ success: true, config: updated })
    } catch (err) {
      return Response.json({ error: 'Failed to save config.' }, { status: 500 })
    }
  }

  return Response.json({ error: 'Method not allowed.' }, { status: 405 })
}
