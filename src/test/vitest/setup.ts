// Vitest setup for the pure-logic stack (ADR 0002 testing dual-stack).
//
// - globals: describe/it/expect come from vitest; the migrated tests drop the
//   chai import and use vitest's expect with the same external-behavior
//   assertions (spec: assertion style stays behavior-oriented).
// - __BUILD_PROFILE: src/utils/log.ts reads it at module top level. WXT's
//   build injects it via vite define (wxt.config.ts); the WxtVitest plugin
//   does not carry that define, so stub it here before any src import.
// - fakeBrowser reset between tests: imported modules keep module-level state
//   (e.g. src/state/state.ts starts loading at import time), so a clean
//   browser mock per test keeps tests independent.
import { beforeEach, vi } from "vitest"

vi.stubGlobal("__BUILD_PROFILE", "debug")
vi.stubGlobal("__ENV", {
	commitId: "test",
	date: "",
	nodeVersion: process.version,
	buildToolVersion: "vite",
	os: process.platform,
	profile: "debug",
	webSocketServer: "",
	target: "vitest",
	testSuite: "",
})

import { fakeBrowser } from "wxt/testing/fake-browser"

beforeEach(() => {
	fakeBrowser.reset()
})
