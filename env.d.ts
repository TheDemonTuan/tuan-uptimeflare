declare global {
  interface CloudflareEnv {
    UPTIMEFLARE_D1: D1Database
    ASSETS: Fetcher
    WORKER_SELF_REFERENCE: Fetcher
    STATUS_PAGE_AUTH?: string
  }
}

export {}
