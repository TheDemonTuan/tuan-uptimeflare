import type { MaintenanceConfig, PageConfig } from './types/config'

const pageConfig: PageConfig = {
  title: "lyc8503's Status Page",
  links: [
    { link: 'https://github.com/lyc8503', label: 'GitHub' },
    { link: 'https://blog.lyc8503.net/', label: 'Blog' },
    { link: 'mailto:me@lyc8503.net', label: 'Email Me', highlight: true },
  ],
  group: {
    Public: ['foo_monitor', 'bar_monitor'],
    Infrastructure: ['test_tcp_monitor'],
  },
  // favicon: '/favicon.png',
  // logo: '/logo.svg',
  maintenances: { upcomingColor: 'gray' },
  // customFooter: '<p>Trusted HTML from this repository</p>',
}

// Maintenance entries are public. Dates accept Unix timestamps or ISO 8601 strings.
const maintenances: MaintenanceConfig[] = [{
  monitors: ['foo_monitor'],
  title: 'Scheduled maintenance',
  body: 'Server software upgrade',
  start: '2025-04-27T00:00:00+08:00',
  end: '2025-04-30T00:00:00+08:00',
  color: 'blue',
}]

export { pageConfig, maintenances }
