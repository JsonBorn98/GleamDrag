// Mocha event collector for the in-extension contract suite (WXT chain).
//
// One WebSocketServer listening for the in-extension StreamReporter
// (src/test/mocha_init.ts) [type, payload] protocol: start / pass / fail /
// end. Engine harnesses (Firefox web-ext, Chromium Playwright) drive the
// same suite; this module owns the two contracts that make the suite
// trustworthy regardless of which engine (or none) is attached:
//
//   1. exit-code contract: the "end" stats plural `failures` field decides
//      the exit code — no other event can flip it green.
//   2. watchdog contract (ticket 03 retro, ticket 08 acceptance): the
//      browser leg dying or timing out must finish this leg with a
//      non-zero verdict. The pre-watchdog collector (the pre-WXT chain's
//      waitTestComplete) had
//      no timeout and no watchdog: a dead Firefox left the wss waiting
//      forever, squatting the port and killing the next run with
//      EADDRINUSE and a 0-byte log. A harness reusing that shape re-creates
//      that incident; this module exists so it cannot.

import { WebSocketServer } from "ws"

export const CONNECT_TIMEOUT_MS = 90_000
export const SUITE_TIMEOUT_MS = 10 * 60_000

// Start a collector for one engine leg. `promise` resolves once the suite
// reports "end" (or a watchdog fires); it never rejects and never hangs:
// every path — green, failed suite, dead engine, protocol break, timeout —
// resolves a { code, reason, stats, events } verdict, so a dead engine leg
// cannot leave it pending forever. `abort(reason)` lets the engine wrapper
// finish immediately when the engine process itself exits; `closed()`
// resolves when the listening socket is released, so sequential legs can
// rebind the same port without a zombie.
export function startCollector(wsAddr, { label, connectTimeoutMs = CONNECT_TIMEOUT_MS, suiteTimeoutMs = SUITE_TIMEOUT_MS, onEvent } = {}) {
	const url = new URL(wsAddr)
	const port = url.port.length > 0 ? Number.parseInt(url.port) : undefined
	const wss = new WebSocketServer({ host: url.hostname, port })

	const events = []
	let resolvePromise
	const promise = new Promise((resolve) => { resolvePromise = resolve })

	let settled = false
	let closingPromise = null
	const beginClose = () => {
		if (closingPromise === null) {
			closingPromise = new Promise((resolve) => {
				// Server.close waits out open connections; a verdict is
				// final, so terminate lingering clients instead of letting
				// a half-dead engine page hold the port past this leg.
				for (const client of wss.clients) {
					client.terminate()
				}
				try {
					wss.close(resolve)
				} catch {
					// already closing or closed; the socket is on its way out
					resolve()
				}
			})
		}
		return closingPromise
	}

	const settle = (code, reason, stats = null) => {
		if (settled) return
		settled = true
		// Tearing the server down releases the port even when no "end"
		// arrives (dead engine leg): no zombie squatting the next run.
		beginClose()
		resolvePromise({ code, reason, stats, events })
	}

	// Watchdog #1: nothing ever connected (engine died before the
	// extension page reached for the websocket).
	const connectTimer = setTimeout(() => {
		settle(1, `${label}: no connection within ${connectTimeoutMs}ms — engine leg died before the suite started`)
	}, connectTimeoutMs)

	// A taken port (stale harness residue) fails here, loud and early,
	// instead of the legacy silent EADDRINUSE zombie with a 0-byte log.
	wss.on("error", (err) => {
		settle(1, `${label}: websocket server error on ${wsAddr} (${err.message}) — check for a stale harness process on that port (netstat -ano | grep :${port ?? "?"})`)
	})

	wss.on("connection", (ws) => {
		clearTimeout(connectTimer)
		ws.send("ok")

		// Watchdog #2: connected but the suite never finished (engine
		// died mid-suite). 10 minutes fits the observed 4-8 minute
		// healthy suite duration with margin (shoals: a 4-minute
		// timeout kills healthy runs; judge "hung" only past 10).
		const suiteTimer = setTimeout(() => {
			settle(1, `${label}: suite did not finish within ${suiteTimeoutMs}ms — engine leg hung or died mid-suite`)
		}, suiteTimeoutMs)

		ws.on("close", () => {
			// Watchdog #3: the reporting page closed its socket without
			// sending "end" — the extension page (and with it the engine)
			// is gone. Don't wait out the suite timer: finish now,
			// non-zero, no zombie.
			if (!settled) {
				clearTimeout(suiteTimer)
				settle(1, `${label}: reporting socket closed before "end" — engine leg exited mid-suite`)
			}
		})

		ws.on("message", (data) => {
			const [type, payload] = JSON.parse(data)
			events.push([type, payload])
			if (onEvent) onEvent(type, payload)
			if (type === "start" || type === "pass" || type === "fail") {
				// the reporter expects an ack per event; nothing to judge
				ws.send("ok")
				return
			}
			if (type === "end") {
				clearTimeout(suiteTimer)
				ws.close()
				// exit-code contract: plural `failures` decides.
				// Missing/invalid stats are a protocol break, not a
				// green run: judge them red.
				const failures = Number(payload?.failures)
				if (!Number.isFinite(failures)) {
					settle(1, `${label}: "end" stats missing numeric failures`, payload)
				} else if (failures > 0) {
					settle(1, `${label}: ${failures} test failure(s)`, payload)
				} else {
					settle(0, `${label}: suite green`, payload)
				}
				return
			}
			clearTimeout(suiteTimer)
			settle(1, `${label}: unknown event type: ${type}`)
		})
	})

	return {
		promise,
		abort: (reason) => settle(1, `${label}: ${reason}`),
		closed: beginClose,
	}
}

// Shared console sink: same per-event logging the legacy harness printed.
export function logEvent(label) {
	return (type, payload) => {
		if (type === "pass") {
			console.info(`[${label}] pass: %s`, payload.fullTitle)
		} else if (type === "fail") {
			// err/stack ride the same [type, payload] stream (mocha_init
			// EVENT_TEST_FAIL); print them or an intermittent suite failure
			// (seen once: Firefox dump-context flake) is undiagnosable from CI.
			console.error(`[${label}] fail: %s%s`, payload.fullTitle,
				payload.err ? `\n[${label}]   ${String(payload.err).split("\n").join(`\n[${label}]   `)}`
					+ (payload.stack ? `\n[${label}]   ${String(payload.stack).split("\n").join(`\n[${label}]   `)}` : "")
				: "")
		}
	}
}
