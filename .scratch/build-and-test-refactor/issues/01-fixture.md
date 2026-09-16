Autopilot: true
Claimed-at: 2026-09-16T11:35:49.094Z
# 01 - 退出码契约：修测试失败退出码 + 故意失败 fixture

**构建什么.** 修复测试结果判定读错字段（stats 字段为 failures 复数，判定读了单数 failure），使用例失败时测试命令可靠返回非零退出码；并新增一个故意失败的 fixture 套件，经真实命令路径验证本地与 CI 的非零退出与红绿可信。范围：只修判定与退出码路径，不动构建编排与业务代码。

**阻塞于.** 无，可立即开始

**状态.** resolved

- [x] 正常套件全绿时命令退出 0（verify_exit_code.mjs 绿场景，真实命令路径）
- [x] 故意失败 fixture 使本地命令非零退出（fixture 真实事件流经真实 `cli.mjs test` 命令，exit 1）
- [ ] 故意失败 fixture 使 CI 同样非零退出（红）——移交票 09（其验收第 3 条即此项；CI 目前无测试步骤属其范围，且被 05-08 阻塞）。CI 驱动 fixture 的构建期入口（BUILD_TEST_SUITE → __ENV.testSuite → openMocha ?suite=）经 code-review 裁决按票面「不动构建编排与业务代码」回退，票 09 重加。
- [x] 修复后的判定字段与 Mocha stats 字段一致（`result.failures`，与 mocha_init.ts 上报的 `this.stats` 同形）
