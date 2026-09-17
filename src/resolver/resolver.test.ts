
import { expect } from "vitest"
import { CommandRequest } from "../config/config"
import { buildSearchEngineCommandRequest } from "./engine"
import { Protocol, RequestResolver } from "./resolver"

describe("request resolver", function () {

	it("normal url", function () {
		const resolver = new RequestResolver(new CommandRequest({ url: "http://example.com", query: { "name": "foo", "query": "%s" } }))
		expect(resolver.protocol).toBe(Protocol.http)

		const url = resolver.resolveURL("bar")
		expect(url.searchParams.get("name")).toBe("foo")
		expect(url.searchParams.get("query")).toBe("bar")
	})

	it("complex url", function () {
		const resolver = new RequestResolver(new CommandRequest({ url: "http://demo.example.com/%s", query: { "s": "%s", "o": "%o", "d": "%d", "h": "%h", "x": "%x", "empty": "%a" } }))
		expect(resolver.protocol).toBe("http:")

		const url = resolver.resolveURL("bar")
		expect(url.searchParams.get("s")).toBe("bar")
		expect(url.searchParams.get("d")).toBe("example.com")
		expect(url.searchParams.get("h")).toBe("demo.example.com")
		expect(url.searchParams.get("x")).toBe("site:demo.example.com bar")
		expect(url.searchParams.get("empty")).toBe("")
	})

	it("browser search engine", function () {
		const resolver = new RequestResolver(new CommandRequest(buildSearchEngineCommandRequest("bar")))
		expect(resolver.protocol).toBe(Protocol.browserSearch)
		expect(resolver.resolveEngine()).toBe("bar")
	})
})