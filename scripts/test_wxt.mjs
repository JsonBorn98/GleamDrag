// In-extension contract suite runner for the WXT chain.
//
// Mirrors scripts/cli.mjs `test`: build the WXT test artifact, launch web-ext
// against the local Firefox, judge the suite over the same [type, payload]
// WebSocket protocol the in-extension StreamReporter speaks, and exit non-zero
// when any test fails (exit-code contract).
//
// Usage:
//   node scripts/test_wxt.mjs            # build + run in real Firefox
//   node scripts/test_wxt.mjs --no-browser  # judge a synthetic stream only

import { spawn } from "node:child_process"
import pathLib from "node:path"
import { fileURLToPath } from "node:url"
import { WebSocketServer } from "ws"
import { detectFirefoxBinary } from "./utils.mjs"

const repoRoot = pathLib.resolve(pathLib.dirname(fileURLToPath(import.meta.url)), "..")
const dist = pathLib.join(repoRoot, ".output", "firefox-mv3")

// web-ext is invoked as `node <repo>/node_modules/web-ext/bin/web-ext.js`
// (same rationale as scripts/cli.mjs: no bin shim, no precheck layer that
// could eat the exit code, package-manager agnostic).
const WEB_EXT_BIN = pathLib.join(repoRoot, "node_modules", "web-ext", "bin", "web-ext.js")

function parseArgs() {
	const noBrowser = process.argv.includes("--no-browser")
	const wsAddr = (() => {
		const i = process.argv.indexOf("--websocket-server")
		return i > 0 ? process.argv[i + 1] : "ws://localhost:8000"
	})()
	return { noBrowser, wsAddr }
}

function runWebExt(signal) {
	const binary = detectFirefoxBinary()
	if (binary === null) {
		console.error("no Firefox binary found; set GLEAMDRAG_FIREFOX_BIN")
		process.exit(1)
	}
	return new Promise((resolve, reject) => {
		const proc = spawn(process.execPath, [WEB_EXT_BIN, "run", "-f", binary, "-s", dist], {
			stdio: ["ignore", process.stdout, process.stderr],
			signal,
		})
		proc.on("error", (err) => {
			console.error(err)
			resolve()
		})
		proc.on("close", (code) => {
			if (code === 0 || code === null) {
				resolve()
			} else {
				reject("web-ext exited: " + code)
			}
		})
	})
}

function waitTestComplete(wsAddr) {
	const url = new URL(wsAddr)
	const port = url.port.length > 0 ? Number.parseInt(url.port) : undefined
	const wss = new WebSocketServer({ host: url.hostname, port })

	return new Promise((resolve) => {
		wss.on("connection", (ws) => {
			ws.on("message", (data) => {
				const [type, payload] = JSON.parse(data)
				switch (type) {
					case "start": {
						ws.send("ok")
						break
					}
					case "pass": {
						ws.send("ok")
						console.info("pass: %s", payload.fullTitle)
						break
					}
					case "fail": {
						ws.send("ok")
						console.error("fail: %s", payload.fullTitle)
						break
					}
					case "end": {
						ws.close()
						wss.close()
						resolve(payload)
						break
					}
					default: {
						throw new Error("unknown event type: " + type)
					}
				}
			})
			ws.send("ok")
		})
	})
}

const { noBrowser, wsAddr } = parseArgs()
const controller = new AbortController()
const resultPromise = waitTestComplete(wsAddr)
// Attach the failure handler at creation: a web-ext that dies before the
// "end" event must not hijack the exit-code contract (cli.mjs parity).
const browserDone = noBrowser
	? Promise.resolve()
	: runWebExt(controller.signal).catch((reason) => {
		console.error("web-ext exited unexpectedly:", reason)
	})

const result = await resultPromise
await browserDone
console.log("tests: %d, passes: %d, failures: %d", result.tests, result.passes, result.failures)
process.exit(result.failures > 0 ? 1 : 0)
