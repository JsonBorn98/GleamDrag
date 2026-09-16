---
status: accepted
---

# 测试双栈：Vitest 跑纯逻辑，扩展内 Mocha 作契约测试

背景：现有 13 个测试文件全部在浏览器内经 WebSocket 跑 Mocha，cli.mjs:249 误读 result.failure（正确字段为 failures）使测试失败也退出 0，而 CI 从不跑测试——反馈不可信。决定：纯逻辑测试全量迁 Vitest（本地与 CI 快速反馈），依赖 webextension-polyfill/DOM 的留在扩展内 Mocha 契约套件；增加故意失败用例强制本地与 CI 双双非零退出；恢复被注释的 executor.test.ts 并只修不改变动作语义的小 bug（动作语义级修复留给后台重构）。为什么：评审 Top recommendation 指出必须先建立可信反馈再用它保护后台与拖拽重构；Playwright 仅支持 Chromium persistent context，故自动化验收用 Playwright Chromium + web-ext Firefox，Chrome/Edge stable 由本人手动装包验收。
