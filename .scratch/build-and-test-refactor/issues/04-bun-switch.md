# 04 - Bun 一次性切换：lockfile + CI + 仓库指南

**构建什么.** 包管理器一次性切换：删除 pnpm lockfile、生成 Bun lockfile；CI 安装步骤切 Bun 并把 GitHub Actions 升 v4、Node 24；仓库指南同批改齐。切换后旧构建链路在 Bun 下产物等价、CI 全绿。依据 ADR 0001：不保留本地一套 CI 另一套的不一致。

**阻塞于.** 03

**状态.** ready-for-agent

- [ ] bun.lock 存在且 pnpm-lock 已删除
- [ ] CI 用 Bun 安装依赖，actions 升 v4、Node 24
- [ ] 仓库指南与实际包管理器一致
- [ ] 旧构建链路在 Bun 下双产物等价、CI 全绿
