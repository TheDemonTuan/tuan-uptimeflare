<div align="right">
  <a title="English" href="README.md"><img src="https://img.shields.io/badge/-English-A31F34?style=for-the-badge" alt="English" /></a>
  <a title="简体中文" href="README_zh-CN.md"><img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-545759?style=for-the-badge" alt="简体中文"></a>
</div>

# ✔[UptimeFlare](https://github.com/lyc8503/UptimeFlare)

A more advanced, serverless, and free uptime monitoring & status page solution, powered by Cloudflare Workers, complete with a user-friendly interface.

Production status page: https://status.tuannguyenviet.site

## Production monitoring (this fork)

`.github/workflows/deploy.yml` verifies and builds this source repository without Cloudflare credentials. It publishes `cloudflare-uptimeflare-<source-sha>` for the existing central `TheDemonTuan/vps-deploy` convention. Only the central production job uploads and deploys versions of `uptimeflare_worker` and `uptimeflare-web`. The existing every-minute Cron, `RemoteChecker` namespace, D1 database `431a0d2e-6413-4e80-9d27-1ee933f14f05`, DNS and `status.tuannguyenviet.site` remain in place; ordinary releases never initialize, migrate or restore the database. Beszel owns only Hub/Agent and the producer for `/status/beszel-main/live` and `/status/beszel-main/systems`; it does not deploy this fork.

The `9router` group has four distinct checks: API `/api/health` (liveness), unauthenticated `/v1/models` (401 API-key guard), admin `/dashboard` (verified Access token and dashboard marker), and `/api/monitor/ready` (SQLite settings table availability). The last check does not validate database integrity or AI providers. Transactions remain independent. Beszel Hub checks `/api/health` through Cloudflare Access using a dedicated service token; Beszel Systems checks the public `/status/beszel-main/systems` heartbeat. The dashboard remains protected by Email OTP.

Before merging a monitoring PR, configure a **Service Auth** policy restricted to `9router-admin.tuannguyenviet.site` in Cloudflare Access. Give this application a dedicated service token. Set `CLOUDFLARE_ACCESS_TEAM_NAME` and the actual admin application `CLOUDFLARE_ACCESS_AUD` on the 9router VPS, then deploy 9router and verify authenticated dashboard HTML plus readiness JSON externally. The API hostname remains outside Access. Store `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`, `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` only in the central `TheDemonTuan/vps-deploy` production secrets, not in this source repository. Rotate any previously exposed token instead of reusing it. A DOWN transition sends one Telegram message; recovery and subsequent DOWN reason changes do not send messages. Central publishing rejects missing monitoring secrets before a version upload.

Beszel Access app `beszel.tuannguyenviet.site` grants Service Auth only to service token `uptimeflare-beszel-hub`, separate from the 9router token. Central production secrets `BESZEL_ACCESS_CLIENT_ID` and `BESZEL_ACCESS_CLIENT_SECRET` retain their existing values as monitoring Worker bindings; rotate the token before it expires on 2027-09-27. `/api/health` remains protected from unauthenticated requests.

Source CI runs `npm ci` in the root and `worker`, typecheck, lint, the existing dashboard/Telegram checks, monitoring tests, and release-packaging tests. It compiles the monitoring Worker with Wrangler dry-run, builds OpenNext once, and compiles its server modules with Wrangler dry-run. The immutable artifact contains `worker/dist/index.js` and auxiliary compiled modules, `web/dist/worker.js` and auxiliary compiled OpenNext modules, `.open-next/assets/`, `__release`, `manifest.json` (`app`, `source_repository`, `source_sha`) and exhaustive `SHA256SUMS` excluding itself. Source maps, source/configuration files, `.env` files and symlinks are excluded or rejected. Retention is 30 days; deployment policy and runtime secrets are not artifact inputs.

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

The three existing monitors (9router API, ACB Transactions, Beszel Hub) send a Telegram message on their first failed check. The 9router check calls the public `/api/health` endpoint; `"ok":true` checks app liveness, not database readiness. Recovery and later error changes do not send Telegram messages.

For deployment, keep `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in central `TheDemonTuan/vps-deploy` production secrets, together with the four Access binding secrets and Cloudflare token/account ID. The monitoring Worker retains its existing `secret_text` bindings; ordinary version uploads do not read or rewrite their values. Do not put values in `uptime.config.ts`, source-repository secrets, artifacts, committed files or command arguments. Missing required live bindings fail publication rather than silently disabling alerts; secret rotation is an explicit central operator action. A Telegram bot must exist and be allowed to message the chosen chat.

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
