import { defineContentScript } from "wxt/utils/define-content-script";

// Matches the legacy manifest content_scripts entry (run_at document_end,
// all_frames, all urls). The legacy chain bundled src/content_scripts/main.ts
// as a top-level side-effect module; the wrapper only imports it.
export default defineContentScript({
	matches: ["*://*/*"],
	allFrames: true,
	runAt: "document_end",
	main() {
		void import("../content_scripts/main");
	},
});
