# 05 - WXT + Vite 接管构建：双 MV3 产物 + strict TS

**构建什么.** 用 WXT（内置 Vite）接管扩展入口、产物生成与开发重载：manifest 中浏览器差异（Firefox 专属权限、Chromium service_worker、测试目标 CSP 覆盖）在 WXT 配置里等价迁移，不引入第二个手写 manifest 生成器；Firefox 显式选 MV3；产出 Firefox 与 Chromium 双 MV3 产物 zip；TypeScript strict 跟随 WXT 配置开启并修到全绿（个别文件局部最小修正不改运行时行为）。版本组合按选定 release 的 peerDependencies 重验后锁定。

**阻塞于.** 04

**状态.** ready-for-agent

- [ ] 一条命令产出 Firefox 与 Chromium 两份 MV3 产物 zip
- [ ] Firefox 产物显式 manifest_version 3（不落回默认 MV2）
- [ ] manifest 浏览器差异与旧生成器等价（权限、background、测试 CSP 覆盖）
- [ ] TypeScript strict 开启且类型检查全绿
- [ ] 旧套件测试入口仅出现在测试构建，普通产物不含测试页
