import { timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

export const privateNoStore = 'private, no-store, max-age=0, must-revalidate'

export function requireBasicAuth(req: IncomingMessage, res: ServerResponse, credential: string | undefined): boolean {
  res.setHeader('Cache-Control', privateNoStore)
  if (credential === undefined) return true

  const colon = credential.indexOf(':')
  if (colon < 1 || colon === credential.length - 1 || /[\r\n]/.test(credential)) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ error: 'Invalid authentication configuration' }))
    return false
  }

  const expected = Buffer.from(`Basic ${Buffer.from(credential, 'utf8').toString('base64')}`)
  const actual = Buffer.from(req.headers.authorization ?? '')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    res.statusCode = 401
    res.setHeader('WWW-Authenticate', 'Basic realm="UptimeFlare", charset="UTF-8"')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ code: 401, message: 'Not authenticated' }))
    return false
  }
  return true
}
