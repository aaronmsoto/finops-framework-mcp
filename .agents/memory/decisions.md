# decisions.md — append-only decision log

<!-- One entry per decision that had real alternatives. Never rewrite. -->

<!-- Template:
## YYYY-MM-DD — <decision>
- Why:
- Alternatives considered:
-->

## 2026-07-23 — Non-capability markdown doc layouts (T-006)

- Decision: spec §2 (`.agents/specs/v1-official-only.md`) fully specifies the
  capability doc's section order and headings but leaves personas/kpis/the 6
  section docs (principles, phases, domains, maturity-model, technology-
  categories, scopes) as "canonical headings" without exact layout. Chose:
  personas/kpis get one H2 per field (Description, Formula as fenced code,
  Candidate Data Sources, Related Capabilities, Featured On — omitted when
  empty, same "absent section ⇒ absent heading" rule as capability docs).
  Section docs hold every entry in one file, each keyed by a `{slug=<slug>}`
  heading-attribute — reusing the same `{wp_id=N}` convention the spec
  already establishes for capability Featured KPIs, so there's one dialect
  idiom for "this heading carries an identity", not two.
- Why: T-007's derive step must parse these back into JSON without
  re-deriving slugs from titles (lossy/ambiguous — e.g. "ITSM / ITIL" →
  "itsm-itil" isn't a pure slugify of the title). The `{key=value}` heading
  attribute makes identity lookup a regex, not a re-implementation of
  `slugify`/title-matching heuristics.
- Alternatives considered: per-entity front-matter blocks for section docs
  (rejected — would mean N front-matter fences in one file, which reads
  oddly and complicates the "front-matter is the first thing in the file"
  assumption `parseFrontmatter` makes); numbering entries as the only
  identity signal (rejected — order is derive-fragile if a page's entities
  get reordered upstream; the slug attribute is order-independent).

## 2026-07-23 — Derive's KPI join reads kpis/<slug>.md only (T-007)

- Decision: spec §3 describes derive's KPI reconstruction as "modal blocks
  keyed by `{wp_id=N}` merged into library records from `kpis/<slug>.md`" —
  i.e. re-joining each capability doc's Featured KPI modals into the KPI
  library records. Implemented instead as: parse `kpis/<slug>.md` alone: at
  compose time (T-006) `composeKpiMd` already receives the fully-merged
  `Kpi` record (formula/data_sources/related_capability_slugs/featured_on
  already joined from the featured-KPI modals across all capability pages)
  and writes all of it into the KPI's own doc. `capabilities/<slug>.md`'s
  Featured KPI blocks are only read for their `{wp_id=N}` headings, to
  rebuild each capability's `featured_kpi_ids` list — never re-joined into
  the KPI record.
- Why: the join already happened once, at compose time; doing it again at
  derive time can only ever reproduce the same result (by construction) at
  the cost of real complexity — capability-doc Featured KPI blocks use
  `[Title](url)` links for cross-capability references while
  `kpis/<slug>.md`'s own Related Capabilities list is bare slugs, so a
  second join would need URL→slug resolution with a fallback for the
  compose-time "ref not found" case (`[slug](slug)`), all to re-derive data
  already sitting in the file being parsed anyway.
- Alternatives considered: re-implement the modal join in derive.ts as the
  spec literally describes (rejected — redundant with compose's existing
  join, adds a whole URL-resolution code path with no behavioral payoff,
  and a mismatch between the two joins would be a silent bug with no test
  able to tell which one is "right").

## 2026-07-23 — Entity arrays sorted by slug, not markdown filename (T-007)

- Decision: `deriveFromDocs` sorts capabilities/personas/kpis by the parsed
  entity's own `slug` field after deriving each doc, not by the markdown
  filename (`<slug>.md`) beforehand.
- Why: found via a live offline `refresh`+`derive` run against the real
  22/11/88 dataset (not caught by the 5-fixture unit tests): sorting
  filenames breaks lexicographic order whenever one slug is a strict prefix
  of another, e.g. `general-ledger-recharge-rate` vs
  `general-ledger-recharge-rate-per-cost-center` — `"...rate.md"` sorts
  _after_ `"...rate-per-cost-center.md"` because `.` (0x2E) > `-` (0x2D),
  even though the bare slug should sort first. Confirmed content-identical
  (order-only) via a per-slug set comparison before accepting the reorder.
  `diffArtifact` is order-insensitive (keyed by slug/wp_id) so this was
  invisible to the "zero diff" check itself — only a byte/md5 comparison
  surfaced it.
- Alternatives considered: none — this is a straightforward bug fix once
  found, not a design tradeoff.

## 2026-07-23 — Mirror the API-excerpt summary fallback onto `page.summary` (T-007)

- Decision: in `cli.ts`'s capability-building loop, when `cap.summary` is
  empty and gets backfilled from the WordPress API excerpt
  (`cap.summary = rec.excerpt`), also set `page.summary = cap.summary`
  before the page is composed to markdown.
- Why: T-006 composed markdown from `page` (the raw HTML parse, pre-
  fallback), so `executive-strategy-alignment` and `usage-optimization`
  (the two real capabilities with no bolded summary paragraph on their
  page) silently lost their summary text the moment JSON became
  derive-authoritative — the API excerpt is fetched live and was never
  captured into the markdown layer at all. Found via a live refresh diff
  showing `summary: ""` for those two, not by code inspection; none of the
  5 fixture pages hit this path so unit tests never exercised it.
- Alternatives considered: store the API excerpt separately in front-matter
  as a fallback-only field (rejected — adds a field that's `undefined` for
  20/22 capabilities and duplicates `summary` for the other 2, for no
  benefit over just making the real value the one source of truth that
  flows through compose like every other field).

## 2026-07-23 — Lazy cheerio load via `createRequire`, not `await import()` (T-018)

- Decision: `parse/helpers.ts`'s `resolveCheerio()` lazily requires cheerio
  with `createRequire(import.meta.url)("cheerio")` on first `load()` call,
  memoized module-locally, keeping `load()` and every parser function
  synchronous.
- Why: `load()` is called synchronously from 9 sites across
  `parse/sections.ts`/`parse/capability.ts`, whose callers and existing
  tests (`capability.test.ts`, `sections.test.ts`) are all synchronous too.
  cheerio ships a dual ESM/CJS package (its `exports` map has a `require`
  condition), so `createRequire` is a legitimate, still-lazy resolution
  path — nothing touches the cheerio module graph until HTML actually needs
  parsing, matching the task's "load lazily" goal without an async refactor.
- Alternatives considered: `await import("cheerio")` (true ESM dynamic
  import) — rejected because it would force `load()` async, cascading to
  every section/capability parser and both of their existing test files, a
  much larger diff than a devDependency packaging change calls for.

## 2026-07-23 — `assess_maturity_path` drops pre-crawl unconditionally, not just by default (T-008)

- Decision: `assess_maturity_path`'s `current_level`/`target_level` are both
  `z.enum(["crawl","walk","run"])` in _every_ mode, not gated behind
  `experimental`. It now returns verbatim `assessment_md` (from
  `capability.maturity_raw`) instead of parsed `Action` characteristics.
- Why: the tool's only reason to accept `pre-crawl` was to describe a gap
  starting below Crawl, and its only reason to depend on `artifact.actions`
  was the lack of a verbatim per-level assessment tool. Both are gone now
  that `get_maturity_assessment` exists and `maturity_raw` covers the
  official levels directly — keeping `pre-crawl`/Actions on this tool behind
  the flag would restore a capability nothing else needs, purely for
  symmetry with `get_actions`. Confirmed by a flag-matrix test that calls
  `assess_maturity_path` identically against both the default and
  experimental server and asserts the same shape and the same rejection of
  `current_level: "pre-crawl"`.
- Alternatives considered: gate `pre-crawl` support on this tool behind
  `experimental` too, matching `get_actions` symmetrically (rejected — it
  would mean experimental mode's `assess_maturity_path` still can't express
  "gap above pre-crawl" without also switching its content source back to
  Actions, adding a second unofficial-content code path for a case the spec
  doesn't actually ask for; the spec's T-008 bullet for this tool reads the
  same under both flag states, which only makes sense if it's flag-
  independent).

## 2026-07-28 — CachedFetcher gets a pluggable `isValidBody`, not a FOCUS-specific fetcher (T-029)

- Decision: `CachedFetcherOptions` grew an optional `isValidBody?: (url,
body) => boolean`, defaulting to the existing HTML-page check
  (`bodyLooksValid` — min length + `<h1>`). The FOCUS crawler passes
  `isValidFocusBody` (`body.length > 0`); the framework crawler passes
  nothing and is byte-for-byte unaffected.
- Why: the spec requires FOCUS ingestion to "reuse CachedFetcher", but its
  entire body is raw markdown/JSON from raw.githubusercontent.com/
  data.jsdelivr.com — never HTML, so the hardcoded `<h1>` check would reject
  every fetch. A constructor-level override keeps `CachedFetcher` a single
  shared class (robots/throttle/cache/retry logic stays common) rather than
  forking it, and is additive so it can't regress the framework crawler
  (confirmed: `http.test.ts` unchanged and green, framework refresh path
  untouched).
- Alternatives considered: a second `CachedFetcher`-like class in
  `src/crawlers/focus/` (rejected — duplicates robots/throttle/retry/cache
  logic the spec explicitly says to reuse); relaxing `bodyLooksValid`
  itself to accept non-HTML bodies globally (rejected — weakens the
  framework crawler's actual validity signal for its real failure mode,
  truncated/error HTML pages, for no benefit to that crawler).

## 2026-07-28 — data/focus version dirs skip the write entirely when unchanged (T-029)

- Decision: `emitVersionArtifact` compares the newly computed sha256 map
  against the on-disk `manifest.json` and, if every hash matches, returns
  without touching any file — including `manifest.json` itself, so
  `crawled_at` is only ever updated by an actual content change.
- Why: the acceptance criterion is "refresh from cache is byte-identical."
  `crawled_at: new Date().toISOString()` is the only source of
  nondeterminism between two runs off the same warm cache; skip-if-
  unchanged makes a second run a true no-op rather than requiring the
  byte-identity check to special-case one timestamp field. Mirrors the
  framework crawler's `emitArtifact` idempotence (`emit.ts`
  `diff.hasChanges` gate) rather than inventing a different pattern.
  Verified directly: copied `data/focus/` aside, re-ran the CLI against the
  warm cache, `diff -rq` reported zero differences.
