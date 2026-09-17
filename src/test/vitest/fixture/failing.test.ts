import { expect, it } from "vitest"

// Deliberately failing suite for the Vitest exit-code contract (mirrors
// src/test/fixture/failing.ts in the in-extension stack).
//
// Lives under src/test/vitest/ (not a colocated *.test.ts): the default
// offline run must stay green, so this file is excluded from the default
// `vitest run` and included only by name in scripts/verify_vitest_exit_code.mjs.
// Never import this module for its side effects from the default suite.
it("deliberately fails so a failing suite cannot exit zero", () => {
	expect(1, "intentional failure: verifies vitest exits non-zero").toBe(2)
})
