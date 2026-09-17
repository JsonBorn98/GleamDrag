import { LogLevel } from "../config/config"
import { Logger } from "./log"

describe('test logger', () => {
	it("tag", () => {
		const log = new Logger(LogLevel.V, "tag")
		// No assertion on purpose: the observable contract under test is that
		// every level call returns without throwing at this log level.
		log.E("E output")
		log.V("V output")
		log.VV("VV output")
		log.VVV("VVV output")
	})
})