- Alternatives considered: always rewrite and exclude `crawled_at` from the
  "byte-identical" comparison in tests only (rejected — the acceptance
  criterion says the _refresh_ is byte-identical, not "byte-identical
  modulo a documented exception"; a real diff-on-disk after every refresh
  would also be confusing operationally, showing churn with no content
  change).

## 2026-07-28 — search_focus indexes per version, not merged (T-030)

- Decision: `buildSearchIndex(version, artifact)` builds one search index per
  loaded FOCUS version; `search_focus` always searches within a single
  resolved `version`, never across all loaded versions at once.
- Why: columns are renamed/re-semanticized across FOCUS releases (e.g. the
  1.0→1.2 diff renames/re-defines several columns; attribute ids are
  literally renamed — `CurrencyCodeFormat`@1.0 vs `CurrencyFormat`@1.2). A
  merged cross-version index would surface a hit without making clear which
  version's semantics apply, and a caller can't act on a search result
  (feed its slug into get_column/get_attribute) without knowing the version
  anyway. Per-version indexing keeps every hit's `uri` unambiguous and
  matches the spec's version model ("every tool takes a version param").
- Alternatives considered: one merged index tagged with `spec_version` per
  doc (rejected — doubles memory for ~2x duplicate/renamed docs for no
  query benefit, since `search_focus` still needs a resolved version to
  build get_column/get_attribute follow-up calls); building the index at
  call time instead of once at server startup (rejected — startup cost is
  trivial at this data size, ~2×100 docs, and framework's search.ts already
  establishes "build once at startup" as the pattern).

