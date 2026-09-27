<div align="right">
  <a title="English" href="README.md"><img src="https://img.shields.io/badge/-English-545759?style=for-the-badge" alt="English"></a>
  <a title="简体中文" href="README_zh-CN.md"><img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-A31F34?style=for-the-badge" alt="简体中文"></a>
</div>

# ✔[UptimeFlare](https://github.com/lyc8503/UptimeFlare)

一个由 Cloudflare Workers 驱动的功能丰富、Serverless 且免费的 Uptime 监控及状态页面。

## ⭐功能

- 开源，易于部署（全程无需本地工具，耗时不到 10 分钟），且完全免费
- 监控功能
  - 最多支持 50 个 1 分钟精度的检查
  - 支持指定全球 [310+ 个城市](https://www.cloudflare.com/network/) 的监控节点
  - 支持 HTTP/HTTPS/TCP 端口监控
  - 最多 90 天的 uptime 历史记录和 uptime 百分比跟踪
  - 可自定义的 HTTP(s) 请求方法、头和主体
  - 可自定义的 HTTP(s) 状态码和关键字检查
  - 支持 [100 多个通知渠道](https://github.com/caronc/apprise/wiki) 的宕机消息通知
  - 可自定义的 Webhook
- 多语言支持 (越南语、英语、德语、法语、简体中文、繁体中文)
- 状态页面
  - 基于 OpenNext 在 Cloudflare Workers 上实现 SSR
  - 交互式 12 小时响应时间图表及无障碍数据表格
  - 适配夏令时的 90 天每日可用率历史
  - 计划维护提示与每月故障历史页面
  - 响应式 UI，自适应系统/浅色/深色主题
  - 可选的 HTTP Basic 认证（通过 `STATUS_PAGE_AUTH` 密钥配置）
  - 实时状态与快照 JSON API

## 👀演示

我自己的状态页面（在线演示）：https://status.tuannguyenviet.site/

一些截图：

![桌面，浅色主题](docs/desktop.png)

## ⚡快速入门 / 📄文档

请参阅 [Wiki](https://github.com/lyc8503/UptimeFlare/wiki)
