# Repository Guidelines

## Project Context

This is a personal fork of GleamDrag (origin: JsonBorn98/GleamDrag). The upstream project is long unmaintained and no longer works on modern browsers. This repository is now personally maintained: the goal is to work with AI agents on major repairs, refactoring, and feature updates so the extension matches current browser extension standards. It is maintained for personal use only:

- Never open PRs against the upstream repository; the remote exists for syncing and personal backup only.
- External PRs are not accepted in principle; work records live in the local `.scratch/` directory.

## Project Structure & Module Organization

GleamDrag is a Manifest V3 browser extension written in TypeScript and Svelte. Runtime code lives under `src/`: `background/` handles extension services, `content_scripts/` implements page interactions, `options/` contains the settings UI, and `components/` provides reusable Svelte UI. Configuration, state, request resolution, and shared utilities have dedicated directories. Locale catalogs are in `src/_locales/`, static images in `src/icon/`, and build tooling in `scripts/`. Tests are colocated with their subjects as `*.test.ts`. Generated packages and browser-specific output belong in `build/` and must not be committed.

## Build, Test, and Development Commands

The repository pins dependencies through `bun.lock` and CI (`bun install --frozen-lockfile`), so use Bun rather than another package manager (see ADR 0001 in `docs/adr/`).

The build is being migrated from the legacy Makefile/rollup chain to WXT (see `wxt.config.ts`); both chains coexist until the dual MV3 artifacts are verified in real browsers and the legacy scripts are deleted.

- `bun install` installs the locked dependencies.
- `bun run build` builds Firefox and Chromium MV3 artifacts with WXT (`.output/firefox-mv3`, `.output/chromium-mv3`).
- `bun run zip` builds both targets and zips them (`.output/gleamdrag-<version>-<target>.zip`).
- `bun run build:test` builds the test artifact (WXT `GLEAMDRAG_TEST_BUILD=1`: ships the in-extension test page and the Firefox-only CSP override).
- `node scripts/test_wxt.mjs` builds nothing itself; it launches web-ext against `.output/firefox-mv3` and runs the in-extension Mocha suite over WebSocket (build first with `bun run build:test` plus `GLEAMDRAG_WS_SERVER`).
- `bun x tsc --noEmit` performs a standalone TypeScript check (strict; extends `.wxt/tsconfig.json`).
- `make ext-firefox` / `make ext-chromium` build via the legacy rollup chain (`build/<target>/dist`) — legacy, removed after the WXT artifacts pass real-browser verification.
- `make test` runs the legacy in-extension suite; `bun run verify:exit-code` verifies the exit-code contract through it.
- `make clean` removes legacy build output; `rm -rf .output` removes WXT output.

## Coding Style & Naming Conventions

Match adjacent code: use TypeScript modules, tabs for indentation in `.ts` files, and concise double-quoted strings where already established. Use `PascalCase` for classes and exported types, `camelCase` for functions and variables, and lowercase snake_case for multiword module filenames (for example, `var_substitute.ts`). Keep Svelte components focused and place component-specific logic beside the component. No repository-wide formatter or ESLint configuration is present, so avoid unrelated formatting churn and rely on TypeScript plus the Firefox `web-ext` validation step.

## Testing Guidelines

Tests use Mocha with Chai assertions and are initialized by `src/test/mocha_init.ts`. Add or update a colocated `*.test.ts` file for behavioral changes. Name `describe` blocks after the module or feature and `it` blocks after observable behavior. Run `make test` before submitting; there is currently no enforced coverage percentage.

## Commit & Pull Request Guidelines

Follow the history's Conventional Commit-style prefixes: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, and `release:`. Keep subjects imperative and scoped to one change. Pull requests should explain behavior and motivation, list Firefox and Chromium validation performed, link relevant issues, and include screenshots or recordings for options-page or interaction changes. Do not commit `build/`, `node_modules/`, IDE metadata, or local environment files.

## Agent skills

### Issue tracker

Issues and specs are stored as markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five default standard labels (needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: repository-root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.
