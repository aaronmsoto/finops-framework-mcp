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
