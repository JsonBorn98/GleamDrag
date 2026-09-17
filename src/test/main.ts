import { webSocketAvailable, ws } from './mocha_init'
// In-extension contract suite (ADR 0002 testing dual-stack): only tests that
// exercise the real extension runtime (webextension-polyfill, DOM) run here.
// Pure-logic tests (utils, config, resolver, ...) run offline in Vitest —
// vitest.config.ts excludes exactly these files, so the split is symmetric.
import "../context/context.test"
import "../background/executor.test"
import "../background/utils.test"
import "../background/search.test"
import "../components/menu/menu_builder.test"
import "../locale.test"
import "../state/state.test"
import { registerFailingFixture } from './fixture/failing'

// Opt-in failing fixture for the exit-code contract: registered only when
// the test page is opened as `test/mocha.html?suite=fixture`; the default
// suite (no query) stays green.
const suite = new URLSearchParams(window.location.search).get("suite")
if (suite === "fixture") {
	registerFailingFixture()
}

if (webSocketAvailable()) {
	ws!.addEventListener("open", () => {
		mocha.run()
	})
} else {
	mocha.run()
}