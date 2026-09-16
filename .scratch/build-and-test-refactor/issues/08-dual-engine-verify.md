# 08 - 双引擎验收：Playwright Chromium + web-ext Firefox

**构建什么.** 双引擎验收自动化：Playwright 以 Chromium persistent context 加载 WXT 产物并运行扩展内契约套件；web-ext 自动起本机 Firefox 跑同一套件。这是双 MV3 产物经真浏览器验证的自动化路径；Chrome/Edge stable 手动 unpacked 装包验收仍由维护者本人执行。

**阻塞于.** 05, 06

**状态.** ready-for-agent

- [ ] Playwright 以 Chromium persistent context 加载产物并跑扩展内套件（自动化）
- [ ] web-ext 自动起本机 Firefox 跑同一套扩展内契约套件
- [ ] 两个引擎跑同一套件，结果一致全绿
- [ ] 不声称覆盖 Chrome/Edge stable 真机验收（留手动装包）
