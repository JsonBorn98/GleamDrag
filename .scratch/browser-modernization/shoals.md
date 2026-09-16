## Shoals
- [Mocha 测试失败被退出码掩盖](scripts/cli.mjs#L248-L252) — 2026-09-16 只读评审发现并以无依赖表达式验证：Mocha stats 使用 failures，而退出条件读 result.failure，{failures:1}.failure > 0 为 false，进入 exit(0)。尚未运行完整旧测试套件（无 node_modules）。后续重构前必须修复并加入故意失败的测试验证非零退出码；不能把当前 make test 的 exit 0 当正确性证据。
- [本地 agent-browser 与技能入口版本不匹配](https://github.com/vercel-labs/agent-browser) — 2026-09-16 为查看临时架构报告，按已安装 skill 执行 agent-browser skills get core，返回 Unknown command: skills。随后 agent-browser --help 正常，支持 open/eval/screenshot 与 --session/--executable-path。下次不要假定该本地版本支持 skills 子命令；按 --help 的实际命令运行，不为查看报告擅自升级或全局安装。
