import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { workerConfig } from './uptime.config'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  if (host.toLowerCase().endsWith('.pages.dev')) {
    const url = request.nextUrl.clone()
    url.host = 'status.tuannguyenviet.site'
    url.port = ''
    url.protocol = 'https'
    return NextResponse.redirect(url, 301)
  }

  const passwordProtection = workerConfig.passwordProtection
  if (passwordProtection) {
    const authHeader = request.headers.get('Authorization')
    let authenticated = false
    const expected = 'Basic ' + btoa(passwordProtection)

    if (authHeader && authHeader.length === expected.length) {
      // a simple timing-safe compare
      authenticated = true
      for (let i = 0; i < authHeader.length; i++) {
        if (authHeader[i] !== expected[i]) authenticated = false
      }
    }

    if (!authenticated) {
      return NextResponse.json(
        { code: 401, message: 'Not authenticated' },
        { status: 401, headers: { 'WWW-Authenticate': 'Basic' } }
      )
    }
  }
}
