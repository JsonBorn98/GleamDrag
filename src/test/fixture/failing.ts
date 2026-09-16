import { assert } from 'chai'

// Deliberately failing suite for the exit-code contract.
//
// Registered only when the test page is opened with `?suite=fixture`
// (see src/test/main.ts); the default suite must stay green.
// Never import this module for its side effects from the default suite.
// Not named `*.test.ts` so offline test runners never pick it up.
export function registerFailingFixture() {
	describe("fixture: exit-code contract", () => {
		it("deliberately fails so a failing suite cannot exit zero", () => {
			assert.equal(1, 2, "intentional failure: verifies the test command exits non-zero")
		})
	})
}
