import Head from 'next/head'
import type { GetServerSidePropsContext } from 'next'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { Button, Text } from '@mantine/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DashboardSnapshot, MonitorState, PublicMonitor } from '@/types/config'
import { pageConfig, maintenances } from '@/page.config'
import { CompactedMonitorStateWrapper } from '@/worker/src/store'
import { getDashboardSnapshot } from '@/server/status'
import { requireBasicAuth } from '@/server/auth'
import { resolveLocale } from '@/util/i18n'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import OverallStatus from '@/components/OverallStatus'
import dashboardStyles from '@/styles/Dashboard.module.css'
import MonitorList from '@/components/MonitorList'
import MonitorDetail from '@/components/MonitorDetail'

type HomeProps = (DashboardSnapshot & { dataError?: boolean; locale?: string; accessDenied?: false }) | { accessDenied: true; locale?: string }

function displayState(wrapper: CompactedMonitorStateWrapper, monitors: PublicMonitor[]): MonitorState {
  const { lastUpdate, overallUp, overallDown } = wrapper.data
  const incident: MonitorState['incident'] = {}
  const latency: MonitorState['latency'] = {}
  for (const { id } of monitors) {
    incident[id] = Array.from({ length: wrapper.incidentLen(id) }, (_, index) => wrapper.getIncident(id, index))
    latency[id] = wrapper.latencyLen(id) ? [wrapper.getLastLatency(id)] : []
  }
  return { lastUpdate, overallUp, overallDown, incident, latency }
}

function validSnapshot(value: unknown): value is DashboardSnapshot {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as DashboardSnapshot
  if (!Number.isFinite(snapshot.renderedAt) || snapshot.renderedAt < 0 || !Array.isArray(snapshot.monitors) ||
    !(snapshot.compactedStateStr === null || typeof snapshot.compactedStateStr === 'string')) return false
  if (!snapshot.monitors.every((monitor) => monitor && typeof monitor.id === 'string' && typeof monitor.name === 'string' &&
    Object.keys(monitor).every((key) => ['id', 'name', 'tooltip', 'statusPageLink', 'hideLatencyChart'].includes(key)) &&
    (monitor.tooltip === undefined || typeof monitor.tooltip === 'string') &&
    (monitor.statusPageLink === undefined || typeof monitor.statusPageLink === 'string') &&
    (monitor.hideLatencyChart === undefined || typeof monitor.hideLatencyChart === 'boolean'))) return false
  new CompactedMonitorStateWrapper(snapshot.compactedStateStr)
  return true
}

export default function Home(props: HomeProps) {
  if (props.accessDenied) return null
  return <Dashboard initial={props} />
}

function Dashboard({ initial }: { initial: DashboardSnapshot & { dataError?: boolean } }) {
  const { t } = useTranslation('common')
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(initial)
  const [error, setError] = useState(initial.dataError ? 'Unable to read monitor state' : '')
  const [monitorId, setMonitorId] = useState('')
  const [now, setNow] = useState(initial.renderedAt)
  const pending = useRef<AbortController | null>(null)
  const lastAttempt = useRef(0)
  const active = useRef(true)
  const wrapper = useMemo(() => new CompactedMonitorStateWrapper(snapshot.compactedStateStr), [snapshot.compactedStateStr])
  const state = useMemo(() => displayState(wrapper, snapshot.monitors), [wrapper, snapshot.monitors])

  const refresh = useCallback(async () => {
    if (document.hidden || pending.current) return
    lastAttempt.current = Date.now()
    const controller = new AbortController()
    pending.current = controller
    const timeout = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch('/api/data?view=dashboard', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal })
      if (response.status === 401) throw new Error('Authentication required')
      if (!response.ok) throw new Error('Unable to read monitor state')
      const next: unknown = await response.json()
      if (!validSnapshot(next)) throw new Error('Unable to read monitor state')
      if (active.current) { setSnapshot(next); setNow(next.renderedAt); setError('') }
    } catch (cause) {
      if (active.current) setError(cause instanceof Error && cause.message === 'Authentication required' ? cause.message : 'Unable to read monitor state')
    } finally {
      clearTimeout(timeout)
      pending.current = null
    }
  }, [])

  useEffect(() => {
    active.current = true
    const onHash = () => { try { setMonitorId(decodeURIComponent(window.location.hash.slice(1))) } catch { setMonitorId(window.location.hash.slice(1)) } }
    onHash()
    window.addEventListener('hashchange', onHash)
    const onVisible = () => { if (!document.hidden && Date.now() - lastAttempt.current >= 60000) void refresh() }
    document.addEventListener('visibilitychange', onVisible)
    const interval = setInterval(onVisible, 60000)
    return () => { active.current = false; window.removeEventListener('hashchange', onHash); document.removeEventListener('visibilitychange', onVisible); clearInterval(interval); pending.current?.abort() }
  }, [refresh])

  const selected = snapshot.monitors.find((monitor) => monitor.id === monitorId)
  return <>
    <Head><title>{pageConfig.title}</title><link rel="icon" href={pageConfig.favicon ?? '/favicon.png'} /></Head>
    {monitorId ? selected ? <main className={dashboardStyles.container} style={{ padding: '24px 16px', maxWidth: 810 }}>
      <div className={dashboardStyles.panel} style={{ padding: 16 }}>
        <MonitorDetail monitor={selected} state={state} compactedState={wrapper} now={now} standalone />
      </div>
      {error && <Text role="alert" mt="md">{t(error)}</Text>}
    </main> : <main className={dashboardStyles.container} style={{ padding: '24px 16px' }}><Text role="alert">{t('Monitor not found', { id: monitorId })}</Text></main> :
    <main><Header />
      <div className={dashboardStyles.container}>
        {error && <div role="alert" style={{ marginBottom: 16 }}><Text>{t(error)}</Text><Button onClick={() => void refresh()}>{t('Retry')}</Button></div>}
        <OverallStatus state={state} monitors={snapshot.monitors} maintenances={maintenances} now={now} onRefresh={refresh} />
        {state.lastUpdate === 0 ? <Text py="xl">{t('No data yet')}</Text> : <MonitorList monitors={snapshot.monitors} state={state} compactedState={wrapper} now={now} />}
      </div>
      <Footer />
    </main>}
  </>
}


export async function getServerSideProps({ req, res }: GetServerSidePropsContext) {
  const { env } = await getCloudflareContext({ async: true })
  if (!requireBasicAuth(req, res, env.STATUS_PAGE_AUTH)) return { props: { accessDenied: true } }
  try {
    return { props: { ...await getDashboardSnapshot(env), locale: resolveLocale(req.headers.cookie) } }
  } catch {
    res.statusCode = 503
    return { props: { compactedStateStr: null, monitors: [], renderedAt: Math.floor(Date.now() / 1000), dataError: true, locale: resolveLocale(req.headers.cookie) } }
  }
}
