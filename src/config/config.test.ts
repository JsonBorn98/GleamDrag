import { expect } from "vitest"
import { ActionConfig, BroadcastEventTarget, CommandRequest, configBroadcast as configBroadcast, Configuration, type ReadonlyConfiguration } from "./config"

describe("test configuration", () => {
	it("empty config", () => {
		new Configuration()
	})

	it("action config", () => {
		const action = new ActionConfig({})
		expect(action.toPlainObject()).toBeTruthy()
	})

	it("request config", () => {
		const req = new CommandRequest({
			"url": "http://example.com"
		})
		expect(req.toPlainObject()).toBeTruthy()
	})

	it("broadcast", () => {

		const broadcast = new BroadcastEventTarget<ReadonlyConfiguration>()
		let listener0Result: ReadonlyConfiguration[] = []
		let listener1Result: ReadonlyConfiguration[] = []

		function listener0(cfg: ReadonlyConfiguration) {
			listener0Result.push(cfg)
		}

		function listener1(cfg: ReadonlyConfiguration) {
			listener1Result.push(cfg)
		}

		function reset() {
			listener0Result = []
			listener1Result = []
			broadcast.removeListener(listener0)
			broadcast.removeListener(listener1)
		}

		broadcast.addListener(listener0)
		broadcast.notify(new Configuration())
		expect(listener0Result).not.toHaveLength(0)
		expect(listener1Result).toHaveLength(0)
		reset()

		broadcast.addListener(listener1)
		broadcast.removeListener(listener0)
		broadcast.notify(new Configuration())
		expect(listener0Result).toHaveLength(0)
		expect(listener1Result).not.toHaveLength(0)
		reset()

		broadcast.addListener(listener0)
		broadcast.addListener(listener0)
		broadcast.addListener(listener1)
		broadcast.notify(new Configuration())
		expect(listener0Result).not.toHaveLength(0)
		expect(listener0Result.length, "call listener0 twice").toBe(2)
		expect(listener1Result).not.toHaveLength(0)
		reset()
	})
})