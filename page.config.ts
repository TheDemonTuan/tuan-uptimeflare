import type { MaintenanceConfig, PageConfig } from './types/config'

const pageConfig: PageConfig = {
  title: 'Tuan Nguyen Viet Status',
  links: [{ link: 'https://github.com/TheDemonTuan', label: 'GitHub' }],
  group: {
    Public: ['nine_router_api', 'transactions'],
    Infrastructure: ['beszel_hub'],
  },
}

const maintenances: MaintenanceConfig[] = []

export { pageConfig, maintenances }
