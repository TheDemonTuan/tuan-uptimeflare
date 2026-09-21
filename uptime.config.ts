// UptimeFlare configuration for tuannguyenviet.site.
// Keep credentials out of this file: monitor config is part of the deployment bundle.
import { MaintenanceConfig, PageConfig, WorkerConfig } from './types/config'

const pageConfig: PageConfig = {
  title: "Tuan Nguyen Viet Status",
  links: [
    { link: 'https://github.com/TheDemonTuan', label: 'GitHub' },
  ],
  group: {
    Public: ['nine_router_api', 'transactions'],
    Infrastructure: ['beszel_hub'],
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
  notification: {
    // Add a reviewed webhook through the deployment process before enabling alerts.
    // Do not commit bot tokens or other credentials here.
  },
}

const maintenances: MaintenanceConfig[] = []

export { maintenances, pageConfig, workerConfig }
