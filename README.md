<div align="right">
  <a title="English" href="README.md"><img src="https://img.shields.io/badge/-English-A31F34?style=for-the-badge" alt="English" /></a>
  <a title="简体中文" href="README_zh-CN.md"><img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-545759?style=for-the-badge" alt="简体中文"></a>
</div>

# ✔[UptimeFlare](https://github.com/lyc8503/UptimeFlare)

A more advanced, serverless, and free uptime monitoring & status page solution, powered by Cloudflare Workers, complete with a user-friendly interface.

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

My status page (Online demo): https://uptimeflare.pages.dev/

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

For GitHub Actions deployment, set repository Actions secrets `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` before pushing to `main`. For manual Terraform apply, set `TF_VAR_TELEGRAM_BOT_TOKEN` and `TF_VAR_TELEGRAM_CHAT_ID` as protected environment variables (plus the existing Cloudflare credentials). The Worker receives them as `secret_text` bindings; do not put real values in `uptime.config.ts`, committed files, or command arguments. Terraform can retain sensitive values in its state: protect the state backend and access to it. Deploying without these variables will fail rather than silently disable alerts. A Telegram bot must exist and be allowed to message the chosen chat.

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
