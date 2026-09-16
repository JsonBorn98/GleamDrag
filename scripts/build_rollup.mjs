import { execFileSync } from 'node:child_process';

import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import os from "node:os";
import pathLib from 'node:path';
import * as rollup from 'rollup';
import svelte from 'rollup-plugin-svelte';
import autoPreprocess from 'svelte-preprocess';


const useCustomElement = ["components"]

export default function (opts) {
	const { profile, websocketServer, src, dist, entryPoints, target, testSuite } = opts

	const isProd = profile.toLowerCase() === 'prod';
	const sourceMap = !isProd

	// Read build metadata in-process (git via execFileSync, timestamps and
	// versions from the running runtime) instead of shelling out to GNU
	// tools (`date --rfc-3339`, `npx rollup --version`), which do not exist
	// on a bare Windows install.
	const safeEnvVar = {
		commitId: execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(),
		date: new Date().toISOString(),
		nodeVersion: process.version,
		rollupVersion: rollup.VERSION,
		os: os.platform(),
		profile,
		// mocha_init reads the camelCase `webSocketServer`; the snake_case
		// key upstream injected here never matched, so no test event
		// reached the websocket server.
		webSocketServer: websocketServer,
		target,
		testSuite: testSuite ?? "",
	}

	function getPlugins(entrypoint) {
		return [
			commonjs(),
			replace({
				values: {
					// avoid "Function constructor" warning
					"Function('return this')()": "globalThis",
				},
				delimiters: ["", ""],
				preventAssignment: true
			}),
			replace({
				// openMocha reads the suite through __ENV.testSuite — the same
				// channel mocha_init uses for webSocketServer (fixture red leg).
				__ENV: JSON.stringify(safeEnvVar),
				__BUILD_PROFILE: JSON.stringify(profile),
				preventAssignment: true
			}),
			svelte({
				preprocess: autoPreprocess(),
				compilerOptions: {
					customElement: useCustomElement.includes(entrypoint)
				}
			}),
			typescript({ sourceMap: false }),
			resolve({ browser: true }),
			isProd && terser(),
		]
	}

	const output = []

	for (const e of entryPoints) {
		output.push({
			external: ["chai", "mocha", "Mocha"],
			input: pathLib.join(src, e, "main.ts"),
			output: {
				sourcemap: sourceMap,
				globals: {
					"chai": "chai",
					"mocha": "mocha",
					"Mocha": "Mocha"
				},
				file: pathLib.join(dist, e, "main.js"),
				format: 'iife'
			},
			plugins: getPlugins(e)
		})
	}

	return output
}