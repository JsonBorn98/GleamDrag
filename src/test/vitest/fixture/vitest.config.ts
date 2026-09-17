// Red-leg-only config for the Vitest exit-code contract
// (scripts/verify_vitest_exit_code.mjs).
//
// The default vitest.config.ts excludes src/test/vitest/** so the default
// run stays green; a CLI filename filter cannot pierce that exclude (vitest
// "No test files found" would then fake the non-zero exit without running
// anything). This config includes exactly the deliberately failing fixture.
// The fixture imports no src module, so no WXT plugin, polyfill alias, or
// setup file is wired here — include is the whole contract.
import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		// Relative to the repo root (vitest root defaults to the cwd the
		// runner is spawned with, not this file's directory).
		include: ["src/test/vitest/fixture/failing.test.ts"],
	},
})
