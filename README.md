<div align="right">
  <a title="English" href="README.md"><img src="https://img.shields.io/badge/-English-A31F34?style=for-the-badge" alt="English" /></a>
  <a title="简体中文" href="README_zh-CN.md"><img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-545759?style=for-the-badge" alt="简体中文"></a>
</div>

# ✔[UptimeFlare](https://github.com/lyc8503/UptimeFlare)

A more advanced, serverless, and free uptime monitoring & status page solution, powered by Cloudflare Workers, complete with a user-friendly interface.

Production status page: https://status.tuannguyenviet.site

## Production monitoring (this fork)

This repository alone deploys the status Pages site, minute-interval Worker cron, D1 state, and `status.tuannguyenviet.site` DNS through `.github/workflows/deploy.yml`. Beszel owns only Hub/Agent and the producer for `/status/beszel-main/live` and `/status/beszel-main/systems`; it does not deploy this fork.

The `9router` group has four distinct checks: API `/api/health` (liveness), unauthenticated `/v1/models` (401 API-key guard), admin `/dashboard` (verified Access token and dashboard marker), and `/api/monitor/ready` (SQLite settings table availability). The last check does not validate database integrity or AI providers. Transactions remain independent. Beszel Hub checks the public `/status/beszel-main/live` heartbeat (stale after 150 seconds); Beszel Systems checks `/status/beszel-main/systems`. The dashboard and its `/api/health` endpoint require Cloudflare Access and must not be used by unauthenticated monitors.

Before merging a monitoring PR, configure a **Service Auth** policy restricted to `9router-admin.tuannguyenviet.site` in Cloudflare Access. Give this application a dedicated service token. Set `CLOUDFLARE_ACCESS_TEAM_NAME` and the actual admin application `CLOUDFLARE_ACCESS_AUD` on the 9router VPS, then deploy 9router and verify authenticated dashboard HTML plus readiness JSON externally. The API hostname remains outside Access. Store the token ID/secret only as GitHub Actions secrets `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` in this fork. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` as two further Actions secrets before deployment. Rotate any previously exposed token instead of reusing it. A DOWN transition sends one Telegram message; recovery and subsequent DOWN reason changes do not send messages. CI rejects missing credentials before Terraform apply.

Terraform `sensitive` hides printed values but **does not encrypt Terraform state**. Actions use ephemeral state without uploading it. For manual apply, use an access-controlled encrypted remote backend; never commit `*.tfstate`, `*.tfvars`, Access tokens, or Telegram credentials. Keep the existing Cloudflare API token/account ID Actions secrets and D1 ID (`UPTIMEFLARE_D1_ID` repository variable, or workflow discovery). `bun test tests/monitoring.test.ts` tests checks and alerts locally without production tokens.


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
  - Multi-language support (English/Chinese)
- Status page
  - Interactive ping (response time) chart for all types of monitors
  - Scheduled maintenances alerts & Incident history page
  - Responsive UI that adapts to your system theme
  - Customizable status page
  - Use your own domain with CNAME
  - Optional password authentication (private status page)
  - JSON API for fetching realtime status data

## 👀Demo

My status page (Online demo): https://status.tuannguyenviet.site/

Some screenshots:

![Desktop, Light theme](docs/desktop.png)

## ⚡Quickstart / 📄Documentation

Please refer to [Wiki](https://github.com/lyc8503/UptimeFlare/wiki)

## 🚀Upgrade existing deployments

Get the latest features right away with [simple upgrade process](https://github.com/lyc8503/UptimeFlare/wiki/Synchronize-updates-from-upstream)

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
