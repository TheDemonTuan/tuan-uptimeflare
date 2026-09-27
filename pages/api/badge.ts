import type { NextApiRequest, NextApiResponse } from 'next'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { CompactedMonitorStateWrapper, getFromStore } from '@/worker/src/store'
import { workerConfig } from '@/uptime.config'
import { privateNoStore, requireBasicAuth } from '@/server/auth'

type BadgePayload = {
  schemaVersion: 1
  label: string
  message: string
  color: string
  isError?: boolean
}

function errorBadge(label: string, message: string): BadgePayload {
  return { schemaVersion: 1, label, message, color: 'lightgrey', isError: true }
}

const first = (value: string | string[] | undefined): string | undefined => Array.isArray(value) ? value[0] : value

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  res.setHeader('Cache-Control', privateNoStore)
  const { env } = await getCloudflareContext({ async: true })
  if (!requireBasicAuth(req, res, env.STATUS_PAGE_AUTH)) return
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    res.status(405).end()
    return
  }
  const id = first(req.query.id)
  const label = first(req.query.label) ?? id ?? 'UptimeFlare'
  const send = (status: number, payload: BadgePayload) => {
    if (req.method === 'HEAD') res.status(status).end()
    else res.status(status).json(payload)
  }
  if (!id) { send(400, errorBadge(label, 'no-monitor')); return }
  if (!workerConfig.monitors.some((monitor) => monitor.id === id)) {
    send(404, errorBadge(label, 'monitor-not-found'))
    return
  }
  try {
    const state = new CompactedMonitorStateWrapper(await getFromStore(env, 'state'))
    const count = state.incidentLen(id)
    if (!count) { send(503, errorBadge(label, 'no-data')); return }
    const isUp = state.getIncident(id, count - 1).end !== null
    send(200, {
      schemaVersion: 1, label,
      message: isUp ? first(req.query.up) ?? 'UP' : first(req.query.down) ?? 'DOWN',
      color: isUp ? first(req.query.colorUp) ?? 'brightgreen' : first(req.query.colorDown) ?? 'red',
    })
  } catch {
    send(500, errorBadge('status', 'error'))
  }
}
