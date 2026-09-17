Autopilot: true
Claimed-at: 2026-09-17T04:07:08.474Z
# 09 - CI 完整化：构建 + 类型 + 双套测试 + artifact

**构建什么.** CI 完整化：每次推送依次跑依赖安装、类型检查、Vitest、WXT 双构建、zip artifact 上传、Firefox 扩展内契约套件；GitHub Actions 升 v4、Node 24。CI 与本地跑同一条命令；故意失败用例必须使 CI 变红（退出码契约在 CI 生效）。

**阻塞于.** 05, 06, 07, 08

**状态.** resolved

- [ ] CI 一次推送跑齐：install → 类型检查 → Vitest → 双构建 → Firefox 扩展内套件
- [ ] 产物 zip 上传 artifact
- [ ] 故意失败用例使 CI 红（退出码契约在 CI 生效）
- [ ] GitHub Actions v4 + Node 24 无退役版本
