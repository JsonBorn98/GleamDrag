// Dual-engine in-extension contract suite harness (WXT chain).
//
// Runs the same in-extension Mocha suite (src/test/main.ts, reported over
// the [type, payload] WebSocket protocol by src/test/mocha_init.ts) through
// BOTH real engines, sequentially:
//
//   firefox   — web-ext run starts the local Firefox against
//               .output/firefox-mv3 (same invocation as the legacy chain)
//   chromium  — Playwright launchPersistentContext loads .output/chromium-mv3
//               as an unpacked extension (--load-extension)
//
// Both artifacts are test builds (GLEAMDRAG_TEST_BUILD=1) with the
// collector's WebSocket address baked in at build time (GLEAMDRAG_WS_SERVER)
// — building here is what keeps the baked address and the collector on the
// same port; a test build without the variable silently runs the suite
// offline and the collector waits forever (shoals: verify with
// `grep webSocketServer` when reusing artifacts via --no-build).
//
// The collector (scripts/mocha_event_collect.mjs) carries the watchdog
// contract from ticket 03's retro: a browser leg that dies or hangs ends
// its leg non-zero instead of waiting forever — no port-squatting zombie,
// no 0-byte-log EADDRINUSE for the next run. Before blaming a hang, check
// for stale harness residue: netstat -ano | grep :8000.
//
// Chrome/Edge stable unpacked-load acceptance stays manual (spec): this
// harness is the Playwright-bundled Chromium, not a stable-channel browser.
//
// Usage:
//   node scripts/test_wxt.mjs                    # build test artifacts, run both legs
//   node scripts/test_wxt.mjs --engine firefox   # one leg only
//   node scripts/test_wxt.mjs --engine chromium
//   node scripts/test_wxt.mjs --no-build         # reuse .output artifacts (same ws addr)
//   node scripts/test_wxt.mjs --no-browser       # judgment path only (synthetic stream)
//   node scripts/test_wxt.mjs --test-suite fixture  # bake the failing-fixture red leg

