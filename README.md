<div align="right">
  <a title="English" href="README.md"><img src="https://img.shields.io/badge/-English-A31F34?style=for-the-badge" alt="English" /></a>
  <a title="简体中文" href="README_zh-CN.md"><img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-545759?style=for-the-badge" alt="简体中文"></a>
</div>

# ✔[UptimeFlare](https://github.com/lyc8503/UptimeFlare)

A more advanced, serverless, and free uptime monitoring & status page solution, powered by Cloudflare Workers, complete with a user-friendly interface.

Production status page: https://status.tuannguyenviet.site

## Production monitoring (this fork)

`.github/workflows/deploy.yml` verifies and builds this source repository without Cloudflare credentials. It publishes `cloudflare-uptimeflare-<source-sha>` for the existing central `TheDemonTuan/vps-deploy` convention. Only the central production job uploads and deploys versions of `uptimeflare_worker` and `uptimeflare-web`. The existing every-minute Cron, `RemoteChecker` namespace, D1 database `431a0d2e-6413-4e80-9d27-1ee933f14f05`, DNS and `status.tuannguyenviet.site` remain in place; ordinary releases never initialize, migrate or restore the database. The Beszel repository owns only Hub/Agent; it does not deploy this fork.

- **OmniRoute:** public `/api/health` confirms liveness; unauthenticated `/v1/models` must return OmniRoute's `401 AUTH_002`. Neither probe tests provider inference or SQLite readiness. The Access-protected admin is email-only; its login redirect is not an admin health check.
- **MC Hub:** the canonical homepage must serve the expected HTML; `/healthz` also checks the uncached web origin. The API's `/healthz` pings SQLite, and `/api/posts?limit=1` checks a read-only public content route.
- **ACB Transactions:** checks the public viewer's HTML. This is not a bank ingestion, settlement or webhook test. Gateway readiness is private and is not exposed for monitoring.
- **Fleet monitor:** one Grafana `/api/health` request per minute to `monitor.thedemontuan.dev` (the vps-deploy `platform/monitor` hub that replaced Beszel) through Cloudflare Access. The exact endpoint receives only the dedicated `uptimeflare-beszel-hub` service token, and redirects are never followed. Keep `UPTIMEFLARE_BESZEL_ACCESS_CLIENT_ID` and `UPTIMEFLARE_BESZEL_ACCESS_CLIENT_SECRET` in `TheDemonTuan/vps-deploy` for rotation before 2027-09-27; the binding names predate the move from Beszel. The old 9router credentials are unused by new source releases; the central live binding inventory is retained for rollback.

Source CI runs `npm ci` in the root and `worker`, typecheck, lint, the existing dashboard/Telegram checks, monitoring tests, and release-packaging tests. It compiles the monitoring Worker with Wrangler dry-run, builds OpenNext once, and compiles its server modules with Wrangler dry-run. The immutable artifact contains `worker/dist/index.js` and auxiliary compiled modules, `web/dist/worker.js` and auxiliary compiled OpenNext modules, `.open-next/assets/`, `__release`, `manifest.json` (`app`, `source_repository`, `source_sha`) and exhaustive `SHA256SUMS` excluding itself. Source maps, source/configuration files, `.env` files and symlinks are excluded or rejected. Retention is 30 days; deployment policy and runtime secrets are not artifact inputs.

Before an artifact can be uploaded, both PR CI and the release workflow run `npm run check:runtime -- <packaged-release-root>`. This executes the packaged `web/dist/worker.js` in local workerd through the pinned Miniflare runtime, with isolated D1 and the packaged assets; it checks empty and healthy server-rendered `/` and `/incidents`, the dashboard and summary APIs, and an actual asset. It needs no Cloudflare credentials and never connects to production D1. A Wrangler dry-run alone only compiles the code and cannot catch request-time manifest failures. Next.js 16.4 requires OpenNext Cloudflare 1.20.13 here: 1.20.6 omitted `server/preview-props.json` from its manifest inliner and threw `Unexpected loadManifest(/.next/server/preview-props.json) call!` on requests. Keep the adapter and its Wrangler peer dependencies compatible when updating Next.js.

