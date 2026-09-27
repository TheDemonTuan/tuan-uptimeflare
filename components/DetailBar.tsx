import type { MonitorState, PublicMonitor } from '@/types/config'
import type { Locale } from '@/util/i18n'
import { getColor } from '@/util/color'
import { formatDateTime, formatDuration, getDailyUptime, useTimeZone } from '@/util/time'
import { Box, Tooltip, Modal } from '@mantine/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function DetailBar({ monitor, state, now }: {
  monitor: PublicMonitor
  state: MonitorState
  now: number
}) {
  const { t, i18n } = useTranslation('common')
  const locale = i18n.language as Locale
  const timeZone = useTimeZone()
  const dayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'numeric', day: 'numeric', timeZone,
  }), [locale, timeZone])
  const barRef = useRef<HTMLDivElement>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const incidents = state.incident[monitor.id] || []
  const days = getDailyUptime(incidents, now, timeZone !== 'UTC')

  useEffect(() => {
    if (barRef.current) barRef.current.scrollLeft = barRef.current.scrollWidth
  }, [timeZone])

  const selected = selectedDay === null ? null : days[selectedDay]
  const reasons: string[] = []
  if (selected) for (const incident of incidents) {
    for (let index = 0; index < incident.error.length; index++) {
      const start = Math.max(selected.start, incident.start[index])
      const end = Math.min(selected.end, incident.start[index + 1] ?? incident.end ?? now, now)
      if (end > start) {
        const from = formatDateTime(start, locale, timeZone, { hour: '2-digit', minute: '2-digit' })
        const to = formatDateTime(end, locale, timeZone, { hour: '2-digit', minute: '2-digit' })
        reasons.push(`[${from}-${to}] ${incident.error[index]}`)
      }
    }
  }

  return (
    <>
      <Modal
        opened={selected !== null}
        onClose={() => setSelectedDay(null)}
        title={selected ? t('incidents at', {
          name: monitor.name,
          date: formatDateTime(selected.start, locale, timeZone, { year: 'numeric', month: 'numeric', day: 'numeric' }),
        }) : ''}
        size="40em"
      >
        {reasons.map((reason, index) => <div key={index}>{reason}</div>)}
      </Modal>
      <Box ref={barRef} style={{ overflowX: 'auto', maxWidth: '100%', margin: '10px 0 5px' }}>
        <div style={{ display: 'flex', width: 'max-content', gap: 2 }}>
          {days.map((day, index) => {
            const date = dayFormatter.format(day.start * 1000)
            const percent = day.monitoredSeconds > 0
              ? (((day.monitoredSeconds - day.downSeconds) / day.monitoredSeconds) * 100).toPrecision(4)
              : null
            const label = percent === null ? `${date}: ${t('Unknown')}` :
              `${t('percent at date', { percent, date })}${day.downSeconds > 0 ? `; ${t('Down for', { duration: formatDuration(day.downSeconds, locale) })}` : ''}`
            const style = { height: 20, width: 8, flex: '0 0 8px', borderRadius: 2, background: percent === null ? '#9ca3af' : getColor(percent, false) }
            return (
              <Tooltip key={day.start} label={label} multiline events={{ hover: true, focus: true, touch: true }}>
                {day.downSeconds > 0 ? (
                  <button type="button" aria-label={label} onClick={() => setSelectedDay(index)} style={{ ...style, border: 0, padding: 0, cursor: 'pointer' }} />
                ) : (
                  <span role="img" aria-label={label} style={{ ...style, display: 'block' }} />
                )}
              </Tooltip>
            )
          })}
        </div>
      </Box>
    </>
  )
}
