import { defineContentScript } from "wxt/utils/define-content-script";

// Matches the manifest content_scripts entry (run_at document_end,
// all_frames, all urls). src/content_scripts/main.ts is a side-effect
// module; the wrapper only imports it.
export default defineContentScript({
	matches: ["*://*/*"],
	allFrames: true,
	runAt: "document_end",
	main() {
		void import("../content_scripts/main");
	},
});