Central publishing uses fixed trusted configs and wrappers with [`versions upload --no-bundle --keep-vars`](https://developers.cloudflare.com/workers/wrangler/commands/workers/). Wrangler preserves existing secret bindings without rewriting their values; the adapter verifies all six monitoring binding names/types before and after upload. It never runs source npm scripts, OpenNext configuration, Terraform or artifact-supplied Wrangler configuration in the credentialed job. Public smoke checks use `https://status.tuannguyenviet.site`, D1-backed `/api/data`, real OpenNext entry assets, `/__release` and `/__monitor_release` (the latter reads the monitoring Worker through a fixed service binding). Those release endpoints expose only a commit SHA, not monitoring data or credentials.

Rollback selects both exact UUIDs: central adapter `python cloudflare/uptimeflare.py --root <checked-artifact-root> --sha <expected-sha> --mode rollback --version-id <web-uuid> --monitor-version-id <monitor-uuid> --summary <json>`. Both versions must belong to the fixed Workers and carry the expected source SHA. A failed publication restores only the candidate versions if deployment ownership has not drifted; it never restores D1 data or changes Cron/DO/DNS. For the first migration from untagged existing versions, automatic recovery verifies exact prior API version IDs and HTTP availability and explicitly reports the old SHA as unverified. `bun test tests/monitoring.test.ts` requires no production secrets.


📢 **[[SECURITY ADVISORY](https://github.com/lyc8503/UptimeFlare/security/advisories/GHSA-36q9-v7p3-vj6v) 2026/03/04]** A vulnerability (CVE-2026-29779) that could expose monitor configuration and credentials in `uptime.config.ts` to clients was fixed. Versions between 2025-09-21 (from commit `41257c6`) and 2026-03-04 are affected. **Affected users are strongly advised to upgrade to the latest version.**

🎉 **[UPDATE 2026/01/03]** I have just migrated UptimeFlare from KV to D1 Database. I also updated the Terraform Cloudflare provider to v5 and improved the deployment process. The data structure has been optimized to resolve long-standing performance issues.

New users can deploy directly, while existing users can have a simple auto migration process (upgrade docs below)! Feel free to open an issue if you run into any trouble deploying.

## ⭐Features

- Open-source, easy to deploy (in under 10 minutes, no local tools required), and free
- Monitoring capabilities
  - Up to 50 checks at 1-minute intervals
  - Geo-specific checks from over [310 cities](https://www.cloudflare.com/network/) worldwide
  - Support for HTTP/HTTPS/TCP port monitoring
  - Up to 90-day uptime history and uptime percentage tracking
  - Customizable request methods, headers, and body for HTTP(s)
  - Custom status code & keyword checks for HTTP(s)
  - Downtime notification supporting [100+ notification channels](https://github.com/caronc/apprise/wiki)
  - Customizable Webhook
- Multi-language support (Tiếng Việt, English, Deutsch, Français, 简体中文, 繁體中文)
- Status page
  - Server-side rendering on Cloudflare Workers via OpenNext
  - Interactive 12-hour response time chart and accessible table
  - 90-day daily uptime history with DST-aware boundaries
  - Scheduled maintenance alerts and monthly incident history
  - System, light, and dark appearance
  - Optional HTTP Basic authentication via `STATUS_PAGE_AUTH`
  - Realtime summary and snapshot JSON APIs

## 👀Demo

My status page (Online demo): https://status.tuannguyenviet.site/

Some screenshots:

![Desktop, Light theme](docs/desktop.png)

## ⚡Quickstart / 📄Documentation

Please refer to [Wiki](https://github.com/lyc8503/UptimeFlare/wiki)

## 🚀 Deployment architecture

UptimeFlare deploys as two decoupled Cloudflare Workers sharing a single D1 database:
- **Monitoring Worker (`uptimeflare_worker`)**: runs every minute via cron, executes probes, records 12-hour latency and 90-day incidents in D1 `uptimeflare_d1`, and triggers first-failure Telegram notifications.
- **Status Page Worker (`uptimeflare-web`)**: Next.js 16 (Pages Router) running on Cloudflare Workers with `@opennextjs/cloudflare`.

### Web Authentication

To protect the status page and its APIs, set the secret variable `STATUS_PAGE_AUTH` on the web Worker:
```sh
npx wrangler secret put STATUS_PAGE_AUTH
```
Enter credentials in `username:password` format. Omit the secret for a public status page.
### Telegram downtime alerts for this deployment

Each monitor sends a Telegram message when a new DOWN incident starts. Recovery and changes to the reason for an already-open incident do not send messages.

For rotation, keep `UPTIMEFLARE_TELEGRAM_BOT_TOKEN` and `UPTIMEFLARE_TELEGRAM_CHAT_ID` in central `TheDemonTuan/vps-deploy` secrets. Ordinary version uploads retain the existing `secret_text` bindings without reading or rewriting values. Do not put values in `uptime.config.ts`, source-repository secrets, artifacts, committed files or command arguments. Missing live bindings fail publication rather than silently disabling alerts. A Telegram bot must exist and be allowed to message the chosen chat.

## ⚙️Docs for developer

To contribute new features or customize your deployment furthermore, see [here](https://github.com/lyc8503/UptimeFlare/wiki/How-to-develop).

## New features (TODOs)

- [x] Specify region for monitors
- [x] TCP `opened` promise
- [x] Use apprise to support various notification channels
- [x] ~~Telegram example~~
- [x] ~~[Bark](https://bark.day.app) example~~
- [x] ~~Email notification via Cloudflare Email Workers~~
- [x] Improve docs by providing simple examples
- [x] Notification grace period
- [ ] SSL certificate checks
- [x] ~~Self-host Dockerfile~~
- [x] Incident history
- [x] Improve `checkLocationWorkerRoute` and fix possible `proxy failed`
- [x] Groups
- [x] Remove old incidents
- [x] ~~Known issue~~: `fetch` doesn't support non-standard port (resolved after CF update)
- [x] Compatibility date update
- [x] Scheduled Maintenance
- [x] Add docs for dev
- [x] Migration to Terraform Cloudflare provider version 5.x
- [x] Cloudflare D1 database
- [x] Scheduled maintenances (via IIFE)
- [x] Simpler config example
- [x] Upcoming maintenances
- [x] Universal Webhook upgrade
- [x] i18n...? (maybe)
- [ ] ICMP via proxy?
- [x] Add default UA
- [x] Customizable footer
- [x] New header logo
- [x] Improve CPU time usage
- [x] Local deployment (docs WIP)
