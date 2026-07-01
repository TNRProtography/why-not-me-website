import { useState, useEffect } from 'react'
import './CountdownTimer.css'

function getTimeLeft(targetDate) {
  const now = Date.now()
  const diff = targetDate - now

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    passed: false,
  }
}

export default function CountdownTimer({ targetDate, label, passedMessage }) {
  const [time, setTime] = useState(() => getTimeLeft(targetDate))

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeLeft(targetDate)), 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  if (time.passed) {
    return passedMessage ? <div className="countdown-passed">{passedMessage}</div> : null
  }

  return (
    <div className="countdown-timer" aria-label={label}>
      <div className="countdown-unit">
        <span className="countdown-number">{time.days}</span>
        <span className="countdown-label">Day{time.days !== 1 ? 's' : ''}</span>
      </div>
      <span className="countdown-sep" aria-hidden="true">:</span>
      <div className="countdown-unit">
        <span className="countdown-number">{String(time.hours).padStart(2, '0')}</span>
        <span className="countdown-label">Hr{time.hours !== 1 ? 's' : ''}</span>
      </div>
      <span className="countdown-sep" aria-hidden="true">:</span>
      <div className="countdown-unit">
        <span className="countdown-number">{String(time.minutes).padStart(2, '0')}</span>
        <span className="countdown-label">Min</span>
      </div>
      <span className="countdown-sep" aria-hidden="true">:</span>
      <div className="countdown-unit">
        <span className="countdown-number">{String(time.seconds).padStart(2, '0')}</span>
        <span className="countdown-label">Sec</span>
      </div>
    </div>
  )
}
