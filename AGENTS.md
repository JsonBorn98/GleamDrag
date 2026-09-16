# Repository Guidelines

## Project Context

This is a personal fork of GleamDrag (origin: JsonBorn98/GleamDrag). The upstream project is long unmaintained and no longer works on modern browsers. This repository is now personally maintained: the goal is to work with AI agents on major repairs, refactoring, and feature updates so the extension matches current browser extension standards. It is maintained for personal use only:

- Never open PRs against the upstream repository; the remote exists for syncing and personal backup only.
- External PRs are not accepted in principle; work records live in the local `.scratch/` directory.

## Project Structure & Module Organization

GleamDrag is a Manifest V3 browser extension written in TypeScript and Svelte. Runtime code lives under `src/`: `background/` handles extension services, `content_scripts/` implements page interactions, `options/` contains the settings UI, and `components/` provides reusable Svelte UI. Configuration, state, request resolution, and shared utilities have dedicated directories. Locale catalogs are in `src/_locales/`, static images in `src/icon/`, and build tooling in `scripts/`. Tests are colocated with their subjects as `*.test.ts`. Generated packages and browser-specific output belong in `build/` and must not be committed.

## Build, Test, and Development Commands

The repository pins dependencies through `bun.lock` and CI (`bun install --frozen-lockfile`), so use Bun rather than another package manager (see ADR 0001 in `docs/adr/`).

- `bun install` installs the locked dependencies.
- `make ext-firefox` builds and validates a debug Firefox package.
- `make ext-chromium` builds the Chromium variant.
- `BUILD_PROFILE=prod make ext-firefox` creates a production package; artifacts appear under `build/`.
- `make build-watch TARGET=firefox` rebuilds on source changes.
- `make test` builds the `firefox-test` target, launches Firefox, and runs the browser-based Mocha suite.
- `bun x tsc --noEmit` performs a standalone TypeScript check.
- `make clean` removes generated build output.

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
