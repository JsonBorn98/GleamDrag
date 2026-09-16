import { createRequire } from "node:module";
import path from "node:path";
import type { Plugin } from "vite";

// Temporary minimal Svelte 3 vite plugin.
//
// The official @wxt-dev/module-svelte requires Svelte >= 5; this repo stays on
// Svelte 3.59 until the Svelte 5 ticket lands. This plugin compiles the same
// way the legacy rollup chain did (scripts/build_rollup.mjs):
//
// - components entry (custom elements): compilerOptions.customElement = true,
//   css: false — Svelte 3 inlines <style> into the shadow root.
// - options entry (mounted pages): customElement = false, css: false —
//   no options component ships a <style> block, so nothing is lost.
//
// Delete this file together with the Svelte 5 migration.

const require = createRequire(import.meta.url);
const svelteCompiler: typeof import("svelte/compiler") = require("svelte/compiler");
// The package's es6/cjs export mix (dist/index.js reassigns module.exports
// to the factory) isn't expressed in its types; cast through the autoProcess
// module where sveltePreprocess is a real named export.
const { sveltePreprocess } = require("svelte-preprocess/dist/autoProcess") as typeof import("svelte-preprocess/dist/autoProcess");

const autoPreprocess = sveltePreprocess();

// src/components/** is the custom-element half of the split; every other
// .svelte file compiles as a mounted component (options page).
function isCustomElementComponent(id: string): boolean {
	const normalized = id.split(path.sep).join("/");
	return normalized.includes("/src/components/");
}

export function svelte3(): Plugin {
	return {
		name: "gleamdrag:svelte3",
		enforce: "pre",

		async transform(code, id) {
			// Strip the ?svelte query vite may append.
			const cleanId = id.replace(/\?.*$/, "");
			if (!cleanId.endsWith(".svelte")) return null;

			const customElement = isCustomElementComponent(cleanId);
			const filename = path.relative(process.cwd(), cleanId);

			const processed = await svelteCompiler.preprocess(code, autoPreprocess, { filename });

			const compiled = svelteCompiler.compile(processed.code, {
				filename,
				format: "esm",
				css: false,
				customElement,
				// Legacy chain compiled with dev warnings in debug builds only;
				// keep them off in production output parity.
				dev: false,
			});

			for (const warning of compiled.warnings ?? []) {
				this.warn(warning);
			}

			return {
				code: compiled.js.code,
				map: compiled.js.map ?? null,
			};
		},
	};
}

