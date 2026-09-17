// Shared mocha event-stream fixtures for the WXT-chain verify script
// (scripts/verify_test_wxt.mjs).
//
// The shapes: a synthetic green stream, and the REAL event stream
// captured from running the deliberately failing fixture under mocha —
// both speaking the same [type, payload] protocol the in-extension
// StreamReporter sends (src/test/mocha_init.ts).
//
// scripts/verify_exit_code.mjs (the legacy chain) keeps its own private
// copies: it dies with the legacy scripts in ticket 10, and migrating a
// doomed script would be churn. This module serves the WXT chain only.

import { createRequire } from "node:module"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

// Same clean-test shape the in-extension reporter sends for pass/fail events.
export function fakeTest(fullTitle) {
	return {
		title: fullTitle,
		fullTitle: fullTitle,
		file: null,
		duration: 1,
		currentRetry: 0,
		speed: "fast",
		err: null,
		stack: null,
	}
}

// Same stats shape mocha reports on "end" (note the plural `failures`,
// which is the field the exit-code judgment must read).
export function mochaStats({ tests, passes, failures }) {
	return {
		suites: 1,
		tests: tests,
		passes: passes,
		pending: 0,
		failures: failures,
		start: new Date().toISOString(),
		end: new Date().toISOString(),
		duration: 5,
	}
}

function cleanRealTest(test) {
	return {
		title: test.title,
		fullTitle: test.fullTitle(),
		file: test.file ?? null,
		duration: test.duration,
		currentRetry: test.currentRetry(),
		speed: test.speed,
		err: null,
		stack: null,
	}
}

// Run the fixture suite under a real mocha and capture its event stream —
// the same [type, payload] protocol the in-extension StreamReporter sends.
// The returned events end with the fixture's own real "end" stats.
export async function captureFixtureEvents() {
	const require = createRequire(path.join(repoRoot, "package.json"))
	const ts = require("typescript")
	const Mocha = require("mocha")

	const source = fs.readFileSync(
		path.join(repoRoot, "src", "test", "fixture", "failing.ts"),
		"utf8"
	)
	const compiled = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022,
		},
	}).outputText

	// build/ is gitignored; staying under repoRoot keeps require("chai")
	// resolving from the project node_modules. The .cjs extension loads the
	// transpiled CommonJS output under this repo's "type": "module".
	const tmpDir = path.join(repoRoot, "build", "verify-exit-code")
	fs.mkdirSync(tmpDir, { recursive: true })
	const tmpFile = path.join(tmpDir, "fixture.failing.cjs")
	fs.writeFileSync(tmpFile, compiled)

	// mocha event names are the protocol: start / pass / fail / end
	const captured = []
	function CaptureReporter(runner) {
		runner.once("start", () => {
			captured.push(["start", { total: runner.total }])
		})
		runner.on("pass", (test) => {
			captured.push(["pass", cleanRealTest(test)])
		})
		runner.on("fail", (test, err) => {
			const cleanTest = cleanRealTest(test)
			cleanTest.err = err.message
			captured.push(["fail", cleanTest])
		})
		runner.once("end", () => {
			captured.push(["end", { ...runner.stats }])
		})
	}

	const mocha = new Mocha({ ui: "bdd", reporter: CaptureReporter })
	mocha.addFile(tmpFile)
	await mocha.loadFilesAsync()
	// loadFiles fired the bdd pre-require event that attached describe/it
	// globals; now register the suite and run it
	const { registerFailingFixture } = require(tmpFile)
	registerFailingFixture()

	await new Promise((resolve) => mocha.run(resolve))
	return captured
}
