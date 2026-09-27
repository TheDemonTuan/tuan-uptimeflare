import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { CompactedMonitorStateWrapper } from '../worker/src/store'
import { workerConfig } from '../uptime.config'
import { getDashboardSnapshot } from '../server/status'
import { requireBasicAuth } from '../server/auth'
import { resolveLocale } from '../util/i18n'
import { formatDuration, getDailyUptime } from '../util/time'
import type { Env } from '../worker/src'

const ids = workerConfig.monitors.map(({ id }) => id)
const now = Math.floor(Date.now() / 1000)

function stateFor(scenario: string, current = now): string | null {
  if (scenario === 'empty') return null
  if (scenario === 'malformed') return '{"incident":42}'
  const wrapper = new CompactedMonitorStateWrapper(null)
  const monitored = scenario === 'mixed' ? ids.slice(0, 2) : ids
  for (const id of monitored) {
    wrapper.appendIncident(id, { start: [current - 172800], end: current - 172800, error: [''] })
    if (scenario === 'mixed' && id === ids[0]) wrapper.appendIncident(id, { start: [current - 120], end: null, error: ['HTTP 503'] })
    for (const [offset, ping] of [[120, 0], [90, 45], [30, 42]]) {
      wrapper.appendLatency(id, { time: current - offset, ping, loc: 'SJC' })
    }
  }
  wrapper.data.lastUpdate = current - 30
  wrapper.data.overallUp = scenario === 'mixed' ? 1 : 3
  wrapper.data.overallDown = scenario === 'mixed' ? 1 : 0
  return wrapper.getCompactedStateStr()
}

function seed(scenario: string) {
  const data = stateFor(scenario)
  mkdirSync('.tmp', { recursive: true })
  writeFileSync('.tmp/dashboard-seed.sql', data === null ? "DELETE FROM uptimeflare WHERE key='state';\n" :
    `INSERT INTO uptimeflare (key,value) VALUES ('state','${data.replaceAll("'", "''")}') ON CONFLICT(key) DO UPDATE SET value=excluded.value;\n`)
  console.log(`Seed ${scenario}: .tmp/dashboard-seed.sql`)
}

function auth(input: string | undefined, credential: string | undefined, method = 'GET') {
  const response = {
    statusCode: 200, headers: {} as Record<string, string>, body: '' as string | undefined,
    setHeader(key: string, value: string) { this.headers[key] = value },
    end(body?: string) { this.body = body },
  }
  const allowed = requireBasicAuth({ method, headers: { authorization: input } } as never, response as never, credential)
  return { allowed, ...response }
}

async function selfCheck() {
  assert.equal(auth(undefined, undefined).allowed, true)
  assert.equal(auth(undefined, 'u:pw').statusCode, 401)
  assert.equal(auth('Basic wrong', 'u:pw').statusCode, 401)
  assert.equal(auth('Basic ' + Buffer.from('tên:mật:khẩu').toString('base64'), 'tên:mật:khẩu').allowed, true)
  assert.equal(auth(undefined, '').statusCode, 503)
  assert.equal(auth(undefined, 'a:').statusCode, 503)
  assert.equal(auth(undefined, 'a:b\nc').statusCode, 503)
  assert.equal(auth(undefined, 'u:pw', 'HEAD').body, undefined)
  assert.equal(resolveLocale(), 'vi')
  assert.equal(resolveLocale('UPTIMEFLARE_LOCALE=en'), 'en')
  assert.equal(resolveLocale('UPTIMEFLARE_LOCALE=invalid'), 'vi')
  assert.equal(resolveLocale('UPTIMEFLARE_LOCALE=%GG'), 'vi')
  assert.match(formatDuration(0, 'vi'), /0/)
  assert.match(formatDuration(3661, 'en'), /1 hour.*1 minute.*1 second/)
  const wrapper = new CompactedMonitorStateWrapper(stateFor('mixed'))
  assert.equal(wrapper.incidentLen(ids[2]), 0)
  assert.deepEqual(wrapper.getLatencyRecords(ids[2]), [])
  assert.equal(wrapper.getLastLatency(ids[0]).ping, 42)
  assert.equal(wrapper.getLatencyRecords(ids[0])[0].ping, 0)
  assert.throws(() => new CompactedMonitorStateWrapper(stateFor('malformed')))
  const privateFields = ['sentinel-target', 'sentinel-header', 'sentinel-body', 'sentinel-proxy']
  const original = workerConfig.monitors[0]
  workerConfig.monitors[0] = { ...original, target: privateFields[0], headers: { Secret: privateFields[1] }, body: privateFields[2], checkProxy: privateFields[3] }
  try {
    const env = { UPTIMEFLARE_D1: { prepare: () => ({ bind: () => ({ first: async () => ({ value: stateFor('healthy') }) }) }) } } as unknown as Pick<Env, 'UPTIMEFLARE_D1'>
    const snapshot = await getDashboardSnapshot(env)
    assert.equal(snapshot.monitors.length, 3)
    for (const secret of privateFields) assert(!JSON.stringify(snapshot).includes(secret))
  } finally { workerConfig.monitors[0] = original }
  const start = Date.UTC(2026, 8, 26) / 1000
  assert.equal(getDailyUptime([], start + 1000, false).at(-1)?.monitoredSeconds, 0)
  const partial = getDailyUptime([{ start: [start + 100], end: start + 200, error: [''] }], start + 300, false).at(-1)
  assert.equal(partial?.monitoredSeconds, 200)
  assert.equal(partial?.downSeconds, 100)
  const open = getDailyUptime([{ start: [start + 100], end: null, error: ['HTTP 503'] }], start + 300, false).at(-1)
  assert.equal(open?.downSeconds, 200)
  const previousTZ = process.env.TZ
  try {
    process.env.TZ = 'America/New_York'
    assert.equal(getDailyUptime([{ start: [Date.UTC(2026, 0, 1) / 1000], end: Date.UTC(2026, 0, 1) / 1000, error: [''] }], Date.UTC(2026, 2, 9, 16) / 1000, true).at(-2)?.end! - getDailyUptime([], Date.UTC(2026, 2, 9, 16) / 1000, true).at(-2)?.start!, 82800)
    assert.equal(getDailyUptime([], Date.UTC(2026, 10, 2, 16) / 1000, true).at(-2)?.end! - getDailyUptime([], Date.UTC(2026, 10, 2, 16) / 1000, true).at(-2)?.start!, 90000)
  } finally { process.env.TZ = previousTZ }
  console.log('Dashboard boundary checks passed')
}

