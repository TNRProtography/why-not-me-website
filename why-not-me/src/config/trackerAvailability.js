export const TRACKER_AVAILABILITY = {
  // Use UTC ISO-8601 timestamps, e.g. "2026-11-21T20:00:00Z"
  // If either value is null, tracker is treated as disabled.
  startUtc: null,
  endUtc: null,
}

function toMs(value) {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function isTrackerWindowOpen(nowMs = Date.now()) {
  const startMs = toMs(TRACKER_AVAILABILITY.startUtc)
  const endMs = toMs(TRACKER_AVAILABILITY.endUtc)
  if (startMs == null || endMs == null) return false
  return nowMs >= startMs && nowMs <= endMs
}

