// UptimeFlare configuration for tuannguyenviet.site.
// Keep credentials out of this file: monitor config is part of the deployment bundle.
import { MaintenanceConfig, PageConfig, WorkerConfig } from './types/config'

const pageConfig: PageConfig = {
  title: "Tuan Nguyen Viet Status",
  links: [
    { link: 'https://github.com/TheDemonTuan', label: 'GitHub' },
  ],
  group: {
    '9router': ['nine_router_api', 'nine_router_auth', 'nine_router_admin', 'nine_router_storage'],
    'Other Services': ['transactions'],
    Infrastructure: ['beszel_hub', 'beszel_main_live', 'beszel_main_systems'],
  },
}

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
      id: 'nine_router_auth',
      name: '9router API Auth',
      method: 'GET',
      target: 'https://9router-api.tuannguyenviet.site/v1/models',
      expectedCodes: [401],
      responseKeyword: 'API key required for remote API access',
      timeout: 5000,
    },
    {
      id: 'nine_router_admin',
      name: '9router Admin',
      method: 'GET',
      target: 'https://9router-admin.tuannguyenviet.site/dashboard',
      expectedCodes: [200],
      responseKeyword: 'data-monitor="9router-dashboard"',
      timeout: 10000,
    },
    {
      id: 'nine_router_storage',
      name: '9router SQLite',
      method: 'GET',
      target: 'https://9router-admin.tuannguyenviet.site/api/monitor/ready',
      expectedCodes: [200],
      responseKeyword: '"ready":true',
      timeout: 5000,
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
    {
      id: 'beszel_main_live',
      name: 'Main VPS Heartbeat',
      method: 'GET',
      target: 'https://beszel-heartbeat.tuannguyenviet.site/status/beszel-main/live',
      expectedCodes: [200],
      timeout: 5000,
      responseKeyword: 'healthy',
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

const maintenances: MaintenanceConfig[] = []

export { maintenances, pageConfig, workerConfig }
