import { IconCheck } from '@tabler/icons-react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import classes from '@/styles/Dashboard.module.css'

export default function NoIncidentsAlert({ style }: { style?: CSSProperties }) {
  const { t } = useTranslation('common')
  return (
    <div
      className={classes.groupCard}
      style={{
        padding: '36px 24px',
        textAlign: 'center',
        margin: '20px 0',
        ...style,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          borderRadius: '50%',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          color: '#10b981',
          marginBottom: 12,
        }}
      >
        <IconCheck size={24} stroke={2.5} />
      </div>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px 0' }}>
        {t('No incidents in this month')}
      </h3>
      <p style={{ color: 'var(--mantine-color-dimmed)', fontSize: '0.85rem', margin: 0 }}>
        {t('There are no incidents for this month')}
      </p>
    </div>
  )
}
