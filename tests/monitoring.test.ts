import { test, expect, mock, afterEach } from 'bun:test'
import { workerConfig } from '../uptime.config'
import { pageConfig } from '../page.config'
import { doMonitor } from '../worker/src/monitor'
import type { Env } from '../worker/src'

const originalFetch = globalThis.fetch
const originalLog = console.log
const originalError = console.error
afterEach(() => {
  globalThis.fetch = originalFetch
  console.log = originalLog
  console.error = originalError
})
const byId = (id: string) => workerConfig.monitors.find(m => m.id === id)!
const env = {
  BESZEL_ACCESS_CLIENT_ID: 'beszel-client-id', BESZEL_ACCESS_CLIENT_SECRET: 'beszel-client-secret',
  TELEGRAM_BOT_TOKEN: 'private-bot-token', TELEGRAM_CHAT_ID: 'private-chat',
} as Env

test('public auth guard requires the actual 401 body', async () => {
  globalThis.fetch = mock(async () => new Response('{"error":{"code":"AUTH_002"}}', { status: 401 })) as typeof fetch
  expect((await doMonitor(byId('omniroute_auth'), 'LOCAL', env)).status.up).toBe(true)
  globalThis.fetch = mock(async () => new Response('Cloudflare error page', { status: 401 })) as typeof fetch
  expect((await doMonitor(byId('omniroute_auth'), 'LOCAL', env)).status.up).toBe(false)
})

test('dashboard covers the production probes; generic 200 pages do not count as healthy', async () => {
  expect(Object.values(pageConfig.group!).flat().sort()).toEqual(workerConfig.monitors.map(({ id }) => id).sort())
  for (const [id, payload] of [
    ['omniroute_api', '{"ok":true}'],
    ['mc_hub_web', '<title>Minecraft Datapacks, Add-ons &amp; Mods | TDT</title>'],
    ['mc_hub_web_origin', '{"ok":true}'],
    ['mc_hub_api', '{"ok":true}'],
    ['mc_hub_posts', '{"items":[]}'],
    ['transactions', '<title>Thu ngân · SePay Store + payOS</title>'],
  ]) {
    globalThis.fetch = mock(async () => new Response(payload)) as typeof fetch
    expect((await doMonitor(byId(id), 'LOCAL', env)).status.up).toBe(true)
    globalThis.fetch = mock(async () => new Response('<title>Cloudflare error</title>')) as typeof fetch
    expect((await doMonitor(byId(id), 'LOCAL', env)).status.up).toBe(false)
  }
})

test('a slow response body cannot hold the scheduled probe open', async () => {
  globalThis.fetch = mock(async (_url, init) => new Response(new ReadableStream({
    start(controller) {
      const signal = init!.signal!
      signal.addEventListener('abort', () => controller.error(signal.reason), { once: true })
    },
  }))) as typeof fetch
  const result = await doMonitor({ ...byId('mc_hub_web'), timeout: 10 }, 'LOCAL', env)
  expect(result.status).toEqual({ up: false, ping: 10, err: 'Timeout after 10ms' })
})

test('Beszel health requires its own Access token and actual health response', async () => {
  const hub = byId('beszel_hub')
  const sent: string[] = []
  globalThis.fetch = mock(async (url, init) => {
    sent.push(String(url))
    expect(init?.redirect).toBe('manual')
    const headers = new Headers(init?.headers)
    expect(headers.get('CF-Access-Client-Id')).toBe(env.BESZEL_ACCESS_CLIENT_ID)
    expect(headers.get('CF-Access-Client-Secret')).toBe(env.BESZEL_ACCESS_CLIENT_SECRET)
    return new Response('{"code":200}', { status: 200 })
  }) as typeof fetch
  expect((await doMonitor(hub, 'LOCAL', env)).status.up).toBe(true)
  expect((await doMonitor(hub, 'LOCAL', { ...env, BESZEL_ACCESS_CLIENT_SECRET: '' })).status.up).toBe(false)
  for (const invalid of [
    { ...hub, target: 'https://other.example/api/health' },
    { ...hub, target: hub.target + '?redirect=1' },
    { ...hub, checkProxy: 'worker://weur' as const },
    { ...hub, headers: {} },
  ]) {
    expect((await doMonitor(invalid, 'LOCAL', env)).status.up).toBe(false)
  }
  expect(sent).toEqual([hub.target])
  globalThis.fetch = mock(async () => new Response('Access login', { status: 302 })) as typeof fetch
  expect((await doMonitor(hub, 'LOCAL', env)).status.up).toBe(false)
  globalThis.fetch = mock(async () => new Response('login', { status: 200 })) as typeof fetch
  expect((await doMonitor(hub, 'LOCAL', env)).status.up).toBe(false)
})

test('protected fetch failures cannot expose exception strings', async () => {
  const logs: string[] = []
  console.log = mock((...args) => logs.push(args.join(' ')))
  globalThis.fetch = mock(async () => { throw new Error(env.BESZEL_ACCESS_CLIENT_SECRET) }) as typeof fetch
  const result = await doMonitor(byId('beszel_hub'), 'LOCAL', env)
  expect(result.status.up).toBe(false)
  expect(JSON.stringify(result) + logs.join(' ')).not.toContain(env.BESZEL_ACCESS_CLIENT_SECRET)
})

test('Telegram sends only the first DOWN and reports HTTP errors without token', async () => {
  const calls: Array<[string, RequestInit]> = []
  const errors: string[] = []
  console.error = mock((...args) => errors.push(args.join(' ')))
  globalThis.fetch = mock(async (url, init) => {
    calls.push([String(url), init!])
    return new Response('private-bot-token', { status: 503 })
  }) as typeof fetch
  const notify = workerConfig.callbacks!.onStatusChange!
  const monitor = byId('beszel_hub')
  await notify(env, monitor, false, 100, 100, 'Protected check failed')
  await notify(env, monitor, false, 100, 160, 'still down')
  await notify(env, monitor, true, 100, 200, 'OK')
  expect(calls).toHaveLength(1)
  expect(calls[0][0]).toBe('https://api.telegram.org/botprivate-bot-token/sendMessage')
  expect(String(calls[0][1].body)).toContain('chat_id=private-chat')
  expect(String(calls[0][1].body)).toContain('Beszel+Hub+is+down')
  expect(errors).toEqual(['Telegram notification failed: HTTP 503'])
})