async function httpCheck(base: string, scenario: string, authenticated: boolean) {
  const credential = process.env.SMOKE_AUTH
  const headers: HeadersInit = authenticated && credential ? { Authorization: 'Basic ' + Buffer.from(credential).toString('base64') } : {}
  const request = (path: string, init: RequestInit = {}) => fetch(new URL(path, base), { ...init, headers })
  if (authenticated) {
    for (const path of ['/', '/incidents', '/api/data', '/api/data?view=dashboard', '/api/badge?id=' + ids[0]]) {
      const denied = await fetch(new URL(path, base))
      assert.equal(denied.status, 401, path)
    }
  }
  const home = await request('/')
  assert.equal(home.status, scenario === 'malformed' ? 503 : 200)
  const html = await home.text()
  if (scenario === 'healthy' || scenario === 'mixed') {
    assert(html.includes('9router API'))
    assert.match(html, /<html lang="vi"/)
  }
  const snapshotResponse = await request('/api/data?view=dashboard')
  assert.equal(snapshotResponse.status, scenario === 'malformed' ? 500 : 200)
  if (snapshotResponse.ok) {
    const snapshot = await snapshotResponse.json() as { monitors: unknown[]; compactedStateStr: string | null }
    assert.equal(snapshot.monitors.length, 3)
    assert.equal(snapshot.compactedStateStr === null, scenario === 'empty')
  }
  const summary = await request('/api/data')
  assert.equal(summary.status, scenario === 'empty' || scenario === 'malformed' ? 500 : 200)
  if (summary.ok) {
    const value = await summary.json() as { up: number; monitors: Record<string, { up: boolean | null }> }
    assert.equal(value.up, scenario === 'mixed' ? 1 : 3)
    assert.equal(value.monitors[ids[2]].up, scenario === 'mixed' ? null : true)
  }
  assert.equal((await request('/api/badge')).status, 400)
  assert.equal((await request('/api/badge?id=unknown')).status, 404)
  assert.equal((await request('/api/badge?id=' + ids[2])).status, scenario === 'mixed' || scenario === 'empty' ? 503 : scenario === 'malformed' ? 500 : 200)
  assert.equal((await request('/api/data', { method: 'POST' })).status, 405)
  assert.equal((await request('/api/data', { method: 'OPTIONS' })).status, authenticated ? 204 : 204)
  const head = await request('/api/data', { method: 'HEAD' })
  assert.equal(await head.text(), '')
  console.log(`HTTP ${scenario}${authenticated ? ' authenticated' : ''} passed`)
}

const args = process.argv.slice(2)
if (args[0] === '--seed') seed(args[1])
else if (args[0] === '--url') httpCheck(args[1], args[3] || 'healthy', args.includes('--auth')).catch((error) => { console.error(error); process.exitCode = 1 })
else selfCheck().catch((error) => { console.error(error); process.exitCode = 1 })
