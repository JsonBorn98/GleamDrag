// Vitest config for the pure-logic test stack (ADR 0002 testing dual-stack).
//
// WxtVitest loads wxt.config.ts and wires tsconfig paths (@/*, ~/*), WXT
// globals, and its fake-browser extension API mock. Two local additions:
// - alias webextension-polyfill to a fakeBrowser stand-in: the real polyfill
//   throws outside a browser extension, but pure-logic test import chains
//   reach it (src/resolver/engine.ts value-imports it). The extension-API
//   exercising tests stay in the in-extension Mocha suite instead.
// - exclude the in-extension contract suite: those *.test.ts files exercise
//   the real polyfill/DOM on purpose and must not run offline.
import pathLib from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"
import { WxtVitest } from "wxt/testing/vitest-plugin"

const repoRoot = pathLib.resolve(pathLib.dirname(fileURLToPath(import.meta.url)))

export default defineConfig({
	plugins: [await WxtVitest()],
	resolve: {
		alias: {
			"webextension-polyfill": pathLib.join(repoRoot, "src", "test", "vitest", "webextension_polyfill.ts"),
		},
	},
	test: {
		// globals: describe/it are used bare (mocha-style, matching the
		// in-extension suite's habit); expect is imported explicitly per file.
		// The runtime globals switch pairs with "vitest/globals" in tsconfig.
		globals: true,
		setupFiles: [pathLib.join(repoRoot, "src", "test", "vitest", "setup.ts")],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.output/**",
			// In-extension contract suite (ADR 0002): runs in the real
			// extension via Mocha + WebSocket, never offline.
			"src/locale.test.ts",
			"src/state/state.test.ts",
			"src/context/context.test.ts",
			"src/background/**",
			"src/components/menu/menu_builder.test.ts",
			// Deliberately failing fixture: only run by name from
			// scripts/verify_vitest_exit_code.mjs; the default suite stays green.
			"src/test/vitest/**",
		],
	},
})
