import { test, expect, mock, afterEach } from 'bun:test'
import { workerConfig, pageConfig } from '../uptime.config'
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
  CF_ACCESS_CLIENT_ID: 'private-client-id', CF_ACCESS_CLIENT_SECRET: 'private-client-secret',
  TELEGRAM_BOT_TOKEN: 'private-bot-token', TELEGRAM_CHAT_ID: 'private-chat',
} as Env

test('four independent 9router checks and all five production monitors remain', () => {
  expect(pageConfig.group?.['9router']).toEqual(['nine_router_api', 'nine_router_auth', 'nine_router_admin', 'nine_router_storage'])
  expect(workerConfig.monitors.map(m => m.id)).toEqual([
    'nine_router_api', 'nine_router_auth', 'nine_router_admin', 'nine_router_storage',
    'transactions', 'beszel_hub', 'beszel_main_live', 'beszel_main_systems',
  ])
})

test('public auth guard requires the actual 401 body', async () => {
  globalThis.fetch = mock(async () => new Response('API key required for remote API access', { status: 401 })) as typeof fetch
  expect((await doMonitor(byId('nine_router_auth'), 'LOCAL', env)).status.up).toBe(true)
  globalThis.fetch = mock(async () => new Response('Cloudflare error page', { status: 401 })) as typeof fetch
  expect((await doMonitor(byId('nine_router_auth'), 'LOCAL', env)).status.up).toBe(false)
})

test('protected dashboard rejects redirects and missing marker; never logs response or secrets', async () => {
  const logs: string[] = []
  console.log = mock((...args) => logs.push(args.join(' ')))
  globalThis.fetch = mock(async (_url, init) => {
    expect(init?.redirect).toBe('manual')
    return new Response('secret-html', { status: 302 })
  }) as typeof fetch
  expect((await doMonitor(byId('nine_router_admin'), 'LOCAL', env)).status.up).toBe(false)
  globalThis.fetch = mock(async () => new Response('private-html', { status: 200 })) as typeof fetch
  expect((await doMonitor(byId('nine_router_admin'), 'LOCAL', env)).status.up).toBe(false)
  expect(logs.join(' ')).not.toContain('private-html')
  expect(logs.join(' ')).not.toContain('secret-html')
  expect(logs.join(' ')).not.toContain(env.CF_ACCESS_CLIENT_SECRET)
})

test('protected credentials only reach exact admin HTTPS targets, never proxy or config', async () => {
  const sent: string[] = []
  globalThis.fetch = mock(async (url, init) => {
    sent.push(String(url))
    expect(new Headers(init?.headers).get('CF-Access-Client-Secret')).toBe(env.CF_ACCESS_CLIENT_SECRET)
    expect(init?.redirect).toBe('manual')
    return new Response('data-monitor="9router-dashboard"', { status: 200 })
  }) as typeof fetch
  const admin = byId('nine_router_admin')
  expect((await doMonitor(admin, 'LOCAL', env)).status.up).toBe(true)
  expect(sent).toEqual([admin.target])
  expect(admin.headers).toBeUndefined()
  for (const invalid of [
    { ...admin, checkProxy: 'worker://somewhere' },
    { ...admin, target: 'http://9router-admin.tuannguyenviet.site/dashboard' },
    { ...admin, target: 'https://other.example/dashboard' },
    { ...admin, target: admin.target + '?redirect=1' },
  ]) {
    expect((await doMonitor(invalid, 'LOCAL', env)).status.up).toBe(false)
  }
  expect((await doMonitor(admin, 'LOCAL', { ...env, CF_ACCESS_CLIENT_SECRET: '' })).status.up).toBe(false)
  expect(sent).toEqual([admin.target])
})

test('protected fetch failures cannot expose exception strings', async () => {
  const logs: string[] = []
  console.log = mock((...args) => logs.push(args.join(' ')))
  globalThis.fetch = mock(async () => { throw new Error('private-client-secret') }) as typeof fetch
  const result = await doMonitor(byId('nine_router_storage'), 'LOCAL', env)
  expect(result.status.up).toBe(false)
  expect(JSON.stringify(result) + logs.join(' ')).not.toContain('private-client-secret')
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
  const monitor = byId('nine_router_storage')
  await notify(env, monitor, false, 100, 100, 'Protected check failed')
  await notify(env, monitor, false, 100, 160, 'still down')
  await notify(env, monitor, true, 100, 200, 'OK')
  expect(calls).toHaveLength(1)
  expect(calls[0][0]).toBe('https://api.telegram.org/botprivate-bot-token/sendMessage')
  expect(String(calls[0][1].body)).toContain('chat_id=private-chat')
  expect(String(calls[0][1].body)).toContain('9router+SQLite+is+down')
  expect(errors).toEqual(['Telegram notification failed: HTTP 503'])
})
