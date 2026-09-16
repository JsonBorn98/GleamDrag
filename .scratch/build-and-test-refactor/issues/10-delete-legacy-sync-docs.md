# 10 - 删除旧构建资产 + 文档同步

**构建什么.** 双 MV3 产物经真浏览器验证、CI 全绿后，删除旧构建资产（Makefile 与全部手写构建/manifest 脚本，含 03 的过渡修复），并同步 README/AGENTS.md 命令与实际工具链一致。这是两次绿之间才删旧链路的收缩步。

**阻塞于.** 09

**状态.** ready-for-agent

- [ ] Makefile 与手写构建/manifest 脚本已删除，仓库无第二套构建
- [ ] README/AGENTS.md 命令与实际工具链一致（Bun、WXT、Vitest）
- [ ] 删除后全链路（构建、类型、双套测试）仍全绿
- [ ] CI 不再引用任何旧构建命令
