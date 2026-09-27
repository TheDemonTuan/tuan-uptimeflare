import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, LinearScale, PointElement, LineElement, Tooltip as ChartTooltip } from 'chart.js'
import type { ChartOptions } from 'chart.js'
import type { LatencyRecord, PublicMonitor } from '@/types/config'
import type { Locale } from '@/util/i18n'
import { formatDateTime, useTimeZone } from '@/util/time'
import { codeToCountry } from '@/util/iata'
import { useTranslation } from 'react-i18next'

ChartJS.register(LinearScale, PointElement, LineElement, ChartTooltip)

export default function DetailChart({ monitor, records }: {
  monitor: PublicMonitor
  records: LatencyRecord[]
}) {
  const { t, i18n } = useTranslation('common')
  const timeZone = useTimeZone()
  const locale = i18n.language as Locale
  if (records.length === 0) return <div>{t('No Data')}</div>

  const data = {
    datasets: [{
      data: records.map((point) => ({ x: point.time * 1000, y: point.ping, loc: point.loc })),
      borderColor: 'rgb(112, 119, 140)',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.4,
    }],
  }
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: {
        title: (items) => items[0]?.parsed.x == null ? '' : formatDateTime(items[0].parsed.x / 1000, locale, timeZone),
        label: (item) => `${item.parsed.y}ms (${codeToCountry(records[item.dataIndex].loc)})`,
      } },
    },
    scales: {
      x: { type: 'linear', ticks: {
        callback: (value) => formatDateTime(Number(value) / 1000, locale, timeZone, { hour: '2-digit', minute: '2-digit' }),
        maxRotation: 0,
      } },
      y: { type: 'linear', title: { display: true, text: 'ms' } },
    },
  }
  let minimum = Infinity
  let maximum = -Infinity
  for (const record of records) {
    minimum = Math.min(minimum, record.ping)
    maximum = Math.max(maximum, record.ping)
  }
  return (
    <>
      <div style={{ height: 180 }} role="img" aria-label={`${monitor.name}: ${t('Response times')}`}>
        <Line options={options} data={data} />
      </div>
      <p>{t('Latest')}: {records.at(-1)?.ping}ms · {t('Minimum')}: {minimum}ms · {t('Maximum')}: {maximum}ms</p>
      <details>
        <summary>{t('Latency samples')}</summary>
        <div style={{ overflowX: 'auto', maxHeight: 260 }}>
          <table>
            <thead><tr><th scope="col">{t('Time')}</th><th scope="col">{t('Latency')}</th><th scope="col">{t('Location')}</th></tr></thead>
            <tbody>{records.map((record, index) => (
              <tr key={`${record.time}-${index}`}>
                <td>{formatDateTime(record.time, locale, timeZone)}</td>
                <td>{record.ping}ms</td>
                <td>{codeToCountry(record.loc)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </details>
    </>
  )
}
