---
status: accepted
---

# 构建工具链迁移至 WXT + Vite 并一次性切换 Bun

背景：手写 Makefile/rollup 编排把 Windows spawn、GNU date、包管理器差异暴露给每个调用方，本机甚至没有 make 和 Firefox Developer Edition，且测试退出码 bug 让 CI 假绿。决定：用 WXT 显式生成 Firefox/Chromium 双 MV3 产物 + Vite 替代手写编排，同一批次把 pnpm lockfile/CI/AGENTS.md 一次性切到 Bun，双产物验证后删除旧构建脚本（Makefile + scripts/cli.mjs 等）；Svelte 5 只做最小兼容（保留 legacy 写法，不迁 runes），TypeScript strict 跟随 WXT 默认开启。为什么：依据架构评审 2026-09-16 Candidate 01 与技术选型表；WXT 0.21 要求 Node≥22/Bun≥1.2、@wxt-dev/module-svelte 要求 Svelte≥5，本机 Node 24/Bun 1.3.14 已满足，评审明确反对"只改本地命令保留 CI 不一致"与"两套构建长期并存"。
