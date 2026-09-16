import { LocaleMessageHelper, localeMessageProxy } from "./locale"
import { assert } from "chai"

describe("locale", () => {

	it("proxy", () => {
		const locale = localeMessageProxy()
		assert.ok(locale.extensionName)
		assert.equal("notExists", locale.notExists)
	})

	it("helper", () => {
		const localeHelper = new LocaleMessageHelper()
		assert.ok(localeHelper.get("extensionName"))
		assert.equal("notExists", localeHelper.get("notExists"))
		assert.equal("default", localeHelper.getDefault("notExists", "default"))
	})
})