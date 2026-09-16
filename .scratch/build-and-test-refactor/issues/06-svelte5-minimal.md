# 06 - Svelte 5 最小兼容：legacy 写法保持，不迁 runes

**构建什么.** Svelte 5 最小兼容迁移：升级到 5.57 但组件保持现有写法（legacy 模式），只修挂载/卸载 API 与 custom element 编译不兼容点；不迁 runes、不改拖拽与设置页逻辑。目的：满足 WXT 官方 Svelte 模块的 Svelte≥5 要求，组件行为不变。

**阻塞于.** 05

**状态.** ready-for-agent

- [ ] Svelte 升 5.57 且保持 legacy 写法，无 runes 迁移
- [ ] 挂载/卸载 API 与 customElement 编译不兼容点修复
- [ ] 迁移后组件行为不变、类型检查全绿
- [ ] 官方 Svelte 模块（要求 Svelte≥5）可正常使用
