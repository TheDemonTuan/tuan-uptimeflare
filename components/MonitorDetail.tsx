import { Button, Text, Tooltip } from '@mantine/core'
import type { MonitorState, PublicMonitor } from '@/types/config'
import type { CompactedMonitorStateWrapper } from '@/worker/src/store'
import { IconAlertCircle, IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react'
import dynamic from 'next/dynamic'
import DetailBar from './DetailBar'
import { getColor } from '@/util/color'
import { maintenances } from '@/page.config'
import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const DetailChart = dynamic(() => import('./DetailChart'), { ssr: false })

export default function MonitorDetail({ monitor, state, compactedState, now, standalone = false }: {
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
  const maintenance = maintenances.some((item) =>
    item.monitors?.includes(monitor.id) && new Date(item.start).getTime() / 1000 <= now &&
    (!item.end || new Date(item.end).getTime() / 1000 >= now))
  const firstStart = incidentHistory[0]?.start[0]
  const totalTime = firstStart === undefined ? 0 : now - firstStart
  let downTime = 0
  for (const incident of incidentHistory) {
    downTime += Math.max(0, Math.min(incident.end ?? now, now) - incident.start[0])
  }
  const uptimePercent = hasHistory && totalTime > 0
    ? (((totalTime - downTime) / totalTime) * 100).toPrecision(4)
    : null
  const chartResult = useMemo(() => {
    if (!chartOpened || monitor.hideLatencyChart) return null
    try { return { records: compactedState.getLatencyRecords(monitor.id) } }
    catch { return { error: true } }
  }, [chartOpened, compactedState, monitor.id, monitor.hideLatencyChart])

  const statusIcon = maintenance ? (
    <IconAlertTriangle aria-label={t('Scheduled Maintenance')} style={{ width: '1.25em', color: '#fab005', marginRight: 3 }} />
  ) : !hasHistory ? (
    <IconAlertCircle aria-label={t('Unknown')} style={{ width: '1.25em', color: '#6b7280', marginRight: 3 }} />
  ) : isDown ? (
    <IconAlertCircle aria-label={t('Down')} style={{ width: '1.25em', color: '#b91c1c', marginRight: 3 }} />
  ) : (
    <IconCircleCheck aria-label={t('Operational')} style={{ width: '1.25em', color: '#059669', marginRight: 3 }} />
  )
  const monitorNameElement = (
    <Text mt="sm" fw={700} style={{ display: 'inline-flex', alignItems: 'center' }}>
      {monitor.statusPageLink ? (
        <a href={monitor.statusPageLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', color: 'inherit' }}>
          {statusIcon} {monitor.name}
        </a>
      ) : <>{statusIcon} {monitor.name}</>}
    </Text>
  )

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        {monitor.tooltip ? <Tooltip label={monitor.tooltip}>{monitorNameElement}</Tooltip> : monitorNameElement}
        <Text mt="sm" fw={700} style={{ color: uptimePercent === null ? '#6b7280' : getColor(uptimePercent, true) }}>
          {uptimePercent === null ? t('Unknown') : t('Overall', { percent: uptimePercent })}
        </Text>
      </div>
      <Text size="sm">{maintenance ? t('Scheduled Maintenance') : !hasHistory ? t('Unknown') : isDown ? t('Down') : t('Operational')}</Text>
      <DetailBar monitor={monitor} state={state} now={now} />
      {!monitor.hideLatencyChart && hasHistory && (
        <>
          <Button variant="subtle" onClick={() => setChartOpened(!chartOpened)} aria-expanded={chartOpened}>
            {t(chartOpened ? 'Hide 12-hour chart' : 'Show 12-hour chart')}
          </Button>
          {chartOpened && (chartResult && 'error' in chartResult ? <Text role="alert">{t('Chart unavailable')}</Text> :
            <DetailChart monitor={monitor} records={chartResult && 'records' in chartResult ? chartResult.records : []} />)}
        </>
      )}
    </>
  )
}