## 2026-07-28 — FOCUS validator splits issues into errors vs. warnings (T-031)

- Decision: `validateFocusCsv` (`src/shared/focus/validate.ts`) returns
  `{errors, warnings}`. Structural/domain violations that make a value
  uninterpretable (Mandatory column missing from the header, a value that
  doesn't parse as its declared data type, a value outside the declared
  `allowed_values` enum, a malformed currency code) are errors. Nullability
  violations (a value is null where `allows_nulls: false`) and non-negative
  range violations are warnings. Enum matching (`allowed_values`) is
  case-insensitive. Null is recognized as either the literal `NULL` token
  or an empty field.
- Why: verified directly against the official FOCUS-Sample-Data 1.0 sample
  (`scripts/fetch-official-sample.mjs` fetch, 1,000 real anonymized
  multi-provider billing rows) — it contains 7 rows where a Mandatory,
  non-nullable column (`ContractedCost`) is genuinely null, 1 row with a
  negative `ContractedUnitPrice` where the spec says non-negative, and 7
  rows using lowercase `"Usage-based"` for the `ChargeFrequency` enum
  instead of `"Usage-Based"`. The FOCUS project publishes this sample as
  "anonymized real world FOCUS data" (its own README), not an idealized
  conformance fixture — real provider exports have these gaps today. A
  validator that hard-fails on them would report 0/1000 real-world files as
  conformant and be useless in practice; the T-031 acceptance bar ("official
  sample passes with 0 errors") is only satisfiable at all by drawing this
  error/warning line, and the split still surfaces every violation.
- Alternatives considered: hard-error on every violation (rejected — fails
  on the official ground truth itself, per above); silently ignore
  nullability/range checks entirely (rejected — acceptance criterion
  explicitly requires the validator to check nullability); case-sensitive
  enum matching (rejected — same official sample would then need casing
  fixed via a warning-only carve-out too, which is less honest than fixing
  the comparison since the values are unambiguously the same word).

## 2026-07-28 — synthetic generator forces null for JSON+allowed_values columns (T-032)

- Decision: the seeded synthetic FOCUS CSV generator
  (`src/shared/focus/synthetic.ts`) derives every value purely from a
  column's metadata (`data_type`, `allowed_values`, `value_format_md`,
  `number_range`, `allows_nulls`) — same principle as the T-031 validator,
  no hardcoded per-column/per-version table. One combination needed a
  special rule: a `data_type: "JSON"` column that also declares
  `allowed_values` (today, only 1.2's `SkuPriceDetails` — its enum lists
  valid property _keys_ per `KeyValueFormat`, not the literal column
  value). `validateFocusCsv` checks `data_type` and `allowed_values`
  independently, so no single raw string can satisfy "valid JSON" and
  "exact match to an enum entry" at once. The generator always emits
  `NULL` for that combination (checked to be nullable in both pinned
  versions today; if a future non-nullable column ever hit it, generation
  would fall through to the type-driven default and could produce a
  validator error — acceptable since it doesn't occur in 1.0/1.2).
- Why: this is a real gap in the T-031 validator, not something to route
  around by loosening the generator's fidelity. Fixing the validator to
  understand KeyValueFormat-style embedded-key enums was out of scope for
  T-032 (touches shared validation code another task's acceptance criteria
  already locked down) and the only affected column is nullable in both
  shipped versions, so forcing null is a safe, fully generic rule rather
  than a per-column carve-out.
- Alternatives considered: hardcode `SkuPriceDetails` by name to always
  null (rejected — violates the "no hardcoded per-column table" invariant
  the validator itself established, and wouldn't generalize if a future
  spec version adds another JSON+enum column); fix `validateFocusCsv` to
  parse KeyValueFormat keys against the enum (rejected for this task —
  real scope creep into T-031's shipped, tested contract; noted as an open
  question below for a future task instead).

## 2026-07-28 — KPI mapping is curated static data, focus/uris.ts duplicates the finops:// KPI URI (T-033)

- Decision: `data/focus/derived/kpi-mapping.json` (18 KPIs: ESR, the
  4-KPI commitment-discount set, 2 forecast-accuracy KPIs, 6 unit-economics
  KPIs, 4 allocation/tagging KPIs, 1 variance KPI) is authored as a plain TS
  literal (`src/crawlers/focus/kpi-mapping-data.ts`), not computed from
  crawled pages — there is no source page to parse a KPI→column mapping
  from (verified none exists). `cli.ts`'s `ingest()` emits it alongside the
  1.0→1.2 diff via a new `emitDerivedKpiMapping`, hashed into
  `index.json`'s `derived` map the same way. `loadFocusStore`'s single-diff-
  file assumption (`Object.entries(index.derived)[0]`) was generalized to
  read every `derived/` entry, verify each one's sha256, then route by
  filename (`diff-*` / `kpi-mapping.json`) — so adding more derived files
  later doesn't require touching the loader's shape again. Every
  `columns_by_version` entry is cross-checked against its version's loaded
  `columns.json` at load time (throws `ArtifactValidationError`, mirroring
  the framework artifact's domain/capability crossValidate); `kpi_slug` is
  cross-checked against `data/framework/content/kpis.json` only in tests
  (`kpi-mapping.test.ts`), never at runtime, so the FOCUS artifact/package
  keeps no dependency on framework data (packaging spec: focus tarball must
  contain no framework data). The `get_kpi_mapping` tool's `finops://framework/kpis/{slug}`
  URI is built by a small `FRAMEWORK_KPI_URI` helper in
  `src/servers/focus/uris.ts` that duplicates (does not import)
  `src/servers/framework/uris.ts`'s `URI.kpi` — the two servers package
  separately and ESLint's `no-restricted-imports` doesn't forbid
  server-to-server imports, but importing framework code into focus/tools.ts
  would drag framework code into the focus tarball once packaging (T-035)
  lands.
- Why: keeps the derived-file loading seam generic instead of hardcoding a
  second special case, keeps the KPI mapping data itself easy to review and
  extend (it's just an array literal), and keeps the focus package's only
  coupling to the framework package at the _data_ layer (tests reading both
  data/ dirs), never a compiled-code import.
- Alternatives considered: give kpi-mapping.json its own ajv JSON Schema
  like the per-version artifact files (rejected for now — the existing
  diff-1.0-1.2.json derived file has no ajv schema either, so this follows
  that precedent; the runtime column crossValidate plus thorough tests
  cover the referential integrity that matters most). Importing
  `src/servers/framework/uris.ts` directly from the focus server (rejected
  — couples the two packages' compiled output ahead of the packaging task
  that is supposed to keep them separate).

- Decision (T-034, calculate_kpi): bundled the 3 existing sample fixtures
  (official 1.0 FOCUS-Sample-Data, seeded synthetic 1.0/1.2) into a new
  `data/focus/samples/` artifact section — `manifest.json` (row_count,
  license, source_url|seed, note) plus one CSV per (version, kind) — hashed
  into a new `index.json.samples` map, loaded/verified by `loadFocusStore`
  the same way `derived/` already is (`FocusStore.sampleManifest` +
  `sampleCsv: Map<"version:kind", csvText>`). A new
  `scripts/bundle-focus-samples.mjs` (mirrors `generate-focus-synthetic-
samples.mjs`'s own-script pattern, not folded into `cli.ts`'s `ingest()`)
  reads the three fixture files from `src/crawlers/focus/fixtures/samples/`
  and re-invokes `emitIndex`/a new `emitSamples`. `cli.ts`'s `ingest()` now
  reads any existing `index.json.samples` and carries it forward
  (verified live: `node dist/crawlers/focus/cli.js`, 0 network fetches,
  `samples` map byte-identical after) so a routine refresh never wipes the
  sample registration just because it doesn't itself touch samples.
  `data/focus` grew 868K -> 1.8M (cap 3MB, spec acceptance).
  `src/shared/focus/kpi-calc.ts` is a small, explicit formula registry (9 of
  the mapping's ~18 KPIs: ESR + 8 more whose formula is a pure aggregation
  with no external input and no ambiguous unit-string matching) operating
  on `{header, rows}` from the existing `parseCsv` (validate.ts, T-031).
  The `calculate_kpi` tool takes only `kpi`/`version`/`sample` — no dataset
  input parameter exists, so user-supplied data cannot enter (spec non-goal).
- Why: reuses the artifact's existing integrity model (hash-verified,
  loader throws actionable errors on tamper) instead of inventing a
  parallel one for samples; keeps `ingest()` network-only-when-needed while
  still making samples byte-identical/regenerable via a standalone script,
  consistent with how the two existing sample-fixture scripts already work
  outside the crawler pipeline. Restricting the formula registry to
  unambiguous KPIs (rather than attempting all ~18 with heuristics for
  free-text unit matching or synthesizing external forecast/budget inputs)
  keeps every computed value traceable to an exact, reviewable formula —
  the acceptance criterion is "error cleanly with guidance" for the rest,
  not "guess at every KPI."
- Alternatives considered: embedding the sample CSVs as TS literals in
  `kpi-mapping-data.ts`-style source (rejected — a 755KB string literal in
  source is worse than a committed CSV, which is already the existing
  convention for these fixtures). Folding sample-bundling into `cli.ts`'s
  `ingest()` directly (rejected — `ingest()` runs from the compiled
  `dist/`, which has no path back to `src/crawlers/focus/fixtures/` once
  packaged; the existing sample-fixture scripts already establish the
  standalone-script pattern for this exact reason). Attempting every
  mapped KPI with best-guess heuristics (e.g., matching `ConsumedUnit`
  strings for core-hours) — rejected as unverifiable and against the
  project's never-invent-unofficial-data-silently posture.
- Observed (not fixed): `calculate_kpi` for `allocation-accuracy-index-aai`
  over the official 1.0 sample returns ~108.3% — mathematically correct
  per the registered formula, but >100% because the official sample
  contains real negative-cost rows (credits/refunds) outside the
  `SubAccountId`/`Tags`-allocated subset, pulling the unfiltered
  denominator below the filtered numerator. Not a bug to fix in the
  formula; flagged here so a future reader doesn't "fix" it into an
  incorrect clamp.

## 2026-07-30 — Nested-bullet prefix uses the parent's full bullet text, not a trimmed clause (T-039)

- Decision: `extractRequirements` now builds an indentation-based bullet
  forest (`buildBulletForest`/`collectNormative` in
  `src/crawlers/focus/parse/table.ts`) and prefixes a nested normative
  bullet with its full chain of ancestor bullet texts (trailing `:`
  stripped, joined with `": "`), e.g. `"SkuId nullability is defined as
follows: SkuId MUST be null when ChargeCategory is 'Tax'."` — not a
  hand-trimmed clause like `"When ChargeCategory is not 'Usage' or
'Purchase': ..."` (the illustrative, shortened form gate 4's
  C2-fidelity-1 finding used as an example fix).
- Why: FOCUS 1.2's scoping-bullet phrasing isn't uniform ("X nullability
  is defined as follows:", "X for a given Y adheres to the following
  additional requirements:", "When ChargeCategory is not 'Usage' or
  'Purchase', X adheres to...:", "When ChargeCategory is 'Purchase':" —
  the last already terse). Trimming to "the meaningful part before the
  boilerplate" would need per-phrasing-pattern special-casing to avoid
  leaving orphaned boilerplate ("...adheres to the following additional
  requirements: EffectiveCost of a charge...") or truncating real content.
  Keeping the whole ancestor text is generic, handles the observed 3-level
  nesting (`CommitmentDiscountQuantity` 1.2) without extra cases, and the
  acceptance criterion ("prefixed with its parent bullet's scoping clause")
  is satisfied literally — the parent bullet _is_ the scoping clause, just
  not pre-shortened.
- Alternatives considered: regex-stripping a fixed set of boilerplate
  suffixes (e.g. `/adheres to the following.*requirements:$/`) before using
  the remainder as the prefix (rejected — fragile against phrasings not
  yet seen, and the finding's own example is explicitly an "e.g.", not a
  literal spec for the output string). Serving the whole nested list
  block verbatim as a single string per top-level bullet (the finding's
  offered fallback) — rejected in favor of one array entry per normative
  bullet, since every other code path (`get_column`, `get_attribute`,
  search indexing) treats `requirements` as an array of independent
  statements.

## 2026-08-02 — FOCUS package npm name: finops-focus-mcp

Decision (owner): publish the FOCUS server as `finops-focus-mcp`
(registry id `io.github.aaronmsoto/finops-focus-mcp`), renamed from
`focus-spec-mcp` before first publish.

Alternatives: keep `focus-spec-mcp` (rejected: gate-4 C4-community-3 —
LF trademark policy states "A trademark should not be used as part of
your product name", and FOCUS™-first naming is the explicitly incorrect
pattern); `@aaronsoto/focus-spec-mcp` scope (rejected: breaks family
consistency); distinctive non-mark name (rejected: kills discoverability).

Rationale: consistent complement to the existing `finops-framework-mcp`
so both packages share one uniform, explicitly recorded posture. The
residual risk (both names still contain Foundation marks) is knowingly
accepted: names are descriptive of what the servers serve, the MCP
ecosystem convention names servers after the upstream they front,
NOTICE.md files disclaim affiliation/endorsement, and registry ids are
author-namespaced. Revisit only if the Foundation objects.

## 2026-08-02 — Usage guide lives in docs/guide/ (Pages), not a GitHub wiki

Decision: publish the six-page usage guide as self-contained HTML under
`docs/guide/`, served by GitHub Pages from the default branch, rather than
as a GitHub wiki.

Alternatives: a GitHub wiki (rejected — separate git remote, so pages get
no PR review, no gates coverage, and no hash-chained task evidence);
markdown pages in `docs/` (rejected — the guide needs interactive version
toggles, side-by-side layouts, and transcript styling that markdown on
Pages can't carry); an external docs host (rejected — new dependency and
another publish surface to keep in sync).

Consequence: the `designs` gate warns on every guide page ("HTML outside
docs/designs/"). That warning is expected and accepted: `docs/designs/` is
for owner-reviewed design documents, `docs/guide/` is the published site.
The gate warns rather than fails, so this needs no gate change. Template
feedback queued: the harness `design check` should accept a configured
allowlist of HTML directories instead of hardcoding one.

Enabling Pages is a repo-settings action and stays an owner step.

## 2026-08-02 — Guide content rule: live probes only

Decision: every fact, count, quote, and transcript in `docs/guide/` must
come from a live probe of the built servers (`evals/framework/mcp-call.mjs`)
or from committed artifact/sample files — never from memory or paraphrase.
Synthesized advice (e.g. the forecasting 90-day plan) must be visibly
labelled as the guide's own, not official guidance.

Rationale: the guide's whole value proposition is that it shows what these
servers actually return. A single invented number would undermine the
provenance posture the servers themselves enforce with CC BY footers and
UNOFFICIAL banners. The six pages were built from 103 recorded probes and
spot-re-verified by an independent checker.

## 2026-08-06 — AI attribution: policy toggle, set to `allow`

Decision: `approvals.yaml` gains `ai_attribution: forbid|allow` (default
`forbid`, preserving template behavior); this repo sets **`allow`**. The
prepare-commit-msg hook, the integrity gate, and the CI PR-body check all
read the same key. This supersedes the 2026-07-14 blanket "no AI attribution
in git artifacts" rule, which was absolute.

Rationale: the policy was unenforceable in practice against the tooling that
produces the commits. Agent tooling appends attribution automatically and
re-appends it to PR bodies *after* submission — the CI check even documents
that, which is why it listens to the `edited` event. Net effect was a
recurring CI failure on essentially every PR (PR #12 blocked on it) for a
cosmetic reason the owner does not care about. Enforcing a rule the workflow
constantly violates trains everyone to treat red CI as noise, which is worse
than the attribution lines themselves.

Alternatives considered:

- **Keep `forbid`, strip footers by hand each time.** Rejected: it had
  already failed repeatedly, and it puts a manual step on every PR forever.
- **Keep `forbid`, drop only the PR-body check.** Rejected as incoherent —
  it would forbid attribution in commits while allowing it in the far more
  visible PR description.
- **Delete the policy entirely.** Rejected: other repos from this template
  may want it, and the default must stay `forbid` so their behavior is
  byte-unchanged. A toggle keeps both postures available.

Note the toggle governs *git artifacts only*. The CC BY attribution that
must ride on every served surface (NOTICE.md) is a separate, unaffected
obligation.

## 2026-08-07 — Keep `slug`/`capability`/`column` param naming; no unification (T-079 scoping)

Decision: tool input params keep their role-based names. `slug` is the
fetched entity's own identifier (polymorphic per tool: capability slug in
`get_capability`, KPI slug in `get_kpis`, persona slug in `get_entity`,
attribute in `get_attribute`); `capability` is always a filter/scope on
another tool's output; FOCUS `column` is a Column ID. This re-affirms the
T-077 owner directive ("NO param renames") after a session hit the
`slug`-vs-`capability` friction live and asked whether to unify.

Rationale: although `get_capability({slug})` and the `capability` filters
resolve through the same `findCapability` lookup (same value domain), the
name encodes the param's *role*, not its value type — and every tool
description already states "Capability slug" with an example. A rename is a
breaking change across ~12 files including the published finops-focus-mcp
package, docs/guide HTML, demo, and evals.

Alternatives considered:

- **Unify on `slug` everywhere.** Rejected: loses the fetch-target vs
  filter distinction (`get_kpis` takes both), breaking change, owner ruled.
- **Accept both names as aliases.** Rejected: the MCP SDK silently strips
  unknown params (activeContext open question), so the wrong half of an
  alias pair fails silently instead of helpfully — worse than today's
  explicit validation error.

The genuine defects found during the investigation (FOCUS
`get_kpi_mapping`'s unvalidated `capability` filter; `get_attribute`
description clarity vs `get_column`) are tracked as T-079.
