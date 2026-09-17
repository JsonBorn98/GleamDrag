import { defineBackground } from "wxt/utils/define-background";

// WXT generates the manifest background block per target: MV3 chromium uses
// service_worker, firefox MV3 uses scripts.
//
// src/background/main.ts is a side-effect module; the wrapper only imports
// it for its side effects.
export default defineBackground(() => {
	void import("../background/main");
});
