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
  *after* `"...rate-per-cost-center.md"` because `.` (0x2E) > `-` (0x2D),
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
  `z.enum(["crawl","walk","run"])` in *every* mode, not gated behind
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
  criterion says the *refresh* is byte-identical, not "byte-identical
  modulo a documented exception"; a real diff-on-disk after every refresh
  would also be confusing operationally, showing churn with no content
  change).
