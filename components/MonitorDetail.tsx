import { Tooltip } from '@mantine/core'
import type { MonitorState, PublicMonitor } from '@/types/config'
import type { CompactedMonitorStateWrapper } from '@/worker/src/store'
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconBolt,
  IconChartLine,
  IconChevronDown,
  IconChevronUp,
  IconCircleCheck,
  IconExternalLink,
} from '@tabler/icons-react'
import dynamic from 'next/dynamic'
import DetailBar from './DetailBar'
import { getColor } from '@/util/color'
import { maintenances } from '@/page.config'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classes from '@/styles/Dashboard.module.css'

const DetailChart = dynamic(() => import('./DetailChart'), { ssr: false })

export default function MonitorDetail({
  monitor,
  state,
  compactedState,
  now,
  standalone = false,
}: {
  monitor: PublicMonitor
  state: MonitorState
  compactedState: CompactedMonitorStateWrapper
  now: number
  standalone?: boolean
}) {
  const { t } = useTranslation('common')
  const [chartOpened, setChartOpened] = useState(false)

  useEffect(() => {
    if (!standalone || monitor.hideLatencyChart) return
    const frame = requestAnimationFrame(() => setChartOpened(true))
    return () => cancelAnimationFrame(frame)
  }, [standalone, monitor.hideLatencyChart])

  const incidentHistory = state.incident[monitor.id] || []
  const hasHistory = incidentHistory.length > 0 && (state.latency[monitor.id]?.length || 0) > 0
  const isDown = hasHistory && incidentHistory.at(-1)?.end === null
  const maintenance = maintenances.some(
    (item) =>
      item.monitors?.includes(monitor.id) &&
      new Date(item.start).getTime() / 1000 <= now &&
      (!item.end || new Date(item.end).getTime() / 1000 >= now)
  )

  const firstStart = incidentHistory[0]?.start[0]
  const totalTime = firstStart === undefined ? 0 : now - firstStart
  let downTime = 0
  for (const incident of incidentHistory) {
    downTime += Math.max(0, Math.min(incident.end ?? now, now) - incident.start[0])
  }

  const uptimePercent =
    hasHistory && totalTime > 0
      ? (((totalTime - downTime) / totalTime) * 100).toPrecision(4)
      : null

  const lastLatency = state.latency[monitor.id]?.at(-1)

  const chartResult = useMemo(() => {
    if (!chartOpened || monitor.hideLatencyChart) return null
    try {
      return { records: compactedState.getLatencyRecords(monitor.id) }
    } catch {
      return { error: true }
    }
  }, [chartOpened, compactedState, monitor.id, monitor.hideLatencyChart])

  const statusColor = maintenance
    ? '#f59e0b'
    : !hasHistory
    ? '#64748b'
    : isDown
    ? '#ef4444'
    : '#10b981'

  const statusLabel = maintenance
    ? t('Scheduled Maintenance')
    : !hasHistory
    ? t('Unknown')
    : isDown
    ? t('Down')
    : t('Operational')

  return (
    <div>
      {/* Monitor Header Row */}
      <div className={classes.monitorHeader}>
        <div className={classes.monitorNameWrapper}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              backgroundColor: statusColor,
              boxShadow: `0 0 8px ${statusColor}`,
              flexShrink: 0,
            }}
            aria-hidden="true"
          />

          {monitor.statusPageLink ? (
            <a
              href={monitor.statusPageLink}
              target="_blank"
              rel="noopener noreferrer"
              className={classes.monitorName}
            >
              <span>{monitor.name}</span>
              <IconExternalLink size={14} style={{ opacity: 0.6 }} />
            </a>
          ) : (
            <span className={classes.monitorName}>{monitor.name}</span>
          )}

          {monitor.tooltip && (
            <Tooltip label={monitor.tooltip} multiline w={220} withArrow>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: '#64748b',
                  cursor: 'help',
                  display: 'inline-flex',
                }}
              >
                ⓘ
              </span>
            </Tooltip>
          )}

          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              color: statusColor,
              marginLeft: 4,
            }}
          >
            {statusLabel}
          </span>
        </div>

        <div className={classes.monitorMetaRight}>
          {lastLatency && (
            <span className={classes.latencyPill}>
              <IconBolt size={12} style={{ color: '#3b82f6' }} />
              <span>{lastLatency.ping} ms</span>
            </span>
          )}

          <span
            className={classes.uptimePill}
            style={{
              color: uptimePercent === null ? '#64748b' : getColor(uptimePercent, true),
            }}
          >
            {uptimePercent === null ? t('Unknown') : `${uptimePercent}%`}
          </span>
        </div>
      </div>

      {/* 90-Day History Bars */}
      <DetailBar monitor={monitor} state={state} now={now} />

      {/* Chart Toggle & Lazy Container */}
      {!monitor.hideLatencyChart && hasHistory && (
        <>
          <button
            type="button"
            className={classes.chartToggleBtn}
            onClick={() => setChartOpened(!chartOpened)}
            aria-expanded={chartOpened}
          >
            <IconChartLine size={15} />
            <span>{t(chartOpened ? 'Hide 12-hour chart' : 'Show 12-hour chart')}</span>
            {chartOpened ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </button>

          {chartOpened && (
            <div className={classes.chartContainer}>
              {chartResult && 'error' in chartResult ? (
                <div role="alert" style={{ fontSize: '0.85rem', color: '#ef4444' }}>
                  {t('Chart unavailable')}
                </div>
              ) : (
                <DetailChart
                  monitor={monitor}
                  records={chartResult && 'records' in chartResult ? chartResult.records : []}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
