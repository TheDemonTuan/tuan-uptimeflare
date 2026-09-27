import { Alert, List, Text } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import type { MaintenanceConfig, PublicMonitor } from '@/types/config'
import { pageConfig } from '@/page.config'
import { useTranslation } from 'react-i18next'
import { formatDateTime, useTimeZone } from '@/util/time'
import type { Locale } from '@/util/i18n'

export default function MaintenanceAlert({
  maintenance,
  configured,
  style,
  upcoming = false,
}: {
  maintenance: MaintenanceConfig
  configured: PublicMonitor[]
  style?: React.CSSProperties
  upcoming?: boolean
}) {
  const { t, i18n } = useTranslation('common')
  const timeZone = useTimeZone()
  const formatDate = (value: string | number) => formatDateTime(new Date(value).getTime() / 1000, i18n.language as Locale, timeZone)
  return (
    <Alert
      icon={<IconAlertTriangle />}
      title={
        <span
          style={{
            fontSize: '1rem',
            fontWeight: 700,
          }}
        >
          {(upcoming ? t('Upcoming') : '') + (maintenance.title || t('Scheduled Maintenance'))}
        </span>
      }
      color={
        upcoming ? pageConfig.maintenances?.upcomingColor ?? 'gray' : maintenance.color || 'yellow'
      }
      withCloseButton={false}
      style={{ margin: '16px auto 0 auto', ...style }}
    >
      <div style={{ fontSize: '0.85rem', marginBottom: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: '2px 8px' }}>
          <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
            {upcoming ? t('Scheduled for') : t('From')}
          </div>
          <div>{formatDate(maintenance.start)}</div>
          <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
            {upcoming ? t('Expected end') : t('To')}
          </div>
          <div>{maintenance.end ? formatDate(maintenance.end) : t('Until further notice')}</div>
        </div>
      </div>

      <Text style={{ paddingTop: '3px', whiteSpace: 'pre-line' }}>{maintenance.body}</Text>
      {maintenance.monitors && maintenance.monitors.length > 0 && (
        <>
          <Text mt="xs"><b>{t('Affected components')}</b></Text>
          <List size="sm" withPadding>
            {maintenance.monitors.map((id) => (
              <List.Item key={id}>{configured.find((monitor) => monitor.id === id)?.name ?? id}</List.Item>
            ))}
          </List>
        </>
      )}
    </Alert>
  )
}
