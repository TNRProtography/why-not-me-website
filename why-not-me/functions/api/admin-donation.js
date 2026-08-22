// Proxy endpoint to record a donation via the Raisely API
// The actual Raisely integration depends on how the site's
// raisely-progress endpoint works. This stores in KV as a
// fallback and can be extended to call the Raisely API directly.

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405 })
  }

  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!env.EMAIL_SECRET || token !== env.EMAIL_SECRET) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  if (!env.DEDICATIONS) {
    return Response.json({ error: 'KV not configured.' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { name, amount, message } = body

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Amount must be positive.' }, { status: 400 })
    }

    const donation = {
      id: `admin_donation_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: name || 'Anonymous',
      amount,
      message: message || '',
      source: 'admin',
      createdAt: new Date().toISOString(),
    }

    // Store in KV
    await env.DEDICATIONS.put(
      `donation_${donation.id}`,
      JSON.stringify(donation)
    )

    return Response.json({ success: true, donation })
  } catch (err) {
    return Response.json({ error: 'Failed to record donation.' }, { status: 500 })
  }
}
