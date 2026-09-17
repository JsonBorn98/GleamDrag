// Dual-engine harness contract verification (ticket 08).
//
// Verifies scripts/test_wxt.mjs — the judgment path and the watchdog
// contract, without touching a real browser:
//
//   1. green: a synthetic mocha stream with failures = 0 exits zero
//   2. red: the REAL event stream of the fixture suite (captured under
//      mocha, same protocol as the in-extension reporter) exits non-zero
//      and the output names the failing fixture test
//   3. watchdog: an engine leg that dies before any "end" (no events at
//      all) finishes non-zero within the timeout instead of hanging —
//      the acceptance item from ticket 03's retro; the legacy harness
//      (cli.mjs waitTestComplete) would wait forever and squat the port.
//
// Usage: node scripts/verify_test_wxt.mjs

import { spawn } from "node:child_process"
import net from "node:net"
import path from "node:path"
import { fileURLToPath } from "node:url"
import WebSocket from "ws"
import { captureFixtureEvents, fakeTest, mochaStats } from "./mocha_event_fixtures.mjs"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const CONNECT_TIMEOUT_MS = 10_000
const SCENARIO_TIMEOUT_MS = 120_000

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function tail(text) {
	const max = 4000
	return text.length > max ? "..." + text.slice(-max) : text
}

function freePort() {
	return new Promise((resolve, reject) => {
		const server = net.createServer()
		server.on("error", reject)
		server.listen(0, "127.0.0.1", () => {
			const port = server.address().port
			server.close(() => resolve(port))
		})
	})
}

function tryConnect(port) {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(`ws://127.0.0.1:${port}`)
		ws.on("open", () => resolve(ws))
		ws.on("error", reject)
	})
}

