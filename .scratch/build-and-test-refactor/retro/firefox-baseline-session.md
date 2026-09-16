# Retro: Firefox 真机基线会话（票 03）

会话：Windows 本机旧链路基线修复与测试（2026-09-16）。范围：环境复盘，不审代码（代码已过双轴审查+修复回审）。

## 过程画像

- 417 次工具调用；**64%（ops 85-352）耗在「cli.mjs 无子进程僵尸」的误诊上**，22 次 taskkill 大半在杀自己 4 分钟超时误杀留下的尸体。
- 真实因果链：`waitTestComplete` 无超时无看门狗 → Firefox 被误杀后 wss 永等 → 僵尸占 `::1:8000` → 下一个 run EADDRINUSE 秒死、日志 0 字节 → 「从未 spawn 过 web-ext」假象。根因（commander `--no-browser` 默认值 false）与假象（端口僵尸）是两层，被叠在一起看了 90 分钟。
- 戳穿假象的不是更多观察，是**最小复现**：11 行 `__cmd_probe.mjs` 直接打印 `args.browser = false`。观察手段（--verbose 透传、sessionstore 解码）此前已备齐，缺的是把「同一命令在裸环境下跑一遍」这一步提前。

## 候选与去向（按严重度）

### 1. 自动化检查：测试 harness 无看门狗（→ 票 08 验收项，已落）

`waitTestComplete` 挂着永不 reject——浏览器腿死掉时 wss 腿跟着死等。旧链路不修（票 10 删）；**新 harness 复刻这个形状就是复刻这次事故**。已加进票 08 验收：浏览器腿退出/超时，wss 腿必须能收尾报错。
同类缺口：`verify:exit-code` 只测合成流，没有任何检查断言「真浏览器腿真的产出事件」——这正是票 08 Playwright 的活，不用另建。

### 2. 信息访问：shoals 是 per-feature 的（→ 决策：暂不上提）

web-ext 反斜杠、套件时长、端口卫生这些坑，票 08（同 feature）能读到 shoals；**后续 feature（拖拽重构、配置版本化）读不到**。决策：维持 per-feature（matt-flow 设计），不另开全局 shoals 文件（两处真相）。耐久的部分（套件要跑数分钟、跑前查端口）由票 10 的 AGENTS.md 重写收编——那时它已经是跨 feature 知识。

### 3. AGENTS.md：steering 已经过时且 steer 反了（→ 排队票 10，不现在写）

「use the documented Node 16/pnpm 7 toolchain rather than changing package managers」这句在本机已是反指令（pnpm 11、lockfile 已重写、票 04 要切 Bun）。比 no-op 更糟的 stale op。票 10（文档票）整段重写，现在写会被重写两遍。

### 4. 工具经济：`cd` 前缀复读（→ 不修）

205/332 次 Bash 带 `cd "C:\...GleamDrag" && ` 前缀，cwd 本就持久——约 8k token 纯复读。量级太小不值得立规矩；真正贵的是 109 次进程普查式 probing，而它的解药是 shoal #4 的口诀（先查端口、等满 10 分钟），已经记了。

### 5. 编码规范：无新强制规则（→ 不加）

双轴审查这次都实际拦到了东西（陈旧注释、一值两源），现有规范在干活。拟议的「注释必须与代码一致」对默认行为是 no-op，不加。

### 6. 信息访问 hook（→ 提及不实施）

`web-ext run --verbose` 透传 Firefox 页面报错是本次唯一能看见页内 JS 错误的窗口，靠手动重跑加 flag 才拿到。宿主层有 `$onPostToolUse` updatedOutput tee 机制可以自动落盘 web-ext/Firefox stderr——属扩展级改动，非本仓库范围，仅记录。

## 下次复盘对照

- 票 08 实现后回看：新 harness 是否真的带超时收尾（候选 1 有没有落地）。
- 票 10 完成后回看：AGENTS.md 是否收编了套件时长/端口卫生（候选 2、3 有没有归位）。
