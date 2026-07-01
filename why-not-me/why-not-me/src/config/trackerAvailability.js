// Controls the live-tracker visibility window
// Adjust these dates to match the event schedule
const TRACKER_OPEN = new Date('2026-06-29T15:00:00+12:00').getTime()
const TRACKER_CLOSE = new Date('2026-07-10T21:00:00+12:00').getTime()

export function isTrackerWindowOpen(nowMs = Date.now()) {
  return nowMs >= TRACKER_OPEN && nowMs <= TRACKER_CLOSE
}
