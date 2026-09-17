// Vitest-only stand-in for webextension-polyfill (wired in vitest.config.ts).
//
// The real polyfill throws at module top level outside a browser extension
// ("This script should only be loaded in a browser extension."), and pure
// logic tests reach it through their import chain (src/resolver/engine.ts
// value-imports the polyfill even though the exercised paths never call it).
// Tests that actually exercise extension APIs stay in the in-extension Mocha
// suite (ADR 0002); this shim only keeps module loading alive offline by
// handing those imports WXT's fakeBrowser.
import { fakeBrowser } from "wxt/testing/fake-browser"

export default fakeBrowser
