import type { NextApiRequest, NextApiResponse } from 'next'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { maintenances } from '@/page.config'
import { workerConfig } from '@/uptime.config'
import { CompactedMonitorStateWrapper } from '@/worker/src/store'
import { getDashboardSnapshot } from '@/server/status'
import { requireBasicAuth, privateNoStore } from '@/server/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  res.setHeader('Cache-Control', privateNoStore)
  const { env } = await getCloudflareContext({ async: true })
  if (!requireBasicAuth(req, res, env.STATUS_PAGE_AUTH)) return
  if (env.STATUS_PAGE_AUTH === undefined) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }
  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS')
    res.status(405).end()
    return
  }
  if (req.query.view !== undefined && req.query.view !== 'dashboard') {
    if (req.method === 'HEAD') res.status(400).end()
    else res.status(400).json({ error: 'Invalid view' })
    return
  }
  try {
    const snapshot = await getDashboardSnapshot(env)
    if (req.query.view === 'dashboard') {
      if (req.method === 'HEAD') res.status(200).end()
      else res.status(200).json(snapshot)
      return
    }
    const state = new CompactedMonitorStateWrapper(snapshot.compactedStateStr)
    if (!state.data.lastUpdate) {
      if (req.method === 'HEAD') res.status(500).end()
      else res.status(500).json({ error: 'No data available' })
      return
    }
    const monitors: Record<string, { up: boolean | null; latency: number | null; location: string | null; message: string }> = {}
    for (const monitor of workerConfig.monitors) {
      const incidents = state.incidentLen(monitor.id)
      const latencies = state.latencyLen(monitor.id)
      if (!incidents || !latencies) {
        monitors[monitor.id] = { up: null, latency: null, location: null, message: 'No data available' }
        continue
      }
      const incident = state.getIncident(monitor.id, incidents - 1)
      const latency = state.getLastLatency(monitor.id)
      const up = incident.end !== null
      monitors[monitor.id] = { up, latency: latency.ping, location: latency.loc, message: up ? 'OK' : (incident.error.at(-1) ?? '') }
    }
    if (req.method === 'HEAD') res.status(200).end()
    else res.status(200).json({ up: state.data.overallUp, down: state.data.overallDown, updatedAt: state.data.lastUpdate, monitors, maintenances })
  } catch {
    if (req.method === 'HEAD') res.status(500).end()
    else res.status(500).json({ error: 'Unable to read monitor state' })
  }
}
