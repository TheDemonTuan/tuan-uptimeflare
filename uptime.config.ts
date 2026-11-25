// UptimeFlare configuration for tuannguyenviet.site.
// Keep credentials out of this file: monitor config is part of the deployment bundle.
import type { WorkerConfig } from './types/config'

const workerConfig: WorkerConfig = {
  monitors: [
    {
      id: 'omniroute_api',
      name: 'OmniRoute API',
      method: 'GET',
      target: 'https://omniroute-api.tuannguyenviet.site/api/health',
      expectedCodes: [200],
      timeout: 5000,
      responseKeyword: '"ok":true',
    },
    {
      id: 'omniroute_auth',
      name: 'OmniRoute API Auth',
      method: 'GET',
      target: 'https://omniroute-api.tuannguyenviet.site/v1/models',
      expectedCodes: [401],
      responseKeyword: '"code":"AUTH_002"',
      timeout: 5000,
    },
    {
      id: 'mc_hub_web',
      name: 'MC Hub Website',
      method: 'GET',
      target: 'https://thedemontuan.dev/',
      expectedCodes: [200],
      responseKeyword: '<title>Minecraft Datapacks, Add-ons &amp; Mods | TDT</title>',
      timeout: 10000,
    },
    {
      id: 'mc_hub_web_origin',
      name: 'MC Hub Web Origin',
      method: 'GET',
      target: 'https://thedemontuan.dev/healthz',
      expectedCodes: [200],
      responseKeyword: '"ok":true',
      timeout: 5000,
    },
    {
      id: 'mc_hub_api',
      name: 'MC Hub API Readiness',
      method: 'GET',
      target: 'https://api.thedemontuan.dev/healthz',
      expectedCodes: [200],
      responseKeyword: '"ok":true',
      timeout: 5000,
    },
    {
      id: 'mc_hub_posts',
      name: 'MC Hub Public Content API',
      method: 'GET',
      target: 'https://api.thedemontuan.dev/api/posts?limit=1',
      expectedCodes: [200],
      responseKeyword: '"items":[',
      timeout: 5000,
    },
    {
      id: 'transactions',
      name: 'ACB Transactions Website',
      method: 'GET',
      target: 'https://transactions.tuannguyenviet.site/',
      expectedCodes: [200],
      responseKeyword: '<title>Thu ngân · SePay Store + payOS</title>',
      tooltip: 'Checks the public viewer, not bank ingestion or payment delivery.',
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
    {
      id: 'beszel_main_systems',
      name: 'Beszel Systems',
      method: 'GET',
      target: 'https://beszel-heartbeat.tuannguyenviet.site/status/beszel-main/systems',
      expectedCodes: [200],
      timeout: 5000,
      responseKeyword: 'healthy',
    },
  ],
  callbacks: {
    async onStatusChange(env, monitor, isUp, timeIncidentStart, timeNow, reason) {
      if (isUp || timeIncidentStart !== timeNow) return
      if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
        throw new Error('Telegram Worker secrets are missing')
      }
      const body = new URLSearchParams({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: `${monitor.name} is down; ${reason}`,
      })
      try {
        const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
          signal: AbortSignal.timeout(5000),
        })
        if (!response.ok) console.error(`Telegram notification failed: HTTP ${response.status}`)
      } catch {
        console.error('Telegram notification failed: network or timeout')
      }
    },
  },
}

export { workerConfig }
