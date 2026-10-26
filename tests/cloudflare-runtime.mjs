import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Miniflare, convertV4MiniflareOptions, kCurrentWorker } from 'miniflare'

// Run the exact compiled release, not Next's development server or source mocks.
const root = resolve(process.argv[2] ?? '.')
const scriptPath = resolve(root, 'web/dist/worker.js')
const runtime = new Miniflare(convertV4MiniflareOptions({
  name: 'uptimeflare-web',
  modulesRoot: root,
  modules: [{ type: 'ESModule', path: scriptPath, contents: await readFile(scriptPath, 'utf8') }],
  compatibilityDate: '2026-09-27',
  compatibilityFlags: ['nodejs_compat', 'global_fetch_strictly_public'],
  cf: false,
  d1Databases: ['UPTIMEFLARE_D1'],
  serviceBindings: { WORKER_SELF_REFERENCE: kCurrentWorker },
  assets: {
    directory: resolve(root, '.open-next/assets'), binding: 'ASSETS',
    // Miniflare's asset router otherwise defaults to assets-only and returns
    // an empty 404 on misses without invoking the actual OpenNext worker.
    routerConfig: { has_user_worker: true },
  },
}))

async function request(path) {
  const response = await runtime.dispatchFetch(`https://status.example.test${path}`)
  const body = await response.text()
  assert.equal(response.status, 200, `${path}: ${body.slice(0, 1500)}`)
  return body
}

async function pages() {
  const home = await request('/')
  assert.match(home, /<html lang="vi"/)
  assert.match(home, /__NEXT_DATA__/)
  assert.match(await request('/incidents'), /__NEXT_DATA__/)
  return home
}

try {
  const database = await runtime.getD1Database('UPTIMEFLARE_D1')
  await database.exec('CREATE TABLE uptimeflare (key TEXT PRIMARY KEY, value TEXT)')
  await pages()
  const empty = JSON.parse(await request('/api/data?view=dashboard'))
  assert.equal(empty.compactedStateStr, null)
  assert(empty.monitors.length > 0)

  const now = Math.floor(Date.now() / 1000)
  const time = Buffer.alloc(4)
  time.writeUInt32LE(now - 30)
  const ping = Buffer.alloc(2)
  ping.writeUInt16LE(42)
  const state = JSON.stringify({
    lastUpdate: now - 30, overallUp: empty.monitors.length, overallDown: 0,
    incident: Object.fromEntries(empty.monitors.map(({ id }) => [id, { start: [[now - 3600]], end: [now - 3600], error: [['']] }])),
    latency: Object.fromEntries(empty.monitors.map(({ id }) => [id, { time: time.toString('hex'), ping: ping.toString('hex'), loc: { c: [1], v: ['SJC'] } }])),
  })
  await database.prepare('INSERT INTO uptimeflare (key, value) VALUES (?, ?)').bind('state', state).run()
  const home = await pages()
  assert(home.includes(empty.monitors[0].name))
  const snapshot = JSON.parse(await request('/api/data?view=dashboard'))
  assert.equal(snapshot.compactedStateStr, state)
  assert.deepEqual(snapshot.monitors, empty.monitors)
  assert.equal(JSON.parse(await request('/api/data')).up, empty.monitors.length)
  const favicon = await runtime.dispatchFetch('https://status.example.test/favicon.png')
  assert.equal(favicon.status, 200)
  assert.deepEqual(Buffer.from(await favicon.arrayBuffer()), await readFile(resolve(root, '.open-next/assets/favicon.png')))
  console.log('Packaged Cloudflare runtime passed: empty/healthy SSR, incidents, dashboard API, summary API, assets')
} finally {
  await runtime.dispose()
}
