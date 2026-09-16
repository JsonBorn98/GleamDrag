# 03 - Windows 本机基线：旧链路可跑 + 真实 Firefox 绿色基线

**构建什么.** 让旧链路在本机 Windows 可跑：修进程启动（spawn 扩展名）、Firefox 可执行路径探测（不硬编码 developer edition）、绕开 make 依赖；然后在迁移前用本机真实 Firefox 跑完整套件拿到绿色基线（两次绿的前一次）。此基线是后续 WXT 迁移后同套件再绿一次的对照，也是删除旧链路的前提。范围：只做迁移前的过渡修复，随旧脚本一起删除不带入新链路。

**阻塞于.** 01

**状态.** ready-for-agent

- [ ] Windows 本机无需 make 即可跑构建与测试命令
- [ ] 自动探测本机可用 Firefox 变体（不硬编码 developer edition）
- [ ] 本机真实 Firefox 跑完整套件全绿
- [ ] 故意失败用例在本机命令路径非零退出