// Spawn the harness judgment path against a private port; the feeder sends
// (or never sends) events; resolve with the harness exit code + output.
// extraArgs lets the watchdog scenarios shrink the harness's own timers so
// the watchdog (not this script's kill timer) finishes the leg.
async function runHarness(wsUrl, feed, extraArgs = []) {
	const child = spawn(process.execPath, ["scripts/test_wxt.mjs", "--no-browser", "--ws-server", wsUrl, ...extraArgs], {
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

	// the harness starts its collector before any engine exists; retry-connect
	// until it listens or the harness dies
	let ws = null
	const deadline = Date.now() + CONNECT_TIMEOUT_MS
	while (!ws) {
		if (child.exitCode !== null) {
			await exitCode
			throw new Error(`harness exited early (${child.exitCode}); output tail:\n${tail(output)}`)
		}
		if (Date.now() > deadline) {
			child.kill()
			throw new Error(`cannot connect to ${wsUrl}; output tail:\n${tail(output)}`)
		}
		ws = await tryConnect(portOf(wsUrl)).catch(() => null)
		if (!ws) {
			await sleep(100)
		}
	}

	const verdict = await feed(ws)
	const code = await exitCode
	clearTimeout(killTimer)
	return { code, output, ...verdict }
}

async function wsUrlFreePort() {
	const port = await freePort()
	return `ws://127.0.0.1:${port}`
}

function portOf(wsUrl) {
	return Number.parseInt(new URL(wsUrl).port)
}

let failed = 0

async function scenario(name, expectZero, fn) {
	try {
		const { code, output } = await fn()
		const expected = expectZero ? 0 : "non-zero"
		const ok = expectZero ? code === 0 : code !== 0
		if (!ok) {
			failed += 1
			console.error(`FAIL: ${name}: exit ${code}, expected ${expected}; output tail:\n${tail(output)}`)
			return null
		}
		console.log(`pass: ${name} (exit ${code})`)
		return output
	} catch (error) {
		failed += 1
		console.error(`FAIL: ${name}: ${error.message}`)
		return null
	}
}

// 1. green stream exits zero
await scenario("green stream (failures = 0) exits zero", true, async () =>
	runHarness(await wsUrlFreePort(), async (ws) => {
		ws.send(JSON.stringify(["start", { total: 1 }]))
		ws.send(JSON.stringify(["pass", fakeTest("synthetic: passing case")]))
		ws.send(JSON.stringify(["end", mochaStats({ tests: 1, passes: 1, failures: 0 })]))
		return {}
	})
)

// capture the fixture's real events for the red scenarios
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

// 2. red stream exits non-zero and names the failing test
if (fixtureEvents) {
	await scenario("real fixture stream (failures > 0) exits non-zero", false, async () =>
		runHarness(await wsUrlFreePort(), async (ws) => {
			for (const event of fixtureEvents) {
				ws.send(JSON.stringify(event))
			}
			return {}
		})
	)
	const redOutput = await (async () => {
		const { code, output } = await runHarness(await wsUrlFreePort(), async (ws) => {
			for (const event of fixtureEvents) {
				ws.send(JSON.stringify(event))
			}
			return {}
		})
		return output
	})()
	// "No test files found"-style empty verification must not pass: the
	// output has to name the fixture test (shoals: non-zero exit alone is
	// not evidence a red test ran).
	const named = redOutput.includes("deliberately fails")
	if (!named) {
		failed += 1
		console.error("FAIL: red output does not name the fixture test ('deliberately fails')")
	} else {
		console.log("pass: red output names the fixture test")
	}
}

// Watchdog scenarios: the harness's own watchdog must finish the leg.
// Exit-code alone is not evidence (shoals: a kill timer also yields a
// non-zero, signaled exit) — each scenario asserts the exit code is
// exactly 1 (the harness's own process.exit(1), not a kill signal's null)
// AND the output names the watchdog reason that fired.

function watchdogChecks(name, expectedReason) {
	return ({ code, output }) => {
		if (code !== 1) {
			failed += 1
			console.error(`FAIL: ${name}: exit ${code}, expected exactly 1 (a kill signal exits null); output tail:\n${tail(output)}`)
			return false
		}
		if (!output.includes(expectedReason)) {
			failed += 1
			console.error(`FAIL: ${name}: output does not name the watchdog reason "${expectedReason}"; output tail:\n${tail(output)}`)
			return false
		}
		console.log(`pass: ${name} (watchdog bit: "${expectedReason}")`)
		return true
	}
}

// 3. watchdog: connected, suite never finishes (engine died mid-suite).
//    The suite timer is shrunk to 5s so the watchdog bites well inside
//    this script's 120s kill timer.
{
	const name = "watchdog: silent leg (no events) finishes non-zero, no hang"
	const { code, output } = await runHarness(await wsUrlFreePort(), async (ws) => {
		// send "start" then go silent: connected, suite never finishes —
		// the shape of an engine dying mid-suite
		ws.send(JSON.stringify(["start", { total: 3 }]))
		return {}
	}, ["--suite-timeout-ms", "5000"])
	watchdogChecks(name, "suite did not finish within")({ code, output })
}

// 4. watchdog: socket closed before "end" (engine exit). Watchdog #3
//    (socket close) should bite immediately — long before the shrunk
//    suite timer — so this verifies the close-detection path.
{
	const name = "watchdog: socket close before \"end\" finishes non-zero, no hang"
	const { code, output } = await runHarness(await wsUrlFreePort(), async (ws) => {
		ws.send(JSON.stringify(["start", { total: 1 }]))
		ws.send(JSON.stringify(["pass", fakeTest("synthetic: passing case")]))
		// close without "end": the reporting page (engine) is gone
		ws.close()
		return {}
	}, ["--suite-timeout-ms", "60000"])
	watchdogChecks(name, "reporting socket closed before")({ code, output })
}

// 5. watchdog: no connection at all (engine died before the suite
//    started) — the connect timer. Bespoke spawn: runHarness's own probe
//    connection would clear the connect timer, so this scenario must not
//    connect anything to the harness port.
{
	const name = "watchdog: no connection finishes non-zero, no hang"
	const port = await freePort()
	const child = spawn(process.execPath, [
		"scripts/test_wxt.mjs", "--no-browser",
		"--ws-server", `ws://127.0.0.1:${port}`,
		"--connect-timeout-ms", "5000",
	], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] })
	let output = ""
	child.stdout.on("data", (data) => { output += data })
	child.stderr.on("data", (data) => { output += data })
	const killTimer = setTimeout(() => child.kill(), SCENARIO_TIMEOUT_MS)
	const code = await new Promise((resolve) => child.on("close", (c) => resolve(c)))
	clearTimeout(killTimer)
	watchdogChecks(name, "no connection within")({ code, output })
}

if (failed > 0) {
	console.error(`${failed} check(s) failed`)
	process.exit(1)
}
console.log("dual-engine harness contract verified")
process.exit(0)
