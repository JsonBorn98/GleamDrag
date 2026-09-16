import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";

// The page-injected custom-element bundle. The content script injects
// <script src={runtime.getURL("components.js")}>; the manifest
// web_accessible_resources entry lives in wxt.config.ts.
//
// The legacy chain bundled src/components/main.ts with
// compilerOptions.customElement = true (see scripts/vite-plugin-svelte3.ts).
export default defineUnlistedScript(() => {
	void import("../components/main");
});
