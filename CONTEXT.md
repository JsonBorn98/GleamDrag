# Context

## Language
**纯逻辑测试**:
不依赖浏览器扩展 API（webextension-polyfill）与真实 DOM、可在 Node/Vitest 中离线运行的测试；对应测试双栈架构中迁入 Vitest 的那一栈。
_Avoid_: 泛称「单元测试」
**扩展内契约测试**:
需要真实扩展运行时（webextension-polyfill、DOM）从而必须在扩展页面内经 Mocha 运行的行为契约套件；经 WebSocket 上报结果，退出码契约由故意失败用例保障。
_Avoid_: 与纯逻辑测试混称, 把 Playwright Chromium 通过当作三浏览器验收
