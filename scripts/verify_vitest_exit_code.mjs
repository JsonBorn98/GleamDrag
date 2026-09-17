// Vitest leg of the exit-code contract (feature build-and-test-refactor).
//
// Verifies through the real command path (`vitest run`):
//   1. green: the default pure-logic suite passes -> exit code 0
//   2. red: the deliberately failing fixture suite -> exit non-zero,
//      with the fixture test actually run
//
// Mirrors scripts/verify_exit_code.mjs (in-extension leg): a runner that
// swallows failures would defeat both stacks, so each stack verifies its own
// exit-code contract through its own command. "No test files found" also
// exits 1, so the red leg asserts the fixture's own failing test in the
// output — a non-zero exit alone is not evidence a test ran.
//
// Usage: node scripts/verify_vitest_exit_code.mjs
import { spawn } from "node:child_process"
import { join } from "node:path"
import pathLib from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = pathLib.resolve(pathLib.dirname(fileURLToPath(import.meta.url)), "..")

const DEFAULT_CONFIG = join(repoRoot, "vitest.config.ts")
// Dedicated fixture config: the default config excludes src/test/vitest/**
// so the default suite stays green, and a CLI filter cannot pierce that
// exclude (vitest would then exit non-zero on "No test files found" without
// running anything — a fake red the contract must not accept).
const FIXTURE_CONFIG = join(repoRoot, "src", "test", "vitest", "fixture", "vitest.config.ts")

// Same runner binary as the "test:vitest" npm script, spawned through the
// process executable to stay package-manager agnostic.
const VITEST_BIN = join(repoRoot, "node_modules", "vitest", "vitest.mjs")

function tail(text) {
	const max = 4000
	return text.length > max ? "..." + text.slice(-max) : text
}

function runVitest(config) {
	return new Promise((resolve) => {
		const child = spawn(process.execPath, [VITEST_BIN, "run", "--config", config], {
			cwd: repoRoot,
			stdio: ["ignore", "pipe", "pipe"],
		})
		let output = ""
		child.stdout.on("data", (data) => { output += data })
		child.stderr.on("data", (data) => { output += data })
		child.on("close", (code) => resolve({ code, output }))
	})
}

// The red leg's extra condition: the fixture test must appear in the output,
// not just a non-zero exit (which "No test files found" also produces).
const scenarios = [
	{
		name: "default pure-logic suite exits zero",
		config: DEFAULT_CONFIG,
		isOk: ({ code }) => code === 0,
	},
	{
		name: "failing fixture suite exits non-zero with the test actually run",
		config: FIXTURE_CONFIG,
		isOk: ({ code, output }) =>
			code !== 0 && output.includes("deliberately fails so a failing suite cannot exit zero"),
	},
]

let failed = 0
for (const scenario of scenarios) {
	const result = await runVitest(scenario.config)
	if (scenario.isOk(result)) {
		console.log(`pass: ${scenario.name} (exit ${result.code})`)
	} else {
		failed += 1
		console.error(`FAIL: ${scenario.name} (exit ${result.code}); output tail:\n${tail(result.output)}`)
	}
}

if (failed > 0) {
	console.error(`${failed} check(s) failed`)
	process.exit(1)
}
console.log("vitest exit-code contract verified")
process.exit(0)
