# Clear Tracking Data — route needed in `marathon-tracking-proxy`

The admin page's **Live Tracking Data** card calls a route that lives in the
separate `marathon-tracking-proxy` worker (not this repo). Add it there.

## Contract

```
DELETE /admin/history
Authorization: Bearer <TRACKING_ADMIN_SECRET>
```

| Response | Meaning |
|---|---|
| `200 {"success":true,"deleted":<n>}` | Wiped. `deleted` is optional; shown in the toast if present. |
| `401` / `403` | Bad or missing secret. |
| `404` | Route not deployed yet. |

The admin page handles all four cases with its own message, so you don't need
to match the body exactly — only the status codes matter.

Also add `DELETE` to the CORS allow-list and handle the `OPTIONS` preflight, or
the browser will block the call before it reaches the worker.

## Implementation

Adapt the storage part to however the proxy actually persists history. If it
keeps points as individual KV entries under a prefix:

```js
const ADMIN_PATH = '/admin/history'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

// --- inside fetch(), before the existing routes ---

if (request.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders() })
}

if (url.pathname === ADMIN_PATH && request.method === 'DELETE') {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!env.TRACKING_ADMIN_SECRET || token !== env.TRACKING_ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders() })
  }

  let deleted = 0
  let cursor
  do {
    const page = await env.TRACKING.list({ prefix: 'point:', cursor })
    await Promise.all(page.keys.map((k) => env.TRACKING.delete(k.name)))
    deleted += page.keys.length
    cursor = page.list_complete ? null : page.cursor
  } while (cursor)

  // Reset whatever singleton keys the proxy keeps alongside the history,
  // e.g. the latest position and the running point counter.
  await env.TRACKING.delete('latest')
  await env.TRACKING.delete('stats')

  return Response.json({ success: true, deleted }, { headers: corsHeaders() })
}
```

If history is instead stored as one JSON blob, replace the loop with a single
`await env.TRACKING.delete('history')` and return the old array's length as
`deleted`.

## Secret

```
npx wrangler secret put TRACKING_ADMIN_SECRET
```

Set it to the same value as the site's `EMAIL_SECRET` so the one admin login
works for both workers. If you'd rather keep them separate, the admin page will
need a second password field.

## Note on KV consistency

Cloudflare KV is eventually consistent, so the tracker page may keep serving a
cached `live.json` for up to ~60s after a clear. The admin card's point count
can also lag on the first refresh. Wait a minute and refresh if the number
doesn't drop straight away.
