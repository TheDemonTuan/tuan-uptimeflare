import { useSyncExternalStore } from 'react'
import type { IncidentRecord } from '../types/config'
import type { Locale } from './i18n'

export function useTimeZone(): string {
  return useSyncExternalStore(
    (onChange) => { document.addEventListener('visibilitychange', onChange); return () => document.removeEventListener('visibilitychange', onChange) },
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    () => 'UTC'
  )
}

export function formatDateTime(
  timestampSeconds: number,
  locale: Locale,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(timestampSeconds * 1000)
}

export function formatDuration(seconds: number, locale: Locale): string {
  let remaining = Math.floor(Math.max(0, seconds))
  const parts: string[] = []
  for (const [unit, length] of [['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]] as const) {
    const count = Math.floor(remaining / length)
    remaining %= length
    if (count || (unit === 'second' && !parts.length)) {
      parts.push(new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'long' }).format(count))
    }
  }
  return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(parts)
}

export function getDailyUptime(
  incidents: IncidentRecord[],
  now: number,
  useLocalTime: boolean
): Array<{ start: number; end: number; monitoredSeconds: number; downSeconds: number }> {
  const days: Array<{ start: number; end: number; monitoredSeconds: number; downSeconds: number }> = []
  const cursor = new Date(now * 1000)
  if (useLocalTime) {
    cursor.setHours(0, 0, 0, 0)
    cursor.setDate(cursor.getDate() - 89)
  } else {
    cursor.setUTCHours(0, 0, 0, 0)
    cursor.setUTCDate(cursor.getUTCDate() - 89)
  }
  const monitorStart = incidents[0]?.start[0]
  for (let day = 0; day < 90; day++) {
    const start = cursor.getTime() / 1000
    if (useLocalTime) cursor.setDate(cursor.getDate() + 1)
    else cursor.setUTCDate(cursor.getUTCDate() + 1)
    const end = cursor.getTime() / 1000
    const monitoredStart = monitorStart === undefined ? now : Math.max(start, monitorStart)
    const monitoredEnd = Math.min(end, now)
    const monitoredSeconds = Math.max(0, monitoredEnd - monitoredStart)
    let downSeconds = 0
    if (monitoredSeconds) {
      for (const incident of incidents) {
        const incidentStart = incident.start[0]
        if (incidentStart === undefined) continue
        const incidentEnd = incident.end ?? now
        downSeconds += Math.max(0, Math.min(monitoredEnd, incidentEnd) - Math.max(monitoredStart, incidentStart))
      }
    }
    days.push({ start, end, monitoredSeconds, downSeconds: Math.min(monitoredSeconds, downSeconds) })
  }
  return days
}
