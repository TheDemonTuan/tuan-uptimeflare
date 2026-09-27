import type { MaintenanceConfig, PageConfig } from './types/config'

const pageConfig: PageConfig = {
  title: 'Tuan Nguyen Viet Status',
  links: [{ link: 'https://github.com/TheDemonTuan', label: 'GitHub' }],
  group: {
    '9router': ['nine_router_api', 'nine_router_auth', 'nine_router_admin', 'nine_router_storage'],
    'Other Services': ['transactions'],
    Infrastructure: ['beszel_hub', 'beszel_main_systems'],
  },
}

const maintenances: MaintenanceConfig[] = []

export { pageConfig, maintenances }
