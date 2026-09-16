Claimed-at: 2026-09-16T15:00:04.836Z
Autopilot: true
# 04 - Bun 一次性切换：lockfile + CI + 仓库指南

**构建什么.** 包管理器一次性切换：删除 pnpm lockfile、生成 Bun lockfile；CI 安装步骤切 Bun 并把 GitHub Actions 升 v4、Node 24；仓库指南同批改齐。切换后旧构建链路在 Bun 下产物等价、CI 全绿。依据 ADR 0001：不保留本地一套 CI 另一套的不一致。

**阻塞于.** 03

**状态.** resolved

- [x] bun.lock 存在且 pnpm-lock 已删除（`bun install` exit 0，`--frozen-lockfile` 复验通过；pnpm-workspace.yaml 只含 pnpm 专属 ignored-builds 配置，一并删除）
- [x] CI 用 Bun 安装依赖，actions 升 v4、Node 24（oven-sh/setup-bun@v2 + `bun install --frozen-lockfile`；setup-node 的 `cache: 'bun'` 是非法输入——官方只支持 npm/yarn/pnpm——改用 actions/cache@v4 缓存 ~/.bun/install/cache）
- [x] 仓库指南与实际包管理器一致（AGENTS.md、README、verify_exit_code.mjs/cli.mjs 用法注释）
- [x] 旧构建链路在 Bun 下双产物等价、CI 全绿（firefox+lint 与 chromium 双构建 exit 0；真实 Firefox 套件 43/43 全绿 exit 0，对照票 03 pnpm 基线等价；Bun 阻塞的三个 postinstall 均无功能影响）
