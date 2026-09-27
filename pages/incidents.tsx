import Head from 'next/head'
import type { GetServerSidePropsContext } from 'next'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { Box, Button, Container, Group, Select, Title } from '@mantine/core'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PublicMonitor } from '@/types/config'
import { maintenances, pageConfig } from '@/page.config'
import { workerConfig } from '@/uptime.config'
import { requireBasicAuth } from '@/server/auth'
import { resolveLocale } from '@/util/i18n'
import Header from '@/components/Header'
import dashboardStyles from '@/styles/Dashboard.module.css'
import Footer from '@/components/Footer'
import MaintenanceAlert from '@/components/MaintenanceAlert'
import NoIncidentsAlert from '@/components/NoIncidents'

type IncidentsProps = { accessDenied: true } | { accessDenied?: false; monitors: PublicMonitor[]; renderedAt: number; locale?: string }
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/

export default function IncidentsPage(props: IncidentsProps) {
  if (props.accessDenied) return null
  return <Incidents monitors={props.monitors} renderedAt={props.renderedAt} />
}

function Incidents({ monitors, renderedAt }: { monitors: PublicMonitor[]; renderedAt: number }) {
  const { t } = useTranslation('common')
  const initial = new Date(renderedAt * 1000)
  const [selectedMonth, setSelectedMonth] = useState(`${initial.getUTCFullYear()}-${String(initial.getUTCMonth() + 1).padStart(2, '0')}`)
  const [localTime, setLocalTime] = useState(false)
  const [selectedMonitor, setSelectedMonitor] = useState<string | null>('')
  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.slice(1)
      const today = new Date()
      setSelectedMonth(monthPattern.test(hash) ? hash : `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
      setLocalTime(true)
    }
    onHash()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const filtered = maintenances.filter((incident) => {
    const date = new Date(incident.start)
    const year = localTime ? date.getFullYear() : date.getUTCFullYear()
    const month = localTime ? date.getMonth() : date.getUTCMonth()
    return `${year}-${String(month + 1).padStart(2, '0')}` === selectedMonth &&
      (!selectedMonitor || incident.monitors?.includes(selectedMonitor))
  }).sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
  const [year, month] = selectedMonth.split('-').map(Number)
  const prev = new Date(Date.UTC(year, month - 2, 1))
  const next = new Date(Date.UTC(year, month, 1))
  const monthValue = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`

  return <>
    <Head><title>{pageConfig.title}</title><link rel="icon" href={pageConfig.favicon ?? '/favicon.png'} /></Head>
    <main><Header /><div className={dashboardStyles.container} style={{ padding: '24px 16px' }}>
      <Title order={1}>{t('Incidents & maintenance')}</Title>
      <Group justify="space-between" my="md" wrap="wrap">
        <Group>
          <Button variant="default" onClick={() => { window.location.hash = monthValue(prev) }}>{t('Backwards')}</Button>
          <Box aria-live="polite">{selectedMonth}</Box>
          <Button variant="default" onClick={() => { window.location.hash = monthValue(next) }}>{t('Forward')}</Button>
        </Group>
        <Select aria-label={t('Select monitor')} placeholder={t('Select monitor')}
          data={[{ value: '', label: t('All') }, ...monitors.map(({ id, name }) => ({ value: id, label: name }))]}
          value={selectedMonitor} onChange={setSelectedMonitor} clearable />
      </Group>
      {filtered.length ? filtered.map((incident, index) => <MaintenanceAlert key={`${incident.start}-${index}`} maintenance={incident} configured={monitors} />) : <NoIncidentsAlert />}
    </div><Footer /></main>
  </>
}


export async function getServerSideProps({ req, res }: GetServerSidePropsContext) {
  const { env } = await getCloudflareContext({ async: true })
  if (!requireBasicAuth(req, res, env.STATUS_PAGE_AUTH)) return { props: { accessDenied: true } }
  const monitors: PublicMonitor[] = workerConfig.monitors.map(({ id, name }) => ({ id, name }))
  return { props: { monitors, renderedAt: Math.floor(Date.now() / 1000), locale: resolveLocale(req.headers.cookie) } }
}
