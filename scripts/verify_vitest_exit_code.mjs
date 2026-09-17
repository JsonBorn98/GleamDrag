// Vitest leg of the exit-code contract (feature build-and-test-refactor).
//
// Verifies through the real command path (`vitest run`):
//   1. green: the default pure-logic suite passes -> exit code 0
//   2. red: the deliberately failing fixture suite -> exit non-zero
//
// Mirrors scripts/verify_exit_code.mjs (in-extension leg): a runner that
// swallows failures would defeat both stacks, so each stack verifies its own
// exit-code contract through its own command.
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

function runVitest(config, args = []) {
	return new Promise((resolve) => {
		// Same runner binary as the "test:vitest" npm script, spawned through
		// the process executable to stay package-manager agnostic.
		const child = spawn(process.execPath, [
			join(repoRoot, "node_modules", "vitest", "vitest.mjs"),
			"run",
			"--config",
			config,
			...args,
		], {
			cwd: repoRoot,
			stdio: ["ignore", "pipe", "pipe"],
		})
		let output = ""
		child.stdout.on("data", (data) => { output += data })
		child.stderr.on("data", (data) => { output += data })
		child.on("close", (code) => resolve({ code, output }))
	})
}

let failed = 0

// Green leg: the default suite must pass (and exit zero) offline.
{
	const { code, output } = await runVitest(DEFAULT_CONFIG)
	if (code === 0) {
		console.log(`pass: default pure-logic suite exits zero (exit ${code})`)
	} else {
		failed += 1
		console.error(`FAIL: default suite expected exit 0, got ${code}; output tail:\n${output.slice(-3000)}`)
	}
}

// Red leg: the failing fixture must exit non-zero AND actually run a test.
// A non-zero exit alone is not enough: "No test files found" also exits 1,
// so the output must show the fixture's own failing test for the pass.
{
	const { code, output } = await runVitest(FIXTURE_CONFIG)
	const ranTheFailingTest = output.includes("deliberately fails so a failing suite cannot exit zero")
	if (code !== 0 && ranTheFailingTest) {
		console.log(`pass: failing fixture suite exits non-zero (exit ${code})`)
	} else {
		failed += 1
		console.error(`FAIL: fixture suite expected non-zero exit with the fixture test actually run (exit ${code}, ranTheFailingTest=${ranTheFailingTest}); output tail:\n${output.slice(-3000)}`)
	}
}

if (failed > 0) {
	console.error(`${failed} check(s) failed`)
	process.exit(1)
}
console.log("vitest exit-code contract verified")
process.exit(0)
