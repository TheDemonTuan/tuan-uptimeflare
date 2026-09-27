import assert from 'node:assert/strict'
import { workerConfig } from '../uptime.config'

async function main() {
  const monitor = workerConfig.monitors.find((item) => item.id === 'nine_router_api')
  assert(monitor)

  const onStatusChange = workerConfig.callbacks?.onStatusChange
  assert(onStatusChange)
  const env = { TELEGRAM_BOT_TOKEN: 'test-token', TELEGRAM_CHAT_ID: 'test-chat' } as Parameters<typeof onStatusChange>[0]
  const originalFetch = globalThis.fetch
  const calls: { url: string; body: string }[] = []
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), body: String(init?.body) })
    return new Response('{"ok":true}', { status: 200 })
  }
  try {
    await onStatusChange(env, monitor, false, 100, 100, 'HTTP 503')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, 'https://api.telegram.org/bottest-token/sendMessage')
    assert.equal(new URLSearchParams(calls[0].body).get('chat_id'), 'test-chat')
    assert.match(new URLSearchParams(calls[0].body).get('text')!, /9router API.*HTTP 503/)
    await onStatusChange(env, monitor, false, 100, 160, 'HTTP 502')
    await onStatusChange(env, monitor, true, 100, 220, 'OK')
    assert.equal(calls.length, 1)

    const loggedErrors: string[] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => { loggedErrors.push(args.join(' ')) }
    try {
      globalThis.fetch = async () => new Response('{"ok":false}', { status: 403 })
      await onStatusChange(env, monitor, false, 300, 300, 'HTTP 503')
      assert(loggedErrors.some((msg) => msg.includes('Telegram notification failed: HTTP 403')))
    } finally {
      console.error = originalError
    }
    await assert.rejects(onStatusChange({} as typeof env, monitor, false, 400, 400, 'HTTP 503'), /Telegram Worker secrets are missing/)
  } finally {
    globalThis.fetch = originalFetch
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
