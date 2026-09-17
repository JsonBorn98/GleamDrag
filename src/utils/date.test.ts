
import { expect } from "vitest"
import { formatDateWithZeroPadding } from './date'

describe("test utils", function () {
	it("format date", function () {
		const d = new Date(2022, 0, 31, 12, 15, 4, 0)
		expect(formatDateWithZeroPadding(d)).toEqual(["2022", "01", "31", "12", "15", "04"])
	})
})