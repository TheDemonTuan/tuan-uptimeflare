import type { MaintenanceConfig, MonitorState, PublicMonitor } from '@/types/config'
import { Button, Container, Group, Paper, Text, Title } from '@mantine/core'
import { IconAlertCircle, IconCircleCheck, IconQuestionMark } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MaintenanceAlert from './MaintenanceAlert'

export default function OverallStatus({ state, maintenances, monitors, now, onRefresh }: {
  state: MonitorState
  maintenances: MaintenanceConfig[]
  monitors: PublicMonitor[]
  now: number
  onRefresh: () => Promise<void>
}) {
  const { t } = useTranslation('common')
  const [currentTime, setCurrentTime] = useState(now)
  const [expandUpcoming, setExpandUpcoming] = useState(false)
  useEffect(() => {
    const interval = setInterval(() => { if (!document.hidden) setCurrentTime(Math.floor(Date.now() / 1000)) }, 1000)
    return () => clearInterval(interval)
  }, [now])

  const down = monitors.filter(({ id }) => state.incident[id]?.length && state.latency[id]?.length && state.incident[id].at(-1)?.end === null).length
  const up = monitors.filter(({ id }) => state.incident[id]?.length && state.latency[id]?.length && state.incident[id].at(-1)?.end !== null).length
  const unknown = monitors.length - up - down
  const active = maintenances.filter((item) => +new Date(item.start) <= now * 1000 && (item.end === undefined || +new Date(item.end) >= now * 1000))
  const upcoming = maintenances.filter((item) => +new Date(item.start) > now * 1000)
  const status = down ? t('Some systems not operational', { down, total: monitors.length }) : unknown ? t('Unknown') : t('All systems operational')

  return <Container size="lg" py="lg">
    <Group justify="space-between" align="center" wrap="wrap">
      <div><Title order={1}>{status}</Title>
        <Text c="dimmed">{state.lastUpdate ? t('Last updated on', { date: new Date(state.lastUpdate * 1000).toISOString(), seconds: Math.max(now, currentTime) - state.lastUpdate }) : t('No data yet')}</Text>
        {state.lastUpdate > 0 && Math.max(now, currentTime) - state.lastUpdate > 300 && <Text c="orange.8" role="status">{t('Stale data')}</Text>}
      </div>
      <Button variant="default" onClick={() => void onRefresh()}>{t('Refresh')}</Button>
    </Group>
    <Group grow mt="lg" wrap="wrap">
      <Paper p="md" withBorder><Text>{t('Total monitors')}</Text><Title order={2}>{monitors.length}</Title></Paper>
      <Paper p="md" withBorder><IconCircleCheck aria-hidden="true" size={18} /><Text>{t('Operational')}</Text><Title order={2}>{up}</Title></Paper>
      <Paper p="md" withBorder><IconAlertCircle aria-hidden="true" size={18} /><Text>{t('Down')}</Text><Title order={2}>{down}</Title></Paper>
    </Group>
    {unknown > 0 && <Text mt="xs"><IconQuestionMark aria-hidden="true" size={16} /> {t('Unknown')}: {unknown}</Text>}
    {active.map((item, index) => <MaintenanceAlert key={`${item.start}-${index}`} maintenance={item} configured={monitors} />)}
    {upcoming.length > 0 && <>
      <Button variant="subtle" mt="md" aria-expanded={expandUpcoming} onClick={() => setExpandUpcoming((value) => !value)}>
        {t('upcoming maintenance', { count: upcoming.length })}: {expandUpcoming ? t('Hide') : t('Show')}
      </Button>
      {expandUpcoming && upcoming.map((item, index) => <MaintenanceAlert key={`${item.start}-${index}`} maintenance={item} configured={monitors} upcoming />)}
    </>}
  </Container>
}
