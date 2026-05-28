export const TRACKER_AVAILABILITY = {
  // New Zealand local time in: dd/mm/yyyy hh:mm (24h)
  // Examples: "21/11/2026 08:00", "22/11/2026 16:30"
  // If either value is null/invalid, tracker is treated as disabled.
  startNzt: "28/05/2026 14:45",
  endNzt: "28/05/2026 16:30",
}

function parseDdMmYyyyHhMm(value) {
  if (!value || typeof value !== 'string') return null
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/)
  if (!match) return null

  const [, ddRaw, mmRaw, yyyyRaw, hhRaw, minRaw] = match
  const day = Number(ddRaw)
  const month = Number(mmRaw)
  const year = Number(yyyyRaw)
  const hour = Number(hhRaw)
  const minute = Number(minRaw)

  if (
    !Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year) ||
    !Number.isInteger(hour) || !Number.isInteger(minute)
  ) return null
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null

  return { day, month, year, hour, minute }
}

function getTzOffsetMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
  })
  const tzPart = dtf.formatToParts(date).find((part) => part.type === 'timeZoneName')?.value || ''
  const match = tzPart.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/)
  if (!match) return null
  const signHour = Number(match[1])
  const minutes = Number(match[2] || '0')
  return (signHour * 60 + Math.sign(signHour || 1) * minutes) * 60000
}

function nztLocalToUtcMs(value) {
  const parsed = parseDdMmYyyyHhMm(value)
  if (!parsed) return null
  const { day, month, year, hour, minute } = parsed
  const tz = 'Pacific/Auckland'

  const initialUtcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
  const offset1 = getTzOffsetMs(new Date(initialUtcGuess), tz)
  if (offset1 == null) return null
  const utcMs1 = initialUtcGuess - offset1
  const offset2 = getTzOffsetMs(new Date(utcMs1), tz)
  if (offset2 == null) return null
  return initialUtcGuess - offset2
}

export function isTrackerWindowOpen(nowMs = Date.now()) {
  const startMs = nztLocalToUtcMs(TRACKER_AVAILABILITY.startNzt)
  const endMs = nztLocalToUtcMs(TRACKER_AVAILABILITY.endNzt)
  if (startMs == null || endMs == null) return false
  return nowMs >= startMs && nowMs <= endMs
}
