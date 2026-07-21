# Architecture: finops-framework-mcp

Status: **revised after critique gate 1** (`docs/critique-1.md` — 5 BLOCKERs
and all but one MAJOR fixed; M11 accepted-with-rationale). Companion:
`docs/research.md` (crawl surfaces; §2.5 corrected per critique B1/B2).

## 1. Goal

An MCP server that lets an AI agent understand and reason about every
top-level aspect of the FinOps Framework (finops.org/framework): Principles,
Phases, Domains, Capabilities (with per-maturity assessment items and KPIs),
Maturity levels, Personas, Scopes (conceptual), Technology Categories, and a
queryable capability relationship graph. Crawler, data artifact, and server
are fully decoupled.

## 2. Repository layout (plain directories, no workspaces)

Critique M1: npm workspaces under the frozen gate commands only work via a
fragile live-types pattern — dropped. Plain directories, relative imports,
one root tsconfig; boundaries enforced by ESLint `no-restricted-imports`
zones (crawler ⇸ server, server ⇸ crawler, both → shared only):

```
src/
  shared/              # entity types, artifact loader + ajv validation, slug utils
  crawlers/framework/  # fetch → cache → parse → sanitize → infer → validate → emit
    fixtures/          # saved HTML: allocation, forecasting, finops-practice-operations, section pages
  servers/framework/   # MCP server (reads the artifact only); bin entry for stdio
  index.ts             # re-exports server main (repo scaffold entry)
data/framework/        # versioned data artifact (decoupling seam)
evals/framework/       # eval.xml + runner
docs/                  # research, architecture, critiques, eval results, proposed workflow
```

All tests live under `src/**/*.test.ts` (repo `tests/**` is a protected
path); `vitest.config.ts` includes them and excludes `fixtures/` from
coverage. Future FOCUS sibling: `src/crawlers/focus`, `src/servers/focus`
reuse `src/shared` directly; extract packages only if that day ever needs it.

Toolchain: TypeScript strict, `@modelcontextprotocol/sdk` ^1.29 (+ zod),
`cheerio`, `ajv`. No `any` at directory boundaries.

## 3. Domain model

JSON Schema in `data/framework/schema/`, TS types mirrored in `src/shared`.
Per-record provenance is `{ source_url, license: "CC-BY-4.0" }`; retrieval
time lives **only** in `manifest.json` (`crawled_at`) so recrawls of
unchanged content are byte-identical (critique M15).

