// Exit-code contract verification (feature build-and-test-refactor).
//
// Verifies through the real command path (`node scripts/cli.mjs test`):
//   1. green: mocha-shaped "end" stats with failures = 0 -> exit code 0
//   2. red: the REAL event stream of the fixture suite — captured from a
//      real mocha run of src/test/fixture/failing.ts with the same event
//      protocol as the in-extension reporter — exits non-zero.
//
// The synthetic websocket client speaks the same event protocol as the
// in-extension StreamReporter (src/test/mocha_init.ts), so the judgment and
// exit-code path are exercised without a browser. The real-browser leg
// (Firefox opening test/mocha.html?suite=fixture) belongs to the Windows
// baseline ticket and the CI leg to the CI ticket; wiring the fixture into
// them is deliberately left out of this ticket's scope.
//
// Usage: pnpm run verify:exit-code

import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import WebSocket from 'ws'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const CONNECT_TIMEOUT_MS = 10_000
const SCENARIO_TIMEOUT_MS = 60_000

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function tail(text) {
	const max = 4000
	return text.length > max ? "..." + text.slice(-max) : text
}

function freePort() {
	return new Promise((resolve, reject) => {
		const server = createServer()
		server.on("error", reject)
		server.listen(0, "127.0.0.1", () => {
			const port = server.address().port
			server.close(() => resolve(port))
		})
	})
}

// Same clean-test shape the in-extension reporter sends for pass/fail events.
function fakeTest(fullTitle) {
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
function mochaStats({ tests, passes, failures }) {
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

function tryConnect(port) {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(`ws://127.0.0.1:${port}`)
		ws.on("open", () => resolve(ws))
		ws.on("error", reject)
	})
}

// Spawn the real `test` command against a private websocket port and feed it
// the given mocha events; resolve with its exit code and captured output.
async function runTestCommand(events) {
	const port = await freePort()
	const wsUrl = `ws://127.0.0.1:${port}`
	const child = spawn(process.execPath, ["scripts/cli.mjs", "test", "-s", wsUrl], {
		cwd: repoRoot,
		stdio: ["ignore", "pipe", "pipe"],
	})
	let output = ""
	child.stdout.on("data", (data) => { output += data })
	child.stderr.on("data", (data) => { output += data })

	const killTimer = setTimeout(() => child.kill(), SCENARIO_TIMEOUT_MS)
	const exitCode = new Promise((resolve) => {
		child.on("close", (code) => resolve(code))
	})

	// the command starts its websocket server before spawning web-ext;
	// retry-connect until it listens or the command dies
	let ws = null
	const deadline = Date.now() + CONNECT_TIMEOUT_MS
	while (!ws) {
		if (child.exitCode !== null) {
			await exitCode
			throw new Error(`test command exited early (${child.exitCode}); output tail:\n${tail(output)}`)
		}
		if (Date.now() > deadline) {
			child.kill()
			throw new Error(`cannot connect to ${wsUrl}; output tail:\n${tail(output)}`)
		}
		ws = await tryConnect(port).catch(() => null)
		if (!ws) {
			await sleep(100)
		}
	}

	const send = (event) => ws.send(JSON.stringify(event))
	send(["start", { total: events.length }])
	for (const event of events) {
		send(event)
	}

	const code = await exitCode
	clearTimeout(killTimer)
	return { code, output }
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
async function captureFixtureEvents() {
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

let failed = 0

// capture the fixture's real events first: the red scenario replays them
let fixtureEvents = null
try {
	const events = await captureFixtureEvents()
	const endStats = events[events.length - 1][1]
	if (!(endStats.failures > 0)) {
		failed += 1
		console.error(`FAIL: fixture suite unexpectedly green (${endStats.failures} failures)`)
	} else {
		console.log(`pass: fixture suite fails under mocha (${endStats.failures} failure(s))`)
		fixtureEvents = events
	}
} catch (error) {
	failed += 1
	console.error(`FAIL: fixture suite check: ${error.message}`)
}

const scenarios = [
	{
		name: "green stats (failures = 0) exits zero",
		expectZero: true,
		events: [
			["pass", fakeTest("synthetic: passing case")],
			["end", mochaStats({ tests: 1, passes: 1, failures: 0 })],
		],
	},
]
if (fixtureEvents) {
	scenarios.push({
		name: "real fixture suite events (failures > 0) exit non-zero",
		expectZero: false,
		events: fixtureEvents,
	})
}

for (const scenario of scenarios) {
	try {
		const { code, output } = await runTestCommand(scenario.events)
		const expected = scenario.expectZero ? 0 : "non-zero"
		const ok = scenario.expectZero ? code === 0 : code !== 0
		if (!ok) {
			failed += 1
			console.error(`FAIL: ${scenario.name}: exit ${code}, expected ${expected}; output tail:\n${tail(output)}`)
		} else {
			console.log(`pass: ${scenario.name} (exit ${code})`)
		}
	} catch (error) {
		failed += 1
		console.error(`FAIL: ${scenario.name}: ${error.message}`)
	}
}

if (failed > 0) {
	console.error(`${failed} check(s) failed`)
	process.exit(1)
}
console.log("exit-code contract verified")
process.exit(0)
