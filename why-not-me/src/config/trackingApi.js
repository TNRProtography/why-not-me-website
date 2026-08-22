// The OwnTracks proxy worker that stores and serves Nicole's live positions.
// Deployed separately from this repo (marathon-tracking-proxy).
export const TRACKING_API_BASE = 'https://marathon-tracking-proxy.why-not-me-nicole-white.workers.dev'

// Public: current position + history. Supports ?since=<ms> for incremental polls.
export const TRACKING_LIVE_ENDPOINT = `${TRACKING_API_BASE}/live.json`

// Admin only: DELETE wipes all stored position history.
// Requires `Authorization: Bearer <TRACKING_ADMIN_SECRET>`.
export const TRACKING_ADMIN_ENDPOINT = `${TRACKING_API_BASE}/admin/history`