import { spawn, spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import pathLib from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"
import { logEvent, startCollector } from "./mocha_event_collect.mjs"
import { detectFirefoxBinary } from "./utils.mjs"

const repoRoot = pathLib.resolve(pathLib.dirname(fileURLToPath(import.meta.url)), "..")
const distDir = (engine) => pathLib.join(repoRoot, ".output", `${engine}-mv3`)

// web-ext and wxt run as `node <repo>/node_modules/<pkg>/bin/...` (same
// rationale as scripts/cli.mjs): no bin shim, no precheck layer that could
// eat the exit code, package-manager agnostic.
const WEB_EXT_BIN = pathLib.join(repoRoot, "node_modules", "web-ext", "bin", "web-ext.js")
const WXT_BIN = pathLib.join(repoRoot, "node_modules", "wxt", "bin", "wxt.mjs")

const ENGINES = ["firefox", "chromium"]

// Bounded engine teardown after the verdict: the green path has the engine
// quitting itself (suite "end" → closeInstance → Firefox quits → web-ext
// follows), so this only sweeps up hung engines; a stuck teardown must not
// stall the next leg or the whole dual run.
const ENGINE_TEARDOWN_TIMEOUT_MS = 15_000

// Collector options shared by every leg: per-event logging plus the
// injectable watchdog timers (verify_test_wxt.mjs shrinks them to test
// the watchdog contract inside its scenario budgets).
function collectorOptions(label) {
	return {
		label,
		onEvent: logEvent(label),
		connectTimeoutMs: args.connectTimeoutMs ?? undefined,
		suiteTimeoutMs: args.suiteTimeoutMs ?? undefined,
	}
}

function parseArgs() {
	const flag = (name) => {
		const i = process.argv.indexOf(name)
		return i > 0 ? process.argv[i + 1] : null
	}
	const numFlag = (name) => {
		const raw = flag(name)
		const value = raw === null ? NaN : Number.parseInt(raw, 10)
		return Number.isFinite(value) ? value : null
	}
	return {
		engine: flag("--engine"),
		wsAddr: flag("--ws-server") ?? "ws://127.0.0.1:8000",
		testSuite: flag("--test-suite") ?? "",
		// Watchdog timers are injectable so the contract verification
		// (scripts/verify_test_wxt.mjs) can make a watchdog fire inside a
		// scenario budget instead of waiting out the real-suite margins.
		connectTimeoutMs: numFlag("--connect-timeout-ms"),
		suiteTimeoutMs: numFlag("--suite-timeout-ms"),
		noBrowser: process.argv.includes("--no-browser"),
		noBuild: process.argv.includes("--no-build"),
	}
}

// Build one engine's test artifact with the collector address baked in.
// Exits non-zero on build failure — before any collector exists, so a
// failed build can never squat the WebSocket port.
function buildTestArtifact(engine, wsAddr, testSuite) {
	console.log(`[${engine}] building test artifact (.output/${engine}-mv3)`)
	const env = {
		...process.env,
		GLEAMDRAG_TEST_BUILD: "1",
		GLEAMDRAG_WS_SERVER: wsAddr,
		GLEAMDRAG_TEST_SUITE: testSuite,
	}
	const sync = spawnSync(process.execPath, [pathLib.join(repoRoot, "scripts", "sync_public.mjs")], {
		cwd: repoRoot, stdio: "inherit", env,
	})
	if (sync.status !== 0) {
		console.error(`[${engine}] sync_public failed (exit ${sync.status})`)
		process.exit(1)
	}
	const build = spawnSync(process.execPath, [WXT_BIN, "build", "-b", engine], {
		cwd: repoRoot, stdio: "inherit", env,
	})
	if (build.status !== 0) {
		console.error(`[${engine}] wxt build failed (exit ${build.status})`)
		process.exit(1)
	}
}

// Kill a process and (on Windows) its whole tree: web-ext spawns Firefox as
// a child, and killing only the web-ext node process orphans a visible
// Firefox window.
function killTree(proc) {
	if (proc.exitCode !== null || proc.signalCode !== null) return
	if (process.platform === "win32") {
		spawnSync("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { stdio: "ignore" })
	} else {
		proc.kill("SIGKILL")
	}
}

// Firefox leg: web-ext run against the artifact. Resolves when web-ext
// exits (normally: the suite's "end" handler closes every window, Firefox
// quits, web-ext follows). A web-ext death before the suite's "end" aborts
// the collector — the watchdog contract, not a silent wait.
function runWebExt(engine, wsAddr, collector) {
	const binary = detectFirefoxBinary()
	if (binary === null) {
		console.error("no Firefox binary found; set GLEAMDRAG_FIREFOX_BIN")
		collector.abort("no Firefox binary")
		return Promise.resolve(null)
	}
	const proc = spawn(
		process.execPath,
		[WEB_EXT_BIN, "run", "-f", binary, "-s", distDir(engine)],
		{ stdio: ["ignore", "inherit", "inherit"] }
	)
	const done = new Promise((resolve) => {
		proc.on("error", (err) => {
			console.error(`[${engine}] web-ext error:`, err)
			collector.abort("web-ext failed to spawn")
			resolve()
		})
		proc.on("close", (code) => {
			if (code === 0 || code === null) {
				// expected path: suite finished, extension closed its
				// windows, Firefox quit, web-ext followed. If the suite
				// had NOT finished, this abort is the watchdog bite.
				collector.abort(`web-ext exited before the suite reported "end" (code ${code})`)
				resolve()
			} else {
				console.error(`[${engine}] web-ext exited: ${code}`)
				collector.abort(`web-ext exited before the suite reported "end" (code ${code})`)
				resolve()
			}
		})
	})
	return { proc, done }
}

// Chromium leg: Playwright persistent context with the artifact loaded as
// an unpacked extension. Headed: the extension's MV3 service worker and
// tabs.create-driven test page need the full browser (headless-shell has
// no extension support; headless=new is not what this harness verifies).
// A persistent-context exit before "end" aborts the collector.
async function runChromium(engine, wsAddr, collector) {
	const userDataDir = fs.mkdtempSync(pathLib.join(os.tmpdir(), `gleamdrag-${engine}-`))
	// Chrome accepts forward slashes; args are passed verbatim (no shell).
	const extPath = distDir(engine).split(pathLib.sep).join("/")
	const context = await chromium.launchPersistentContext(userDataDir, {
		headless: false,
		args: [
			`--disable-extensions-except=${extPath}`,
			`--load-extension=${extPath}`,
		],
	}).catch((err) => {
		console.error(`[${engine}] playwright launch failed:`, err.message)
		collector.abort("playwright launch failed")
		return null
	})
	if (context === null) {
		return { cleanup: async () => { fs.rmSync(userDataDir, { recursive: true, force: true }) }, done: Promise.resolve() }
	}
	const done = new Promise((resolve) => {
		context.on("close", () => {
			collector.abort("chromium context closed before the suite reported \"end\"")
			resolve()
		})
	})
	const cleanup = async () => {
		try {
			await context.close()
		} catch { /* engine already gone */ }
		fs.rmSync(userDataDir, { recursive: true, force: true })
	}
	return { cleanup, done }
}

// One engine leg: collector up, engine up, await the verdict (never hangs),
// tear the engine down, release the port before the next leg rebinds it.
async function runEngineLeg(engine, wsAddr) {
	const dist = distDir(engine)
	if (!fs.existsSync(pathLib.join(dist, "manifest.json"))) {
		console.error(`[${engine}] no artifact at ${dist}; build first (drop --no-build)`)
		return 1
	}
	const collector = startCollector(wsAddr, collectorOptions(engine))

	// A missing Firefox binary makes runWebExt abort the collector and hand
	// back null; the ?? keeps the teardown below a no-op instead of a crash.
	const leg = (engine === "firefox"
		? runWebExt(engine, wsAddr, collector)
		: await runChromium(engine, wsAddr, collector)) ?? { done: Promise.resolve() }

	const verdict = await collector.promise
	console.log(
		`[${engine}] tests: %s, passes: %s, failures: %s`,
		verdict.stats?.tests ?? "?", verdict.stats?.passes ?? "?", verdict.stats?.failures ?? "?"
	)
	console.log(`[${engine}] verdict (exit ${verdict.code}): ${verdict.reason}`)

	// Tear the engine down regardless of who settled first: a green verdict
	// leaves a running engine; a watchdog verdict leaves a hung one. Graceful
	// first (the green path has the engine quitting itself: suite "end" →
	// closeInstance → Firefox quits → web-ext follows); force-kill only what
	// the bounded wait leaves behind, so one hung engine cannot stall the
	// whole dual run.
	const teardown = (async () => {
		if (leg.cleanup) await leg.cleanup()
		await leg.done
	})()
	teardown.catch((err) => console.error(`[${engine}] teardown error (verdict already final):`, err.message))
	await Promise.race([teardown, new Promise((resolve) => setTimeout(resolve, ENGINE_TEARDOWN_TIMEOUT_MS))])
	if (leg.proc) killTree(leg.proc)
	await collector.closed()
	return verdict.code === 0 ? 0 : 1
}

const args = parseArgs()

if (args.noBrowser) {
	// Judgment path only: no build, no engine. A synthetic client feeds the
	// collector over args.wsAddr; scripts/verify_test_wxt.mjs drives this to
	// verify the exit-code contract end-to-end.
	const collector = startCollector(args.wsAddr, collectorOptions("judgment"))
	const verdict = await collector.promise
	console.log(`[judgment] verdict (exit ${verdict.code}): ${verdict.reason}`)
	await collector.closed()
	process.exit(verdict.code === 0 ? 0 : 1)
}

if (args.engine !== null && !ENGINES.includes(args.engine)) {
	console.error(`unknown engine: ${args.engine} (expected ${ENGINES.join(" | ")})`)
	process.exit(1)
}
const engines = args.engine === null ? ENGINES : [args.engine]

let failed = 0
for (const engine of engines) {
	if (!args.noBuild) {
		buildTestArtifact(engine, args.wsAddr, args.testSuite)
	}
	failed += await runEngineLeg(engine, args.wsAddr)
}

const total = engines.length
const green = total - failed
console.log(`dual-engine verify: ${green}/${total} leg(s) green`)
process.exit(failed > 0 ? 1 : 0)
