# 2026-07-28 — T-036: package focus-spec-mcp as its own npm publish shim

## Task

Spec `.agents/specs/focus-mcp-v1.md` "Packaging / worker / demo" section,
task T-036. Acceptance: `packages/focus-spec-mcp/` with package.json (name,
bin, files whitelist, prepack), README, NOTICE (FOCUS CC BY + no-endorsement),
server.json; root `files` narrowed so tarballs don't cross-contaminate
(packaging test both directions); focus tarball <1MB with
`dist/servers/focus/main.js` + `data/focus`; a test packs into scratch,
installs, runs `--version`; gates green.

## What I did

1. **Dependency audit** — grepped non-test imports under
   `src/servers/focus/` + `src/shared/focus/` + what `src/shared/index.ts`'s
   barrel re-exports transitively. Confirmed the focus server's actual
   runtime module graph touches only `@modelcontextprotocol/sdk`, `zod`,
   `ajv`/`ajv-formats`, and node builtins — `cheerio`/`domhandler` (used by
   `src/shared/md.ts`) are crawler-only and never reached, so the shim's
   `dependencies` need only the first four.

2. **`packages/focus-spec-mcp/`** — package.json (`bin` →
   `dist/servers/focus/main.js`, matching `main.ts`'s
   `new URL("../../../data/focus"/"../../../package.json", import.meta.url)`
   relative-path assumptions, which only resolve correctly if the package
   root sits 3 levels above `dist/servers/focus/main.js` — verified by
   actually running the packed+installed bin, not just by inspection),
   README.md, NOTICE.md (FOCUS spec text CC BY 4.0 attribution — currently
   missing from root NOTICE.md, tracked as an open question — + official
   sample data CC BY 4.0 + no-endorsement note + code MIT), LICENSE (copy
   of root), server.json (MCP registry, mirrors root's shape).

3. **`scripts/pack-focus.mjs`** (the package's `prepack`) — stages
   `dist/servers/focus` + `dist/shared` (needed: the server's relative
   imports reach into `shared/`, including its `focus/` subfolder) +
   `data/focus` into the package dir, rebuilding root `dist/` first if
   missing. First version logged its progress line to stdout via
   `console.log` — broke `npm pack --json`'s stdout when prepack runs
   inline with it (`npm pack --dry-run --json` DOES run prepack, confirmed
   empirically), since the log line interleaved with the JSON. Fixed by
   moving it to `console.error`. Caught this by actually running the
   packaging test rather than assuming the script was fine because it
   "looked right" — the failure only showed up under `--json`, not under
   plain `npm pack`.

4. **Root `package.json` `files`** narrowed from bare `"dist"` to
   `dist/index.js`, `dist/servers/framework`, `dist/crawlers/framework`,
   `dist/shared` — excludes `dist/servers/focus` and `dist/crawlers/focus`.
   `data/focus` was already absent from root `files` (only `data/framework`
   was listed), so no change needed there.
   **Known, accepted leftover:** `dist/shared/focus/*` (schemas/types, a
   few KB) still ships in the framework tarball, because
   `src/shared/index.ts` does `export * from "./focus/..."` and ESM
   evaluates a barrel's entire reachable module graph on import regardless
   of which name is destructured — every framework/crawler file that
   imports anything from `shared/index.js` transitively requires those
   files to exist on disk. Untangling the barrel so each server only pulls
   in its own shared code would touch ~15 import sites across
   `src/servers/framework/` and `src/crawlers/framework/` — a real refactor,
   out of scope for a packaging-only task. Recorded in activeContext.md's
   open questions. The acceptance criterion's literal ask (no
   `dist/servers/focus`, no `data/focus` in the framework tarball; and the
   reverse for focus) is met exactly.

5. **`src/packaging.test.ts`** (matches the existing `src/**/*.test.ts`
   vitest glob — no config change needed; `tests/**` is a protected path
   per AGENTS.md). Three tests:
   - `npm pack --dry-run --json` at repo root → asserts no
     `dist/servers/focus/`/`data/focus/` paths, and sanity-checks the
     framework server/data are still present.
   - `npm pack --dry-run --json` in `packages/focus-spec-mcp/` → asserts no
     `dist/servers/framework/`/`data/framework/` paths, contains
     `dist/servers/focus/main.js` + `data/focus/`, and the packed
     (compressed) tarball size is under 1MB via the JSON result's `size`
     field (not summed uncompressed file sizes — first draft used
     `unpackedSize`-equivalent and failed at 1.56MB; the acceptance
     criterion means the actual downloadable artifact).
   - Real `npm pack` to a mktemp scratch dir, `npm install <tgz> --offline`
     into a second mktemp scratch dir, run the installed `.bin` symlink
     with `--version`. `--offline` works because
     `@modelcontextprotocol/sdk`/`ajv`/`ajv-formats`/`zod` at these exact
     versions are already-resolved root project dependencies, hence
     already in the local npm cache — verified standalone
     (`npm install zod@^4.4.3 --offline` in an empty scratch dir succeeds)
     before relying on it in the test, so the test never depends on
     network access.

6. `.gitignore` += `packages/*/data/` (the prepack-staged `data/focus` copy);
   `packages/focus-spec-mcp/dist/` is already covered by the existing
   repo-wide `dist/` ignore rule. Only the 5 authored files
   (package.json, README.md, NOTICE.md, LICENSE, server.json) are committed
   under `packages/focus-spec-mcp/`.

## Evidence

- `npm run build` → clean.
- `npx vitest run src/packaging.test.ts` → 3/3 pass (manual run before the
  full gate pass, to iterate quickly on the stdout/size bugs above).
- `./scripts/agentic gates` → PASS (format, lint, typecheck, test 339/339,
  designs, integrity — 1 pre-existing WARN about diff breadth vs
  origin/main from the whole loop's accumulated commits, not this task —
  memory).
- `./scripts/agentic gates --tier all` → PASS, including build (full tier).
- Manually observed the actual behavior end-to-end (not just gate output):
  packed `focus-spec-mcp-1.0.0.tgz` = 235,314 bytes (well under 1MB);
  installed into a scratch dir via `npm install <tgz> --offline`; ran
  `node_modules/.bin/focus-spec-mcp --version` →
  `focus-spec-mcp v1.0.0 (FOCUS spec versions: 1.0, 1.2; latest 1.2)`.
  Also manually confirmed (via `tar -tzf`) the framework tarball built from
  the narrowed root `files` contains no `servers/focus` or `data/focus`
  paths, and that `node dist/servers/framework/main.js --version` still
  works after the narrowing.

## Next

T-037 (Cloudflare Worker) and T-038 (static demo app) are next per the
spec's task order. See activeContext.md for the full next-steps list and
open questions (barrel leakage, root NOTICE.md gap for FOCUS spec text —
now filled in for the *shim's* NOTICE.md but root's is still missing it).
