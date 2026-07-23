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
