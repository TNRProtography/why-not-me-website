# Clear Tracking Data — patch for `marathon-tracking-proxy`

The admin page's **Clear Tracking Data** button calls:

```
DELETE https://marathon-tracking-proxy.why-not-me-nicole-white.workers.dev/admin/history
Authorization: Bearer <ADMIN_SECRET>
```

The proxy currently only serves `/` and `/live.json`, so that request 404s and
nothing is deleted. The three edits below add the route.

The proxy is the right place for this: it already binds the `LIVE_TRACKING` KV
namespace, so it can delete the keys directly without calling the ingest worker.

---

## Why the data survived

Position data lives across several KV keys written by the **ingest** worker:

| Key | Contents |
|---|---|
| `snapshot` | Pre-built blob: `latest` + `session` + a 60-point tail |
| `latest` | Most recent position |
| `session` | Session record, including `chunkCount` |
| `history:<sessionId>:00000`, `:00001`, … | The track, 200 points per chunk |
| `history-blob:<sessionId>` | Legacy single-blob history from the old worker |
| `event:<ms>` | Non-location OwnTracks events |
| `cheers` | Messages from supporters — **not** tracking data |

Deleting only some of these leaves the trail intact, because `buildSnapshot()`
falls back through `snapshot` → `latest`/`session` → chunks → `snap.recent`.
Every one of those paths has to be cleared.

---

## Edit 1 — allow DELETE through CORS

```js
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
```

Both the methods and the headers line need changing. Without `Authorization` in
the allowed headers the browser blocks the preflight before the request is ever
sent.

## Edit 2 — add the route

In `fetch()`, above the final 404:

```js
    if (url.pathname === "/admin/history" && request.method === "DELETE") {
      return handleClearHistory(request, env);
    }
```

## Edit 3 — add the handler

```js
async function handleClearHistory(request, env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");

  if (!env.ADMIN_SECRET || token !== env.ADMIN_SECRET) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  if (!env.LIVE_TRACKING) {
    return json({ ok: false, error: "Missing KV binding named LIVE_TRACKING" }, 500);
  }

  // Everything except `cheers`, which is supporter messages, not tracking data.
  const keep = new Set(["cheers"]);
  const toDelete = [];
  let cursor;

  do {
    const listed = await env.LIVE_TRACKING.list({ cursor, limit: 1000 });
    for (const key of listed.keys) {
      if (!keep.has(key.name)) toDelete.push(key.name);
    }
    cursor = listed.list_complete ? undefined : listed.cursor;
  } while (cursor);

  await Promise.all(toDelete.map(k => env.LIVE_TRACKING.delete(k)));

  // Drop this isolate's cached snapshot so the very next read rebuilds empty.
  _cachedSnapshot = null;
  _cachedAt = 0;

  return json({ success: true, deleted: toDelete.length, keys: toDelete });
}
```

Listing rather than deleting a fixed key list matters: session IDs are
timestamped (`session-1750000000000`), so chunk key names aren't knowable in
advance, and old sessions leave chunks behind that a fixed list would miss.

---

## Set the secret

```
npx wrangler secret put ADMIN_SECRET --name marathon-tracking-proxy
```

Use the same value as the site's `EMAIL_SECRET`, so the single admin login works
for both. If you'd rather keep them separate, the admin page needs a second
password field.

---

## Two things to expect

**A stale response for a second or two.** The proxy caches the snapshot in
memory for 2 seconds, per isolate. Clearing resets the cache in whichever
isolate served the DELETE, but other isolates keep their copy until it expires.
Wait a couple of seconds and hard-refresh.

**The trail coming back on its own.** If OwnTracks is still running on Nicole's
phone, it repopulates within seconds. Stop it before clearing, or you'll be
deleting a track that immediately rebuilds.

---

## Fallback that works right now

The ingest worker already has `POST /api/purge` behind Basic auth
(`TRACKER_USERNAME` / `TRACKER_PASSWORD`), which does the same wipe:

```
curl -X POST -u "USERNAME:PASSWORD" https://<ingest-worker-host>/api/purge
```

Two reasons the admin button doesn't use it: it wipes `cheers` too, and putting
the OwnTracks credentials into a browser page would expose the same login that
authorises position writes.
