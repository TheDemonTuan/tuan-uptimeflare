// UptimeFlare configuration for tuannguyenviet.site.
// Keep credentials out of this file: monitor config is part of the deployment bundle.
import type { WorkerConfig } from './types/config'

const workerConfig: WorkerConfig = {
  monitors: [
    {
      id: 'nine_router_api',
      name: '9router API',
      method: 'GET',
      target: 'https://9router-api.tuannguyenviet.site/api/health',
      expectedCodes: [200],
      timeout: 5000,
      responseKeyword: '"ok":true',
    },
    {
      id: 'transactions',
      name: 'ACB Transactions',
      method: 'GET',
      target: 'https://transactions.tuannguyenviet.site/',
      expectedCodes: [200],
      timeout: 5000,
    },
    {
      id: 'beszel_hub',
      name: 'Beszel Hub',
      method: 'GET',
      target: 'https://beszel.tuannguyenviet.site/api/health',
      expectedCodes: [200],
      timeout: 5000,
      responseKeyword: '"code":200',
    },
  ],
  callbacks: {
    onStatusChange: async (env, monitor, isUp, timeIncidentStart, timeNow, reason) => {
      // Only the first failed check opens an incident; ignore error changes and recovery.
      if (isUp || timeIncidentStart !== timeNow) return
      if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
        throw new Error('Telegram Worker secrets are missing')
      }
      const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        body: new URLSearchParams({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: `🔴 ${monitor.name} is down. Issue: ${reason || 'unspecified'}`,
        }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => {
        throw new Error('Telegram request failed')
      })
      if (!response.ok) throw new Error(`Telegram notification failed: HTTP ${response.status}`)
    },
  },
}

export { workerConfig }

