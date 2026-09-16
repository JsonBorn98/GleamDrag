Autopilot: true
Claimed-at: 2026-09-16T12:22:04.404Z
# 03 - Windows 本机基线：旧链路可跑 + 真实 Firefox 绿色基线

**构建什么.** 让旧链路在本机 Windows 可跑：修进程启动（spawn 扩展名）、Firefox 可执行路径探测（不硬编码 developer edition）、绕开 make 依赖；然后在迁移前用本机真实 Firefox 跑完整套件拿到绿色基线（两次绿的前一次）。此基线是后续 WXT 迁移后同套件再绿一次的对照，也是删除旧链路的前提。范围：只做迁移前的过渡修复，随旧脚本一起删除不带入新链路。

**阻塞于.** 01

**状态.** claimed

- [x] Windows 本机无需 make 即可跑构建与测试命令（`node scripts/cli.mjs build|test`；GNU `date`/`npx rollup` 换进程内取值，`spawn("pnpm")` 换 node 直跑 web-ext bin，绕开 make 与 pnpm 11 ignored-builds 退出码劫持）
- [x] 自动探测本机可用 Firefox 变体（不硬编码 developer edition；`detectFirefoxBinary`：`GLEAMDRAG_FIREFOX_BIN` 覆盖 → LOCALAPPDATA → Program Files 两处；正斜杠路径规避 fx-runner shell-quote 吞反斜杠）
- [x] 本机真实 Firefox 跑完整套件全绿（Firefox 156 stable，43/43 两次连绿，exit 0；途中修掉三个真实断点：`__ENV` 键 `websocketServer` vs 读取 `webSocketServer` 大小写不匹配〔上游 a9d95aa 只改 .d.ts〕、commander `--no-browser` 显式默认值 false 把真浏览器路径整个关掉、`test_helper.ts` 的 `tab:{}` 使 Firefox 156 对 `tabs.sendMessage(undefined)` 同步抛错）
- [x] 故意失败用例在本机命令路径非零退出（真实 Firefox 路径：`--test-suite fixture` 构建期注入 → `openMocha ?suite=fixture` → 44/43/1，exit 1；票 01 移交项完成；`--no-browser` 合成流路径由 verify:exit-code 覆盖）
