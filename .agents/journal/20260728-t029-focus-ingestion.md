## T-029: ingest FOCUS v1.0 and v1.2 from git tags into data/focus — 2026-07-28T07:30:00Z

- Did:
  - Added `src/crawlers/focus/`: `urls.ts` (REPO/ORIGIN/VERSIONS with
    pinned expected column counts 43/57, `isValidFocusBody`), `ingest.ts`
    (enumerates `columns.mdpp`'s `!INCLUDE` list, asserts the pinned
    count, cross-checks the jsDelivr flat tree for columns and
    attributes, fetches every column/attribute/glossary/CHANGELOG file
    via `CachedFetcher`), `parse/columns.ts` + `parse/attributes.ts`
    (structured field extraction from the H1+prose+`##`-section format,
    never throw — degrade to `parse_quality: "markdown_only"` on
    failure), `parse/table.ts` (pipe-table parser + normative
    MUST/SHOULD requirements extractor — prefers top-level bullets,
    falls back to prose-sentence splitting since both forms occur
    verbatim across the two tags), `parse/sections.ts` (H2-section
    lookup), `diff.ts` (1.0→1.2 diff by ColumnId, source-cited),
    `emit.ts` (per-version idempotent writer — skips the write
    entirely, including `crawled_at`, when every file's sha256 matches
    disk, so a warm-cache refresh is a true no-op).
  - Added `src/shared/focus/types.ts` (FocusColumn, FocusAttribute,
    FocusVersionManifest, FocusIndex, FocusDiff — re-exported from
    `shared/index.ts` since T-030's server will load them too).
  - Extended `CachedFetcher` (`src/shared/http.ts`) with an optional
    `isValidBody` override — the default HTML-page check (min length +
    `<h1>`) doesn't apply to raw markdown/JSON from GitHub. Additive,
    default behavior unchanged (framework crawler untouched).
  - Committed 7 fixture files (5 column .md + 2 attribute .md, verbatim
    from the real tags) as parser-test fixtures; added
    `src/crawlers/focus/fixtures/` (and `data/focus/`) to
    `.prettierignore` — prettier reflows tables and `*em*` → `_em_`,
    which would silently corrupt these as byte-verbatim fixtures (caught
    this the hard way: ran `prettier --write`, then diffed a fixture
    against a fresh curl and found the corruption, re-fetched them).
  - Ran the real crawl: `node dist/crawlers/focus/cli.js` → wrote
    `data/focus/{1.0,1.2}/` + `data/focus/derived/diff-1.0-1.2.json` +
    `data/focus/index.json`.
- Result (evidence):
  - Counts: 43 columns (v1.0), 57 columns (v1.2) — matches spec's pinned
    counts exactly. 100% `parse_quality: "parsed"` (0 markdown_only) for
    both columns and attributes in both versions — real files are
    well-structured, no fallback path exercised in production data (the
    fallback path itself IS covered by a synthetic malformed-file test in
    `columns.test.ts`/`attributes.test.ts`).
  - Diff: 14 added columns (BillingAccountType,
    CapacityReservation{Id,Status}, CommitmentDiscount{Quantity,Unit},
    InvoiceId, PricingCurrency{,ContractedUnitPrice,EffectiveCost,
    ListUnitPrice}, ServiceSubcategory, Sku{Meter,PriceDetails},
    SubAccountType), 0 removed, 43 changed — 14 added matches spec's
    pinned "14 added columns" exactly.
  - Byte-identical refresh: copied `data/focus/` aside, re-ran the CLI
    against the warm `.cache/crawl-focus/` (gitignored) — log showed
    "0 network, 128 cached"; `diff -rq` against the pre-refresh copy
    reported no differences.
  - `du -sh data/focus` = 852K (budget 3MB).
  - `./scripts/agentic gates` → PASS (format, lint, typecheck, test,
    designs, integrity, memory); 226/226 tests pass (+23 new: table,
    columns, attributes, diff, emit — all offline, no live network in
    the test suite itself, only in the cited manual crawl run above).
- Next: T-030 — build the version-aware focus stdio server on
  `data/focus/`, loading each version dir through `loadArtifactGeneric`
  (T-028) into `Map<spec_version, FocusArtifact>`; will need to define
  FOCUS's own `ARTIFACT_FILES` JSON schemas (not produced by this task —
  the crawler doesn't emit `schema/*.schema.json`, mirroring how
  `loadArtifact` for framework keeps schemas in `src/shared/schemas.ts`
  rather than reading them off disk).
