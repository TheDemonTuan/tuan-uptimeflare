import type { MaintenanceConfig, MonitorState, PublicMonitor } from '@/types/config'
import {
  IconAlertCircle,
  IconCircleCheck,
  IconRefresh,
  IconServer,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classes from '@/styles/Dashboard.module.css'
import MaintenanceAlert from './MaintenanceAlert'
import type { Locale } from '@/util/i18n'

export default function OverallStatus({
  state,
  maintenances,
  monitors,
  now,
  onRefresh,
}: {
  state: MonitorState
  maintenances: MaintenanceConfig[]
  monitors: PublicMonitor[]
  now: number
  onRefresh: () => Promise<void>
}) {
  const { t, i18n } = useTranslation('common')
  const locale = (i18n.language || 'vi') as Locale
  const [currentTime, setCurrentTime] = useState(now)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [expandUpcoming, setExpandUpcoming] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) setCurrentTime(Math.floor(Date.now() / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [now])

  const down = monitors.filter(
    ({ id }) =>
      state.incident[id]?.length &&
      state.latency[id]?.length &&
      state.incident[id].at(-1)?.end === null
  ).length

  const up = monitors.filter(
    ({ id }) =>
      state.incident[id]?.length &&
      state.latency[id]?.length &&
      state.incident[id].at(-1)?.end !== null
  ).length

  const unknown = monitors.length - up - down

  const active = maintenances.filter(
    (item) =>
      +new Date(item.start) <= now * 1000 &&
      (item.end === undefined || +new Date(item.end) >= now * 1000)
  )
  const upcoming = maintenances.filter((item) => +new Date(item.start) > now * 1000)

  const isHealthy = down === 0 && unknown === 0 && monitors.length > 0
  const isPartiallyDown = down > 0

  const statusTitle = isPartiallyDown
    ? t('Some systems not operational', { down, total: monitors.length })
    : unknown > 0 && up === 0
    ? t('Unknown')
    : t('All systems operational')

  const statusColor = isPartiallyDown ? '#ef4444' : isHealthy ? '#10b981' : '#64748b'

  const elapsed = Math.max(0, Math.max(now, currentTime) - state.lastUpdate)
  const formattedDate = state.lastUpdate
    ? new Date(state.lastUpdate * 1000).toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : ''

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  const uptimePercent = monitors.length > 0 ? (((monitors.length - down) / monitors.length) * 100).toFixed(0) : '100'

  return (
    <>
      {/* Hero Status Banner */}
      <section className={classes.heroBanner} aria-label="System Status Overview">
        <div className={classes.heroStatus}>
          <div className={classes.statusIndicatorWrapper}>
            <div
              className={classes.statusIndicatorPing}
              style={{ backgroundColor: statusColor }}
            />
            <div
              className={classes.statusIndicatorDot}
              style={{ backgroundColor: statusColor }}
            />
          </div>
          <div>
            <h1 className={classes.heroTitle}>{statusTitle}</h1>
            <div className={classes.heroSubtitle}>
              {state.lastUpdate ? (
                <>
                  <span>
                    {t('Updated at')}: <strong>{formattedDate}</strong>
                  </span>
                  <span>•</span>
                  <span>{elapsed}s trước</span>
                </>
              ) : (
                <span>{t('No data yet')}</span>
              )}
              {state.lastUpdate > 0 && elapsed > 300 && (
                <span
                  style={{
                    color: '#f59e0b',
                    fontWeight: 600,
                    background: 'rgba(245, 158, 11, 0.1)',
                    padding: '2px 8px',
                    borderRadius: 9999,
                  }}
                  role="status"
                >
                  {t('Stale data')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div>
          <button
            type="button"
            className={classes.refreshButton}
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label={t('Refresh')}
          >
            <IconRefresh
              size={16}
              style={{
                animation: isRefreshing ? 'spin 1s linear infinite' : undefined,
              }}
            />
            <span>{isRefreshing ? t('Refreshing') : t('Refresh')}</span>
          </button>
        </div>
      </section>

      {/* KPI Metrics Cards */}
      <div className={classes.kpiGrid}>
        <div className={classes.kpiCard}>
          <div className={classes.kpiLabel}>
            <span>{t('Total monitors')}</span>
            <IconServer size={18} style={{ color: '#64748b' }} />
          </div>
          <div className={classes.kpiValueWrapper}>
            <span className={classes.kpiValue}>{monitors.length}</span>
            <span
              className={classes.kpiBadge}
              style={{
                color: '#3b82f6',
                background: 'rgba(59, 130, 246, 0.1)',
              }}
            >
              100% {t('Monitored')}
            </span>
          </div>
        </div>

        <div className={classes.kpiCard}>
          <div className={classes.kpiLabel}>
            <span>{t('Operational')}</span>
            <IconCircleCheck size={18} style={{ color: '#10b981' }} />
          </div>
          <div className={classes.kpiValueWrapper}>
            <span className={classes.kpiValue} style={{ color: '#10b981' }}>
              {up}
            </span>
            <span
              className={classes.kpiBadge}
              style={{
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.1)',
              }}
            >
              {uptimePercent}%
            </span>
          </div>
        </div>

        <div className={classes.kpiCard}>
          <div className={classes.kpiLabel}>
            <span>{t('Down')}</span>
            <IconAlertCircle size={18} style={{ color: down > 0 ? '#ef4444' : '#64748b' }} />
          </div>
          <div className={classes.kpiValueWrapper}>
            <span
              className={classes.kpiValue}
              style={{ color: down > 0 ? '#ef4444' : undefined }}
            >
              {down}
            </span>
            <span
              className={classes.kpiBadge}
              style={{
                color: down > 0 ? '#ef4444' : '#64748b',
                background: down > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)',
              }}
            >
              {down > 0 ? `${down} sự cố` : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Maintenances */}
      {active.map((item, index) => (
        <MaintenanceAlert
          key={`${item.start}-${index}`}
          maintenance={item}
          configured={monitors}
        />
      ))}

      {upcoming.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <button
            type="button"
            className={classes.refreshButton}
            aria-expanded={expandUpcoming}
            onClick={() => setExpandUpcoming((val) => !val)}
            style={{ marginBottom: 12 }}
          >
            {t('upcoming maintenance', { count: upcoming.length })}: {expandUpcoming ? t('Hide') : t('Show')}
          </button>
          {expandUpcoming &&
            upcoming.map((item, index) => (
              <MaintenanceAlert
                key={`${item.start}-${index}`}
                maintenance={item}
                configured={monitors}
                upcoming
              />
            ))}
        </div>
      )}
    </>
  )
}
