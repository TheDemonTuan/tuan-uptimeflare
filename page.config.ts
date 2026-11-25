import type { MaintenanceConfig, PageConfig } from './types/config'

const pageConfig: PageConfig = {
  title: 'Tuan Nguyen Viet Status',
  links: [{ link: 'https://github.com/TheDemonTuan', label: 'GitHub' }],
  group: {
    OmniRoute: ['omniroute_api', 'omniroute_auth'],
    'MC Hub': ['mc_hub_web', 'mc_hub_web_origin', 'mc_hub_api', 'mc_hub_posts'],
    'Other Services': ['transactions'],
    Infrastructure: ['fleet_monitor'],
  },
}

const maintenances: MaintenanceConfig[] = []

export { pageConfig, maintenances }
