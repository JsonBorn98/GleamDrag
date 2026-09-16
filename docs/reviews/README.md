# Architecture Reviews

评审原始报告入档。这里的文件是**快照**，不是活文档：

- 行号锚点、文件路径、版本号都对应报告头部标注的 git 基线；基线之后代码已变动时，不要拿旧行号对现有代码下结论。
- 版本号（如 WXT 0.21.4 / Svelte 5.57.0）是评审当时的调研值，不是 lockfile 锁定值；正式采用前以实际安装版本为准。
- 报告中的候选方案（Candidate 01–05）是提议，不是已采纳决策；已采纳的决策见 `docs/adr/`，当前轮的 spec 与 ticket 见 `.scratch/build-and-test-refactor/`。

## 文件

- `architecture-review-20260916-gleamdrag.html` — fork 改名 GleamDrag 后（基线 `67a7be4`，2026-09-16）的第一份全仓架构评审。含 5 个候选拆深方向（构建与测试 / 后台操作 / 拖拽会话 / 配置 / 浏览器能力）的 Before/After 结构图、技术选型表、验收标准与迁移顺序建议。本轮「构建与验证重构」由其中 Candidate 01 + 技术选型推荐导出（见 ADR 0001/0002）；后续后台、拖拽、配置、能力 adapter 重构（Candidate 02–05）以此为共同输入。

自包含：内嵌全部图表脚本，14 处外部链接仅为引用出处，离线打开不失效。
