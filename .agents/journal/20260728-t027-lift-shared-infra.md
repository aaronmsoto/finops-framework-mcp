## T-027: lift shared crawler/server infra into src/shared — 2026-07-28T00:00:00Z

- Did: split every generic piece of infra named in the acceptance criteria
  out of `src/crawlers/framework` and `src/servers/framework` into new
  `src/shared` modules, with framework code re-importing (or, where a call
  site inherently needs its own module context — `paginate`'s `dataVersion`,
  `detectDirectRun`'s `import.meta.url` — a one-line delegating wrapper):
  - `src/shared/markdown/frontmatter.ts` (+ test) — moved verbatim.
  - `src/shared/markdown/compose.ts` — `ComposeError`, `guard`, `bulletLines`,
    `heading`, `assembleBody`, `doc`. Framework `compose.ts` re-exports
    `ComposeError` (its test imports it from there) and keeps only the
    per-entity `composeXxxMd` composers.
  - `src/shared/markdown/derive.ts` — the generic dialect splitters
    (`splitHeadingSections`, `parseHeadingAttr`, `parseOrderedSlugHeading`,
    `parseSlugHeading`, `parseFlatBulletList`, `extractFencedCode`,
    `stripInlineMd`, `str`, `num`, `walkMarkdownFiles`). None of these were
    previously exported from the framework file, so no re-export needed —
    framework `derive.ts` keeps `parseWpIdHeading`, `parseExampleKpis`,
    `deriveMaturityActions`, and all per-entity derivers.
  - `src/shared/md.ts` — `htmlToMd` (now takes `origin` as an explicit 3rd
    arg instead of importing framework's `ORIGIN`), `normalizeHeading`,
    `textOf`, `parseList`. All ~13 call sites across `cli.ts`,
    `parse/capability.ts`, `parse/sections.ts`, `parse/helpers.ts` updated to
    import from shared and pass `ORIGIN` explicitly (no test file existed for
    the old `md.ts`, so no test moves needed).
  - `src/shared/sanitize.ts` (+ test) — moved verbatim, already fully generic.
  - `src/shared/http.ts` (+ test) — `CachedFetcher` now takes
    `{ origin, userAgent }` in its constructor instead of importing
    framework's `ORIGIN`/`USER_AGENT`/`URLS.robots`; `parseRobots` unchanged.
  - `src/shared/search.ts` — generic `SearchDoc<T>`/`SearchResult<T>`,
    `tokenize`, `addTokens`, `snippetOf`, `search`. Framework `search.ts`
    keeps only `buildSearchIndex` (artifact-specific) and re-exports `search`.
  - `src/shared/tools.ts` — `RO`, `Cursor`, `encodeCursor`/`decodeCursor`,
    `cursorContext`, `ContentBlock`/`ToolResult`, `ok`/`err`/`isErr`,
    `paginate` (now takes `dataVersion` as an explicit param). Framework
    `tools.ts` keeps a one-line `paginate` wrapper closing over its own
    `dataVersion`.
  - `src/shared/footer.ts` — `ccByFooter(opts)` parameterized on
    `sourceUrl`/`licenseHolder`/`packageName`/`dataVersion`/`crawledAt`.
    Framework `render.ts`'s `footer()` now just supplies those fields.
  - `src/shared/direct-run.ts` — `isDirectRunOf(moduleUrl)`. `main.ts`'s
    `detectDirectRun()` is now a one-line wrapper passing its own
    `import.meta.url` (unavoidable — `main.test.ts` calls `detectDirectRun()`
    with zero args and expects it to compare against `main.ts` specifically).
- Result: `npx tsc -p tsconfig.build.json --noEmit` clean; `npx eslint src/`
  clean (boundary rule: shared may not import crawler/server, and vice
  versa — still enforced, now more load-bearing); `./scripts/agentic gates`
  all green (format/lint/typecheck/test/designs/integrity/memory), 197/197
  tests pass with assertion content unchanged (only import paths in the few
  moved test files: `frontmatter.test.ts`, `http.test.ts`, `sanitize.test.ts`
  — each moved as-is since their own relative import `./x.js` did not need
  editing). Grep evidence: `class ComposeError`, `function scanForInjection`,
  `class CachedFetcher`, `const RO =`, `function cursorContext`, `function
  tokenize`, `function ccByFooter`, and the `realpathSync`-based
  direct-run comparison no longer appear anywhere under
  `src/crawlers/framework` or `src/servers/framework` — confirmed by grep.
  Behavior check: ran `node dist/crawlers/framework/cli.js derive
  --artifact-dir data/framework` — "No changes — artifact untouched
  (version stays 2.1.1)" (0 network), proving the refactored
  frontmatter/compose/derive pipeline reproduces the committed artifact
  byte-identically. Also smoke-tested the built stdio server directly
  (`node dist/servers/framework/main.js`): `--version` printed correctly,
  and a raw `initialize` JSON-RPC request over stdin got a well-formed
  response. `npm pack --dry-run` file-list diffed against a clean baseline
  build (via `git stash -u` + rebuild dist from scratch on both sides):
  only `dist/**` paths differ (crawler-local `http.js`/`md.js`/
  `sanitize.js`/`markdown/frontmatter.js` gone, `dist/shared/*` equivalents
  present) — `data/framework`, `README.md`, `LICENSE`, `NOTICE.md` unchanged.
- Next: T-028 (generic artifact-load seam) can now build on
  `src/shared/markdown/{frontmatter,derive}.ts` and `src/shared/http.ts`
  directly for the FOCUS ingestion pipeline, per
  `.agents/specs/focus-mcp-v1.md`.
