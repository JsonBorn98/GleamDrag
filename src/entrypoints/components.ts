import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";

// The page-injected custom-element bundle. The content script injects
// <script src={runtime.getURL("components.js")}>; the manifest
// web_accessible_resources entry lives in wxt.config.ts.
//
// The custom elements are declared per component via
// <svelte:options customElement={{ tag }}> (src/components/**); the Svelte
// build itself comes from the @wxt-dev/module-svelte entry in wxt.config.ts.
export default defineUnlistedScript(() => {
	void import("../components/main");
});
