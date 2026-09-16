// Sync WXT public/ (and public-test/) from the single sources.
//
// public/ and public-test/ are committed so a fresh checkout builds without
// this script, but the copies here are the single source of truth feeding
// both: src/_locales + src/icon (legacy chain), node_modules vendor css and
// test libs. Run after upgrading mocha/chai/simpledotcss or editing locales.
//
// Usage: node scripts/sync_public.mjs

import fs from "node:fs"
import pathLib from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = pathLib.resolve(pathLib.dirname(fileURLToPath(import.meta.url)), "..")

const baseAssets = [
	{ src: pathLib.join(repoRoot, "src", "_locales"), dest: "_locales" },
	{ src: pathLib.join(repoRoot, "src", "icon"), dest: "icon" },
	{ src: pathLib.join(repoRoot, "node_modules", "simpledotcss", "simple.min.css"), dest: pathLib.join("res", "simple.min.css") },
]

// Test-build-only assets (public-test/ is a superset: base + test).
const testAssets = [
	{ src: pathLib.join(repoRoot, "node_modules", "mocha", "mocha.js"), dest: pathLib.join("test", "mocha.js") },
	{ src: pathLib.join(repoRoot, "node_modules", "mocha", "mocha.css"), dest: pathLib.join("test", "mocha.css") },
	{ src: pathLib.join(repoRoot, "node_modules", "chai", "chai.js"), dest: pathLib.join("test", "chai.js") },
]

function copyRecursive(src, dest) {
	const destAbs = pathLib.join(repoRoot, dest)
	if (fs.statSync(src).isFile()) {
		fs.mkdirSync(pathLib.dirname(destAbs), { recursive: true })
		fs.copyFileSync(src, destAbs)
		return
	}
	fs.cpSync(src, destAbs, { recursive: true })
}

for (const dir of ["public", "public-test"]) {
	for (const asset of baseAssets) {
		copyRecursive(asset.src, pathLib.join(dir, asset.dest))
	}
}
for (const asset of testAssets) {
	copyRecursive(asset.src, pathLib.join("public-test", asset.dest))
}
console.log("synced public/ and public-test/")
