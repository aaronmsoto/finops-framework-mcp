## T-018 — Slim runtime deps: load cheerio lazily in the crawler

- task: T-018 — spec: .agents/specs/loop-harness-improvements.md (v1.1
  candidate list, "cheerio slimming")

### What I did

- `package.json`: moved `cheerio` from `dependencies` to `devDependencies`.
  Regenerated `package-lock.json` via `npm install --package-lock-only` —
  cheerio's own subtree (cheerio-select, dom-serializer, boolbase, etc.) now
  carries `"dev": true`; incidentally synced the lockfile's stale root
  `version` (0.1.0 → 1.0.0) to match package.json, harmless drift fix.
- `src/crawlers/framework/parse/helpers.ts`: removed the static
  `import * as cheerio from "cheerio"`. Added `resolveCheerio(requireFn =
  createRequire(import.meta.url))`, which requires cheerio only when called,
  memoized in a module-level `cheerioModule` variable set on first `load()`
  call. On resolution failure it throws `CHEERIO_MISSING_MESSAGE`, which
  names `npm install --save-dev cheerio` as the fix and explains cheerio is
  only needed by `cli.js refresh`.
- `src/crawlers/framework/cli.ts`: removed its own static cheerio import;
  `htmlFragmentToMd` now calls the shared lazy `load` from
  `parse/helpers.js` instead of `cheerio.load` directly.
- `derive` (`markdown/derive.ts`) never referenced cheerio in the first
  place (markdown-to-JSON only, confirmed by grep) and the MCP server can't
  reach crawler code at all (existing ESLint `no-restricted-imports`
  boundary) — so both of the "must still work" surfaces needed no changes.
- New test `src/crawlers/framework/parse/helpers.test.ts`: exercises
  `resolveCheerio` with an injected failing `requireFn` to hit the
  missing-cheerio error path without needing to actually uninstall the
  package in CI; also asserts the message names the install command, and
  that `load()`/`resolveCheerio()` still work normally when cheerio is
  present.

### Why createRequire instead of a top-level dynamic `import()`

`load()` is called synchronously from 9 call sites across
`parse/sections.ts` and `parse/capability.ts`, whose own callers (and their
existing tests) are all synchronous. Converting to `await import("cheerio")`
would have forced every parser function and both test files (capability.
test.ts, sections.test.ts) to go async — a much bigger diff than "load
cheerio lazily" calls for. cheerio ships a dual ESM/CJS package (confirmed:
its `exports` map has a `require` condition), so
`createRequire(import.meta.url)("cheerio")` is a legitimate lazy,
runtime-only resolution: nothing touches the cheerio module graph until the
first HTML actually needs parsing, and the whole thing stays synchronous.

### Evidence

- `./scripts/agentic gates` → PASS (format, lint, typecheck, test 189/189 —
  up from 186, the 3 new helpers.test.ts cases —, designs, integrity,
  memory).
- Manual behavior check beyond gates: `rm -rf dist && npm run build`, then
  `mv node_modules/cheerio node_modules/cheerio.hidden` to simulate a real
  missing install:
  - `node dist/crawlers/framework/cli.js derive --artifact-dir
    data/framework --report-dir /tmp/.../report` → succeeded, "derived 22
    capabilities, 88 kpis, 489 actions from markdown (0 network)", 0
    changes.
  - `node dist/servers/framework/main.js` → started fine, printed "finops-
    framework MCP server ready on stdio (data v2.1.1, 22 capabilities)".
  - A throwaway script importing `parsePrinciples` from
    `dist/crawlers/framework/parse/sections.js` and calling it on a small
    HTML fixture → threw exactly `CHEERIO_MISSING_MESSAGE` ("cheerio is
    required to crawl and parse FinOps framework HTML... run `npm install
    --save-dev cheerio` and retry").
  - Restored `node_modules/cheerio`, re-ran the same script → parsed
    normally, confirming no permanent breakage from the memoization.
  - Rebuilt dist and re-ran `./scripts/agentic gates` clean once more after
    restoring cheerio, to make sure the committed `dist` output isn't
    derived from the temporarily-hidden state.

### Next

- T-019 (`--version` flag) is next in the queue per `tasks next`.
