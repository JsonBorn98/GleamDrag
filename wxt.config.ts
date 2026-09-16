import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "wxt";
import { svelte3 } from "./scripts/vite-plugin-svelte3";

// Mirrors scripts/gen_manifest.mjs: browser differences (Firefox-only
// permissions, gecko id/min-version) move here; background service_worker vs
// scripts and the test-only CSP override are WXT-generated per target.
// No second hand-written manifest generator — this file is the only one.

// Single version source: package.json feeds both the manifest version and
// the zip name ({{version}} picks up the manifest version).
const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
	version: string;
};
const BUILD_VERSION = process.env.BUILD_VERSION ?? packageJson.version;
// debug|prod parity with the legacy --profile flag (scripts/cli.mjs).
const BUILD_PROFILE = process.env.BUILD_PROFILE ?? "debug";

// Test builds mirror the legacy firefox-test target: the in-extension test
// page is bundled and (Firefox-only) the CSP override lets mocha talk to an
// insecure websocket (https://bugzilla.mozilla.org/show_bug.cgi?id=1797086).
const isTestBuild = () => process.env.GLEAMDRAG_TEST_BUILD === "1";

// src/build_info.ts contract (__ENV / __BUILD_PROFILE were rollup replace
// injections; vite define is the WXT-chain equivalent).
function buildEnv(browser: string) {
	return {
		commitId: execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(),
		date: new Date().toISOString(),
		nodeVersion: process.version,
		// The rollup chain reported rollup.VERSION; this chain builds with vite.
		buildToolVersion: "vite",
		os: process.platform,
		profile: BUILD_PROFILE,
		webSocketServer: process.env.GLEAMDRAG_WS_SERVER ?? "",
		target: isTestBuild() ? `${browser}-test` : browser,
		testSuite: process.env.GLEAMDRAG_TEST_SUITE ?? "",
	};
}

export default defineConfig({
	// srcDir "src" puts entrypoints at src/entrypoints (WXT default layout).
	srcDir: "src",
	// WXT defaults firefox to MV2; this pins MV3 for both targets.
	manifestVersion: 3,
	// Test builds swap in public-test/ so mocha/chai ship only there; the
	// normal public/ carries no test assets.
	publicDir: isTestBuild() ? "public-test" : "public",
	// The test entrypoint ships only in test builds (legacy firefox-test
	// target); normal artifacts exclude it. filterEntrypoints overrides the
	// per-entrypoint include/exclude, so the test entry sets none.
	filterEntrypoints: isTestBuild() ? undefined : ["background", "content", "components", "options"],
	zip: {
		// gleamdrag-<version>-<target>.zip mirrors the legacy artifact name
		// (scripts/cli.mjs `gleamdrag-${BUILD_VERSION}-${target}.zip`).
		artifactTemplate: "{{name}}-{{version}}-{{browser}}.zip",
		// Firefox store upload is out of scope (spec); no sources zip.
		zipSources: false,
	},
	hooks: {
		// gen_manifest.mjs wrote browser_style: true for BOTH targets; WXT
		// only emits it for firefox. Chrome ignores the field, but byte-level
		// parity with the legacy manifest is the migration contract.
		"build:manifestGenerated": (_wxt, manifest) => {
			(manifest.options_ui as { browser_style?: boolean } | undefined ?? {}).browser_style = true;
		},
	},
	vite: (env) => ({
		plugins: [svelte3()],
		define: {
			__ENV: JSON.stringify(buildEnv(env.browser)),
			__BUILD_PROFILE: JSON.stringify(BUILD_PROFILE),
		},
	}),
	manifest: ({ browser }) => {
		const isFirefox = browser === "firefox";
		const isTest = isTestBuild();

		const permissions = [
			"activeTab",
			"storage",
			"tabs",
			"clipboardWrite",
			"downloads",
			"search",
			"scripting",
			"contextMenus",
			"alarms",
		];
		if (isFirefox) {
			permissions.push("contextualIdentities", "cookies");
		}

		// Test-only CSP override, Firefox-only — gen_manifest.mjs
		// contentSecurityPolicy() equivalence.
		const content_security_policy = isFirefox && isTest
			? { extension_pages: "script-src 'self'" }
			: undefined;

		return {
			name: "__MSG_extensionName__",
			description: "__MSG_extensionDescription__",
			version: BUILD_VERSION,
			homepage_url: "https://github.com/JsonBorn98/GleamDrag",
			author: "jsonborn98",
			default_locale: "en",
			icons: {
				"128": "icon/drag.png",
			},
			permissions,
			host_permissions: ["*://*/*"],
			web_accessible_resources: [
				{
					resources: ["components.js"],
					matches: ["*://*/*"],
				},
			],
			content_security_policy,
			browser_specific_settings: isFirefox
				? {
					gecko: {
						id: "gleamdrag@jsonborn98",
						strict_min_version: "106.0",
					},
				}
				: undefined,
		};
	},
});