| Entity | Count | Key fields beyond id/slug/title/provenance |
|---|---|---|
| `Principle` | 6 | description_md, order |
| `Phase` | 3 | description_md (Inform/Optimize/Operate). No capability→phase mapping exists officially; none is invented (M12) |
| `Domain` | 4 | description_md, capability_slugs — sourced from BOTH the domains-index cards and each capability's breadcrumb, cross-checked (m15) |
| `Capability` | 22 | domain_slug, summary, definition_md, headline_groups (page-top callout: bolded group + bullets), maturity_raw (per level, verbatim), functional_activities (per core persona + allied-group, m16), kpi_bullets[], example_kpis[] (objective/kpi pairs, optional), inputs_outputs_md, featured_kpi_ids[], wp_id |
| `Persona` | 6 core + 5 allied | category, description_md; allied capability mapping is group-level only, and labeled so |
| `Scope` | **1 document** | conceptual guidance doc + illustrative examples labeled as examples. The legacy `/wp/v2/scope` CPT (pre-2025 scopes = today's Technology Categories) is never crawled (B3) |
| `TechnologyCategory` | 5 | description_md (Public Cloud, SaaS, Data Center, Data Cloud Platforms, AI) |
| `MaturityLevel` | 3 official + 1 extension | characteristics_md, sample_goals_md; `pre-crawl` has `official: false` AND display title "Pre-Crawl (unofficial extension)" (M13) |
| `KPI` | 88 library | description_md, formula, data_sources[], related_capability_slugs[] (official, from modal), featured_on[] capability slugs, slug always present in outputs, wp_id |
| `Action` | derived | `{ capability_slug, maturity, text, ordinal, parent_ordinal?, official: false, parse_quality }`. **Semantics: maturity assessment characteristics (rubric states), not to-do steps** — every description/output says so. Name kept per owner brief; rename to `MaturityCharacteristic` queued for owner approval (M11) |
| `CapabilityRelationship` | official + inferred | `{ from, to, type: prerequisite\|informs\|related, from_maturity?, to_min_maturity?, source, evidence_url?, evidence_quote?, confidence?: strong\|moderate\|weak, rationale? }` |

Maturity parsing reality (B1): each `<h4>Crawl|Walk|Run</h4>` is followed by
a flat `<ul>` that may nest one level; child `<li>`s become their own Action
records with `parent_ordinal` linking to the parent item. No group labels
exist there; the bolded-group pattern is the page-top callout →
`headline_groups`.

**Official vs. unofficial separation:** `content/` = crawled canonical only;
`derived/` = Actions, inferred edges, changelog. Flags + display naming +
explicit notes in every server output. Official edges carry `evidence_url`
(and quote); they come from: Definition prose links, KPI-modal Related
Capabilities (incl. shared-KPI co-links), domain co-membership, Inputs &
Outputs links.

### Relationship inference pass (restrained per M14)

Bare title mentions carry no reliable direction, so they emit **undirected
`related` edges** (canonical from<to), each with a **quoted evidence
sentence** and a named heuristic; `confidence` is the enum
`strong|moderate|weak`. Single-word capability titles (Allocation,
Forecasting, …) must appear in title case — lowercase common-noun usage
("automated allocation of discounts") never creates an edge — and matches
inside parenthetical lists (persona enumerations) are skipped. A directed
`prerequisite` edge or any maturity constraint is emitted **only** when the
quoted text uses explicit dependency language; with the current site content
this yields zero prerequisite edges, which is the honest state (the
Foundation publishes no prerequisite graph).
Post-checks: cycle detection on prerequisites, degree sanity, full-list
manual review recorded in the journal. Output:
`derived/relationships-inferred.json`, never blended with official.

## 4. Data artifact contract

```
data/framework/
  schema/              # JSON Schema per entity + manifest schema
  content/             # principles, phases, domains, capabilities, personas,
                       # scopes (single doc), technology-categories,
                       # maturity-levels (official 3), kpis
  derived/             # actions.json, maturity-extension.json (pre-crawl),
                       # relationships-official.json, relationships-inferred.json
  derived/changelog.json  # rolling crawl-diff summaries (newest first, capped at 20)
  manifest.json        # data_version, schema_version, crawled_at, source_urls,
                       # sha256 per file, counts, counts_mismatch?, parse_warnings
```

Rules (all enforced by tests):
- Server validates against `schema/` at startup; refuses to start with an
  error naming file, path, mismatch.
- Crawler and server import only `src/shared`; the artifact is the sole
  interface.
- **Idempotence:** canonical content hashing excludes volatile fields; two
  crawls of identical input produce byte-identical `content/`, an empty
  diff, no version bump (M15/M16 test).
- Version bumps — crawler auto-selects `max(patch: any content hash change,
  minor: entity count delta)`; schema-affecting bumps are manual, tied to
  `schema_version`, checked by a manifest-consistency test.
- Search index is built at server startup from the artifact — never
  committed (m10).

## 5. MCP surface

Server `finops-framework`. Canonical-path rule (m2): **tools are the model's
canonical path and return complete records at the leaf level; resources are
the attachment/bulk-reading layer.** Every eval question must be answerable
via tools alone (M6). One renderer per entity feeds both surfaces, and
entity-returning tools attach a `resource_link` to the canonical URI (M10).

### 5.1 Resources

Single constant authority (m6): `finops://framework/...`, canonical form
lowercase without trailing slash. `mimeType: text/markdown` for prose,
`application/json` for graph/manifest/changelog. Annotations: `lastModified`
= manifest `crawled_at` everywhere; `priority` 0.9 on the overview (m7).
Every resource footer: attribution + license + **modification indication**
(B5). Unknown slug/URI → JSON-RPC `-32002` with `data.uri` and nearest-match
suggestions in the message (m5).

| URI | Content |
|---|---|
| `finops://framework/overview` | orientation + how to navigate this server |
| `finops://framework/principles` , `/phases` , `/domains` , `/technology-categories` | full small collections |
| `finops://framework/scopes` | the conceptual Scopes guidance document |
| `finops://framework/maturity-model` | "Official levels (3)" + visibly separate "Unofficial extension: Pre-Crawl" section |
| `finops://framework/personas` , `/personas/{slug}` | index + each persona (11 concrete entries + template) |
| `finops://framework/capabilities` , `/capabilities/{slug}` | index + full capability doc (22 concrete entries + template) |
| `finops://framework/capabilities/{slug}/maturity/{level}` | template: level assessment + parsed items (flagged) |
| `finops://framework/kpis/{slug}` | template: full KPI library entry |
| `finops://framework/graph/relationships` | full edge list, official/inferred partitioned (JSON) |
| `finops://framework/meta/manifest` , `/meta/changelog` | version/attribution; rolling crawl diffs |

Concrete entries are listed for every capability and persona in addition to
templates (m7); templates carry `completeCallback` slug completion.

### 5.2 Tools

All: `readOnlyHint: true`, `idempotentHint: true`, `openWorldHint: false`;
Zod input schemas (maturity levels as an enum — m3) with examples;
`outputSchema` + `structuredContent`; in-band `isError` with nearest-match
suggestions for unknown slugs; descriptions enumerate exactly which fields
are returned. Cursor (M9): opaque base64 `{data_version, offset}`, stale →
in-band error instructing a restart; `nextCursor` optional in list
outputSchemas; default limits fit every current list in one response
(cursors matter only on `search_framework`/`get_kpis`/`list_capabilities`).

| Tool | Signature (essentials) | Notes |
|---|---|---|
| `search_framework` | `(query, entity_types?, limit?, cursor?)` | ranked index lookup; results carry slugs + resource URIs |
| `list_capabilities` | `(domain?, persona?, limit?, cursor?)` | **no phase filter** (M12) |
| `get_capability` | `(slug, include?)` | default `include = [summary, definition]` (m1); sections: maturity, activities (optionally `persona`-filtered), kpis, relationships, headline_groups, inputs_outputs |
| `get_actions` | `(capability, maturity?)` | returns assessment-characteristic items + parse_quality + unofficial note; at `pre-crawl` returns the extension definition + "no official assessment content exists below Crawl" (M13) |
| `get_kpis` | `(capability?, featured_only?, limit?, cursor?)` | **full records** (formula, data_sources, related capabilities, slug) (M6) |
| `get_prerequisites` | `(capability, target_maturity?, include_inferred?=true)` | transitive closure; every edge carries `source/confidence/rationale/evidence`; top-level summary line ("N official, M inferred; maturity constraints are unofficial inferences") duplicated into text content; propagation: constraint = max over path, unknown treated as crawl (M7) |
| `get_related` | `(capability, types?)` | non-prerequisite edges — informs/related, official + inferred partitioned (M6) |
| `assess_maturity_path` | `(capability, current_level, target_level)` | "characteristics present at target but not current — evidence to look for, not steps to execute" (M11) |
| `map_personas` | `(capability?, persona?)` | persona→capabilities returns persona-scoped activity bullets inline (M5); no args → full persona index (m3); allied persona → group-level data explicitly labeled (m16) |
| `get_framework_info` | `()` | manifest + overview + navigation guide — tools-only parity for orientation (M6) |
| `get_changelog` | `(limit?)` | rolling crawl-diff summaries (B4 replacement for diff_framework_versions) |

### 5.3 Prompts

`prompts/get` renders messages **server-side with embedded-resource content
blocks** (uri + mimeType + text from the artifact) so workflows survive
hosts that never surface resources; bare URI mentions appear only for
content the model should fetch via tools (M8). Single renderer shared with
§5.1. Prompt arguments (capability/persona slugs) support completion (m4).

| Prompt | Args | Orchestrates |
|---|---|---|
| `explain-framework` | audience? | embedded overview + indexes → guided tour |
| `assess-capability-maturity` | capability | embedded capability content + characteristic items → structured interview → level verdict citing items as evidence |
| `plan-maturity-roadmap` | capability, current, target | prerequisites + path gap → ordered plan; **inferred-edge-derived steps labeled unofficial in rendered text** (M14) |
| `map-personas-to-capabilities` | persona? | persona matrix → engagement guide |

### 5.4 Transport

stdio primary via `servers/framework` bin; `createServer(artifact)` is
transport-free; Streamable HTTP later = a new entry point only.

### 5.5 Capability declarations (m4)

The artifact is immutable per process (refresh = restart), so no list ever
changes and `resources.subscribe` is not offered. Note: the SDK's high-level
McpServer force-advertises `listChanged: true` on resources/tools/prompts
when handlers are registered; the notification is simply never emitted.
`completions` is declared (resource-template and prompt arguments).

## 6. Crawler pipeline

`npm run refresh` → stages, each restartable; robots.txt fetched and honored
**every run** (skips recorded; crawl-delay respected ≥ 1 rps throttle, m14).

1. **fetch** — REST APIs + sitemaps (incl. sitemap-domains.xml) + HTML pages
   (~130 URLs; domain detail pages included, m15). Cache: only status-200
   bodies passing a sanity check (expected `<h1>`/framework marker, length
   floor); entries store fetch time + status; 7-day TTL; `--no-cache`
   override (m12). Source disagreement (API vs sitemap) fails the stage
   listing the symmetric difference (m13). Personas filtered by URL shape +
   count-asserted.
2. **parse** — cheerio; sections anchored on **normalized heading text**
   (lowercase, strip tags, fold `&`/`and`, hyphen/underscore-insensitive
   ids); featured KPI cards/modals parsed **page-wide** (`div.c-modal` with
   numeric id in main content), joined to the library by wp_id with title
   fallback (B2). Maturity blocks parsed as flat+nested `<ul>` per §3 (B1).
   Structural surprise → `raw_fallback` + raw prose + warning. Per-capability
   completeness assertions: non-empty definition, 3 maturity levels, ≥1
   persona mapping; absent sections are reported warnings, never silent
   empties.
3. **sanitize** (M2) — strip scripts/comments/hidden content outside the
   known modal schema; markdown-construct allowlist; drop `data:` URIs and
   off-finops.org links from body text (kept as plain text); heuristic scan
   for instruction-like insertions ("ignore previous", "you must",
   base64-looking blobs) — hits fail the refresh with the offending excerpt
   in the crawl report.
4. **infer** — restrained pass per §3; separate output file.
5. **validate** — ajv + counts. Local/CI on committed artifacts: hard-fail.
   Automation (refresh): soft-fail with `counts_mismatch` in the manifest,
   prominent in the diff report, PR still opens for human decision (m13).
   Parse-quality budget: fail the refresh if raw_fallback exceeds threshold.
6. **diff + emit** — canonical-hash diff vs current artifact →
   `diff-report.md` (full content diffs for changed prose, M2) + changelog
   entry + version bump per §4.

## 7. Refresh automation

Delivery path (M3): the workflow ships as **`docs/proposed/refresh-data.yml`
only** — `.github/workflows/` is a protected path and is not written. Owner
install checklist lives in the README and journal. Until installed, the §9
staleness mitigation is **inactive**.

Workflow spec: monthly cron + `workflow_dispatch`; runs refresh; non-empty
diff → PR (base `dev`) with the full diff report as body; **failure →
auto-open/refresh a labeled issue** (M4); parse-quality budget enforced in
the run; README documents GitHub's ~60-day scheduled-workflow auto-disable
and the keepalive. Consumers pin via git tag/release; float by tracking main.

## 8. Testing strategy

All tests in `src/**/*.test.ts` (m9). Parser tests vs fixtures (three named
capability pages + section pages) — no network. Artifact contract tests:
schema validation; manifest hashes; official/derived separation; per-record
`source_url`/`license` + NOTICE presence (B5); idempotence (double-crawl
byte-identical, M15). Server tests via SDK `Client` + `InMemoryTransport`:
resources (incl. `-32002` unknown-URI, m5), each tool (happy path,
unknown-slug suggestions, cursor restart), prompts (embedded content
present). Graph tests: closure + cycle rejection on a synthetic mini-graph.
Evals per Phase 5, tools-only.

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Site redesign | normalized-heading anchoring; page-wide modal parse; raw_fallback + completeness warnings; fixtures pin shapes; refresh (once installed) surfaces breakage as PR or failure-issue |
| Prompt injection via crawled content | sanitize stage + heuristics + full-content-diff PRs (M2) |
| Inferred edges wrong | restrained types, quoted evidence, enum confidence, cycle/degree checks, panel review, `include_inferred: false` |
| Artifact/schema drift | startup refusal; CI validation; manifest-consistency test |
| License compliance | dual licensing: code MIT, `data/framework/**` CC BY 4.0; NOTICE Modifications section; footer attribution + modification note; contract test |
| Framework evolution (23rd capability) | count soft-fail in automation with human-decided PR; hard-fail locally |
| Nobody watches automation | failure-issue + parse-quality budget + auto-disable documentation (M4) |

## 10. Definition-of-done mapping

1. All entities queryable → §5.1 + §5.2 (tools-only parity, M6).
2. Capability detail incl. featured KPI popup content → §3 KPI entity +
   `get_kpis` full records; page-wide modal parse (B2).
3. Graph queryable, inferred clearly marked → §3 + `get_prerequisites`/
   `get_related` output contracts (M7).
4. Decoupling → §4 + idempotence tests + Phase 6 double-refresh.
5. Evals ≥9/10 + two critique gates, zero unresolved BLOCKERs → §8,
   `docs/critique-1.md` (this gate), Phase 6.
