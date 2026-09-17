import { expect } from "vitest"
import { getAngle, TinyLRU } from "./utils"

describe("content script utils", () => {
	it("get angle", () => {
		let testCases = [
			{
				args: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
				angle: 0,
			},
			{
				args: [{ x: 0, y: 0 }, { x: 1, y: -1 }],
				angle: 45,
			},
			{
				args: [{ x: 0, y: 0 }, { x: 0, y: -1 }],
				angle: 90,
			},
			{
				args: [{ x: 0, y: 0 }, { x: 0, y: 1 }],
				angle: 270,
			},
			{
				args: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
				angle: 315,
			},
		]
		for (const tt of testCases) {
			let a = getAngle(tt.args[0]!, tt.args[1]!)
			expect(a).toBe(tt.angle)
		}
	})

	it('tiny lru', () => {
		const lru = new TinyLRU<number, number>()

		expect(lru.get(1)).toBe(undefined)
		expect(lru.get(2)).toBe(undefined)
		expect(lru.get(undefined!)).toBe(undefined)

		lru.put(1, 1)
		lru.put(2, 2)

		expect(lru.get(1)).toBe(1)
		expect(lru.get(2)).toBe(2)

		expect(lru.get(0)).toBe(undefined)
		expect(lru.size()).toBe(2)

		lru.clear()

		expect(lru.size()).toBe(0)
	})
})