import Head from 'next/head'
import type { GetServerSidePropsContext } from 'next'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
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

type IncidentsProps =
  | { accessDenied: true }
  | { accessDenied?: false; monitors: PublicMonitor[]; renderedAt: number; locale?: string }

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/

export default function IncidentsPage(props: IncidentsProps) {
  if (props.accessDenied) return null
  return <Incidents monitors={props.monitors} renderedAt={props.renderedAt} />
}

function Incidents({ monitors, renderedAt }: { monitors: PublicMonitor[]; renderedAt: number }) {
  const { t } = useTranslation('common')
  const initial = new Date(renderedAt * 1000)
  const [selectedMonth, setSelectedMonth] = useState(
    `${initial.getUTCFullYear()}-${String(initial.getUTCMonth() + 1).padStart(2, '0')}`
  )
  const [localTime, setLocalTime] = useState(false)
  const [selectedMonitor, setSelectedMonitor] = useState<string | null>('')

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.slice(1)
      const today = new Date()
      setSelectedMonth(
        monthPattern.test(hash)
          ? hash
          : `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
      )
      setLocalTime(true)
    }
    onHash()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const filtered = maintenances
    .filter((incident) => {
      const date = new Date(incident.start)
      const year = localTime ? date.getFullYear() : date.getUTCFullYear()
      const month = localTime ? date.getMonth() : date.getUTCMonth()
      return (
        `${year}-${String(month + 1).padStart(2, '0')}` === selectedMonth &&
        (!selectedMonitor || incident.monitors?.includes(selectedMonitor))
      )
    })
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())

  const [year, month] = selectedMonth.split('-').map(Number)
  const prev = new Date(Date.UTC(year, month - 2, 1))
  const next = new Date(Date.UTC(year, month, 1))
  const monthValue = (date: Date) =>
    `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`

  return (
    <>
      <Head>
        <title>{`${t('Incidents & maintenance')} - ${pageConfig.title}`}</title>
        <link rel="icon" href={pageConfig.favicon ?? '/favicon.png'} />
      </Head>
      <main>
        <Header />
        <div className={dashboardStyles.container} style={{ paddingTop: 28 }}>
          <div style={{ marginBottom: 24 }}>
            <h1 className={dashboardStyles.heroTitle}>{t('Incidents & maintenance')}</h1>
            <p style={{ color: 'var(--mantine-color-dimmed)', fontSize: '0.9rem', margin: '6px 0 0 0' }}>
              Theo dõi lịch sử và các kế hoạch bảo trì hệ thống
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'light-dark(#f1f5f9, rgba(255, 255, 255, 0.04))',
                padding: '4px 6px',
                borderRadius: 10,
                border: '1px solid light-dark(#e2e8f0, rgba(255, 255, 255, 0.08))',
              }}
            >
              <button
                type="button"
                className={dashboardStyles.refreshButton}
                onClick={() => {
                  window.location.hash = monthValue(prev)
                }}
                style={{ height: 32, padding: '0 10px' }}
                aria-label={t('Backwards')}
              >
                <IconChevronLeft size={16} />
              </button>

              <span
                style={{
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  padding: '0 8px',
                  fontFamily: 'monospace',
                }}
                aria-live="polite"
              >
                {selectedMonth}
              </span>

              <button
                type="button"
                className={dashboardStyles.refreshButton}
                onClick={() => {
                  window.location.hash = monthValue(next)
                }}
                style={{ height: 32, padding: '0 10px' }}
                aria-label={t('Forward')}
              >
                <IconChevronRight size={16} />
              </button>
            </div>

            <div>
              <select
                aria-label={t('Select monitor')}
                value={selectedMonitor ?? ''}
                onChange={(e) => setSelectedMonitor(e.target.value || null)}
                className={dashboardStyles.refreshButton}
                style={{ height: 36, padding: '0 12px', borderRadius: 8 }}
              >
                <option value="">{t('All')}</option>
                {monitors.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filtered.length ? (
            filtered.map((incident, index) => (
              <MaintenanceAlert
                key={`${incident.start}-${index}`}
                maintenance={incident}
                configured={monitors}
              />
            ))
          ) : (
            <NoIncidentsAlert />
          )}
        </div>
        <Footer />
      </main>
    </>
  )
}

export async function getServerSideProps({ req, res }: GetServerSidePropsContext) {
  const { env } = await getCloudflareContext({ async: true })
  if (!requireBasicAuth(req, res, env.STATUS_PAGE_AUTH)) return { props: { accessDenied: true } }
  const monitors: PublicMonitor[] = workerConfig.monitors.map(({ id, name }) => ({ id, name }))
  return {
    props: {
      monitors,
      renderedAt: Math.floor(Date.now() / 1000),
      locale: resolveLocale(req.headers.cookie),
    },
  }
}
