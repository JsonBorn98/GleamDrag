
import browser, { tabs } from 'webextension-polyfill';
import { assert } from 'chai';
import { ActionConfig, CommandKind, Configuration } from "../config/config"
import { closeTab } from '../utils/test';
import { Executor } from "./executor"
import { blankExecuteContext } from "../context/test_helper"
import { RuntimeMessageName } from "../message/message"
import type { RuntimeMessage } from "../message/message"

function buildActionConfig(command: CommandKind): ActionConfig {
    return new ActionConfig({ "command": command })
}

describe("test executor", async () => {
    const executor = new Executor()

    it("open tab", async () => {
        const ctx = await blankExecuteContext()
        let t: browser.Tabs.Tab
        try {
            t = await executor.openTab(ctx, "http://example.com")
        } finally {
            t && closeTab(t?.id)
        }
    })


    it("dump context", async () => {
        const ctx = await blankExecuteContext()
        await executor.dumpHandler(ctx)
    })

    it("copy text", async () => {
        const ctx = await blankExecuteContext(new ActionConfig({ command: CommandKind.copy }))

        ctx.data.selection = "copy demo"
        await executor.copyHandler(ctx)
    })

    it("copy image", async () => {
        const ctx = await blankExecuteContext(new ActionConfig({ command: CommandKind.copy }))

        ctx.data.imageSource = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAA8UlEQVQYlY3QoaqDYACG4dd5ysDgQBwz+QdZWFBYsTnwHryek3cVZi1isngHljVBUNAi/Ay3MIaWnXhY88tP+HiVqqo+rNhmDQL4aZoGx3FI05RpmhBCcDweKYoCXdeJooh5nlEty/rd7/ecTifatsV1XWzbZpomwjDkfr+TJAnK9Xr9qKpKEAR0XUdVVXieh2EY7Ha7/4/b7ZbX6wWAEAJN0+j7/gsBbN7vN5qmAfB8PjFNk3EcGYbhGw7DgOM4PB4Pbrcb5/OZy+VCWZZIKQFYloWN7/scDgfyPKeua6SU1HXNsixkWYaUkjiOUdYG/wONbmSLuq2dcQAAAABJRU5ErkJggg=="
        await executor.copyHandler(ctx)
    })

    it("download text", async () => {

        const ctx = await blankExecuteContext(buildActionConfig(CommandKind.download))

        ctx.data.selection = "hello world"

        let downloadId: number | undefined
        try {
            downloadId = await executor.downloadHandler(ctx)
        } finally {
            browser.downloads.removeFile(downloadId)
        }
    })

    // The two regressions below pin the small fixes made alongside this
    // ticket: a missing script must not be dereferenced, and a script action
    // must not fall through into the "unknown command" default branch.

    it("missing script is reported, not dereferenced", async () => {
        const ctx = await blankExecuteContext(
            new ActionConfig({ command: CommandKind.script, config: { scriptId: "absent" } })
        )

        const logged: unknown[][] = []
        const originalError = console.error
        console.error = (...args: unknown[]) => { logged.push(args) }
        try {
            await executor.scriptHandler(ctx)
        } finally {
            console.error = originalError
        }

        assert.equal(logged.length, 1, "a missing script should be reported once")
        assert.include(String(logged[0][0]), "absent", "the report should name the missing script")
    })

    it("script action does not fall through to the unknown-command branch", async () => {
        const ctx = await blankExecuteContext()
        const scripted = {
            ...ctx,
            config: new Configuration({ scripts: [{ id: "demo", text: "console.log('hello')" }] }),
            action: new ActionConfig({ command: CommandKind.script, config: { scriptId: "demo" } }),
        }

        let sent: RuntimeMessage<RuntimeMessageName.executeScript> | null = null
        const originalSendMessage = browser.tabs.sendMessage
        browser.tabs.sendMessage = (async (tabId: number, message: RuntimeMessage<RuntimeMessageName.executeScript>) => {
            sent = message
            return undefined
        }) as typeof browser.tabs.sendMessage
        try {
            await executor.execute(scripted)
        } finally {
            browser.tabs.sendMessage = originalSendMessage
        }

        assert.isNotNull(sent, "the script should have been dispatched to the content script")
        assert.equal(sent?.cmd, "doScript")
        assert.equal(sent?.args.text, "console.log('hello')")
    })
})
