import type { MonitorState, PublicMonitor } from '@/types/config'
import type { Locale } from '@/util/i18n'
import { getColor } from '@/util/color'
import { formatDateTime, formatDuration, getDailyUptime, useTimeZone } from '@/util/time'
import { Modal, Tooltip } from '@mantine/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classes from '@/styles/Dashboard.module.css'

export default function DetailBar({
  monitor,
  state,
  now,
}: {
  monitor: PublicMonitor
  state: MonitorState
  now: number
}) {
  const { t, i18n } = useTranslation('common')
  const locale = (i18n.language || 'vi') as Locale
  const timeZone = useTimeZone()
  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        timeZone,
      }),
    [locale, timeZone]
  )
  const barRef = useRef<HTMLDivElement>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const incidents = state.incident[monitor.id] || []
  const days = getDailyUptime(incidents, now, timeZone !== 'UTC')

  useEffect(() => {
    if (barRef.current) {
      barRef.current.scrollLeft = barRef.current.scrollWidth
    }
  }, [timeZone])

  const selected = selectedDay === null ? null : days[selectedDay]
  const reasons: string[] = []
  if (selected) {
    for (const incident of incidents) {
      for (let index = 0; index < incident.error.length; index++) {
        const start = Math.max(selected.start, incident.start[index])
        const end = Math.min(selected.end, incident.start[index + 1] ?? incident.end ?? now, now)
        if (end > start) {
          const from = formatDateTime(start, locale, timeZone, {
            hour: '2-digit',
            minute: '2-digit',
          })
          const to = formatDateTime(end, locale, timeZone, {
            hour: '2-digit',
            minute: '2-digit',
          })
          reasons.push(`[${from} - ${to}] ${incident.error[index] || t('Down')}`)
        }
      }
    }
  }

  return (
    <>
      <Modal
        opened={selected !== null}
        onClose={() => setSelectedDay(null)}
        title={
          selected
            ? t('incidents at', {
                name: monitor.name,
                date: formatDateTime(selected.start, locale, timeZone, {
                  year: 'numeric',
                  month: 'numeric',
                  day: 'numeric',
                }),
              })
            : ''
        }
        size="lg"
        centered
        radius="md"
      >
        <div style={{ padding: '8px 0' }}>
          {reasons.length > 0 ? (
            reasons.map((reason, index) => (
              <div
                key={index}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  borderLeft: '3px solid #ef4444',
                  borderRadius: 4,
                  fontSize: '0.85rem',
                  marginBottom: 8,
                }}
              >
                {reason}
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--mantine-color-dimmed)', fontSize: '0.85rem' }}>
              {t('No incidents')}
            </div>
          )}
        </div>
      </Modal>

      <div className={classes.barSection}>
        <div className={classes.barMetaHeader}>
          <span>{t('90 days ago')}</span>
          <span style={{ height: 1, flex: '1 1 auto', margin: '0 12px', background: 'currentColor', opacity: 0.1 }} />
          <span>{t('Today')}</span>
        </div>

        <div ref={barRef} className={classes.barTrack}>
          {days.map((day, index) => {
            const date = dayFormatter.format(day.start * 1000)
            const percent =
              day.monitoredSeconds > 0
                ? (((day.monitoredSeconds - day.downSeconds) / day.monitoredSeconds) * 100).toPrecision(4)
                : null

            const label =
              percent === null
                ? `${date}: ${t('Unknown')}`
                : `${t('percent at date', { percent, date })}${
                    day.downSeconds > 0
                      ? `; ${t('Down for', { duration: formatDuration(day.downSeconds, locale) })}`
                      : ''
                  }`

            const barColor =
              percent === null
                ? 'var(--mantine-color-gray-5)'
                : getColor(percent, false)

            return (
              <Tooltip
                key={day.start}
                label={label}
                multiline
                withArrow
                events={{ hover: true, focus: true, touch: true }}
              >
                {day.downSeconds > 0 ? (
                  <button
                    type="button"
                    aria-label={label}
                    onClick={() => setSelectedDay(index)}
                    className={classes.barBlock}
                    style={{ backgroundColor: barColor }}
                  />
                ) : (
                  <span
                    role="img"
                    aria-label={label}
                    className={classes.barBlock}
                    style={{ backgroundColor: barColor, display: 'block' }}
                  />
                )}
              </Tooltip>
            )
          })}
        </div>
      </div>
    </>
  )
}
