
import fs from 'node:fs'
import pathLib from 'node:path'

// Locate a usable Firefox binary without hardcoding a developer-edition
// alias. Resolution order: GLEAMDRAG_FIREFOX_BIN override, then standard
// install locations. Returns a path, or null when no Firefox can be found.
//
// The returned path uses forward slashes: web-ext routes it through
// fx-runner, whose shell-quote parsing eats backslashes (`C:\Program
// Files\...\firefox.exe` becomes `C:Program FilesMozilla Firefox<FF>irefox.exe`,
// an ENOENT). Node and Firefox both accept forward slashes on Windows.
export function detectFirefoxBinary() {
	const normalize = (p) => p.split(pathLib.sep).join("/")

	const override = process.env["GLEAMDRAG_FIREFOX_BIN"]
	if (override && override.length > 0) {
		return normalize(override)
	}

	const candidates = [
		// standard per-user install (Windows)
		pathLib.join(process.env["LOCALAPPDATA"] ?? "", "Mozilla Firefox", "firefox.exe"),
		// standard machine-wide install (Windows)
		"C:\\Program Files\\Mozilla Firefox\\firefox.exe",
		"C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe",
	]

	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) {
			return normalize(candidate)
		}
	}
	return null
}
