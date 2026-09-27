import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
} from 'chart.js'
import type { ChartOptions } from 'chart.js'
import type { LatencyRecord, PublicMonitor } from '@/types/config'
import type { Locale } from '@/util/i18n'
import { formatDateTime, useTimeZone } from '@/util/time'
import { codeToCountry } from '@/util/iata'
import { useTranslation } from 'react-i18next'
import classes from '@/styles/Dashboard.module.css'

ChartJS.register(LinearScale, PointElement, LineElement, ChartTooltip, Filler)

export default function DetailChart({
  monitor,
  records,
}: {
  monitor: PublicMonitor
  records: LatencyRecord[]
}) {
  const { t, i18n } = useTranslation('common')
  const timeZone = useTimeZone()
  const locale = (i18n.language || 'vi') as Locale

  if (records.length === 0) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--mantine-color-dimmed)', fontSize: '0.85rem' }}>
        {t('No data available')}
      </div>
    )
  }

  const data = {
    datasets: [
      {
        data: records.map((point) => ({
          x: point.time * 1000,
          y: point.ping,
          loc: point.loc,
        })),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        fill: true,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#3b82f6',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        tension: 0.3,
      },
    ],
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          title: (items) =>
            items[0]?.parsed.x == null
              ? ''
              : formatDateTime(items[0].parsed.x / 1000, locale, timeZone),
          label: (item) => `${item.parsed.y} ms (${codeToCountry(records[item.dataIndex].loc)})`,
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
        },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: (value) =>
            formatDateTime(Number(value) / 1000, locale, timeZone, {
              hour: '2-digit',
              minute: '2-digit',
            }),
          maxRotation: 0,
        },
      },
      y: {
        type: 'linear',
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
        },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
        },
        title: {
          display: true,
          text: 'ms',
          color: '#64748b',
          font: { size: 11 },
        },
      },
    },
  }

  let minimum = Infinity
  let maximum = -Infinity
  let sum = 0
  for (const record of records) {
    minimum = Math.min(minimum, record.ping)
    maximum = Math.max(maximum, record.ping)
    sum += record.ping
  }
  const average = (sum / records.length).toFixed(1)
  const latest = records.at(-1)?.ping ?? 0

  return (
    <>
      <div style={{ height: 180 }} role="img" aria-label={`${monitor.name}: ${t('Response times')}`}>
        <Line options={options} data={data} />
      </div>

      <div className={classes.chartStatsRow}>
        <span>
          {t('Latest')}: <strong>{latest} ms</strong>
        </span>
        <span>•</span>
        <span>
          {t('Minimum')}: <strong>{minimum} ms</strong>
        </span>
        <span>•</span>
        <span>
          {t('Average')}: <strong>{average} ms</strong>
        </span>
        <span>•</span>
        <span>
          {t('Maximum')}: <strong>{maximum} ms</strong>
        </span>
      </div>

      <details style={{ marginTop: 12 }}>
        <summary style={{ fontSize: '0.78rem', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>
          {t('Latency samples')} ({records.length})
        </summary>
        <div style={{ overflowX: 'auto', maxHeight: 220, marginTop: 8 }}>
          <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8' }}>
                <th scope="col" style={{ padding: '6px 8px' }}>
                  {t('Time')}
                </th>
                <th scope="col" style={{ padding: '6px 8px' }}>
                  {t('Latency')}
                </th>
                <th scope="col" style={{ padding: '6px 8px' }}>
                  {t('Location')}
                </th>
              </tr>
            </thead>
            <tbody>
              {records.slice(-20).map((record, index) => (
                <tr
                  key={`${record.time}-${index}`}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  <td style={{ padding: '4px 8px' }}>{formatDateTime(record.time, locale, timeZone)}</td>
                  <td style={{ padding: '4px 8px', color: '#3b82f6' }}>{record.ping} ms</td>
                  <td style={{ padding: '4px 8px' }}>{codeToCountry(record.loc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  )
}
