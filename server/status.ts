import { workerConfig } from '@/uptime.config'
import { getFromStore, CompactedMonitorStateWrapper } from '@/worker/src/store'
import type { DashboardSnapshot, PublicMonitor } from '@/types/config'
import type { Env } from '@/worker/src'

export async function getDashboardSnapshot(env: Pick<Env, 'UPTIMEFLARE_D1'>): Promise<DashboardSnapshot> {
  const compactedStateStr = await getFromStore(env, 'state')
  new CompactedMonitorStateWrapper(compactedStateStr)
  const monitors: PublicMonitor[] = workerConfig.monitors.map(({ id, name, tooltip, statusPageLink, hideLatencyChart }) => ({
    id, name,
    ...(tooltip === undefined ? {} : { tooltip }),
    ...(statusPageLink === undefined ? {} : { statusPageLink }),
    ...(hideLatencyChart === undefined ? {} : { hideLatencyChart }),
  }))
  return { compactedStateStr, monitors, renderedAt: Math.floor(Date.now() / 1000) }
}
