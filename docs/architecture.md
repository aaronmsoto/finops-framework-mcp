# Architecture: finops-framework-mcp

Status: **v1, official-only surface** (`.agents/specs/v1-official-only.md`,
owner-approved 2026-07-22 — supersedes the unofficial-extension scope below
that was built for v0.1 and reviewed in `docs/critique-1.md`/
`docs/critique-2.md`; those gates still document the reasoning behind
sections that haven't changed since). Companion: `docs/research.md` (crawl
surfaces; §2.5 corrected per critique B1/B2).

## 1. Goal

An MCP server that lets an AI agent understand and reason about every
official aspect of the FinOps Framework (finops.org/framework): Principles,
Phases, Domains, Capabilities (with per-maturity assessment text and KPIs),
the 3 official Maturity levels, Personas, Scopes (conceptual), and Technology
Categories. Two unofficial derivations from v0.1 — the capability
relationship graph and itemized "Action" records parsed out of maturity
prose — are gated behind `FINOPS_MCP_EXPERIMENTAL`; the relationship graph
was deleted outright (see §3). Crawler, data artifact, and server are fully
decoupled.

## 2. Repository layout (plain directories, no workspaces)

Critique M1: npm workspaces under the frozen gate commands only work via a
fragile live-types pattern — dropped. Plain directories, relative imports,
one root tsconfig; boundaries enforced by ESLint `no-restricted-imports`
zones (crawler ⇸ server, server ⇸ crawler, both → shared only):

```
src/
  shared/              # entity types, artifact loader + ajv validation, slug utils
  crawlers/framework/  # fetch → cache → parse → sanitize → compose → derive → validate → emit
    markdown/          # frontmatter.ts, compose.ts (parse output → canonical .md), derive.ts (.md → JSON)
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
**Now built:** `packages/finops-focus-mcp` — a second, published MCP server
covering the FOCUS spec (columns, KPI mappings, cross-version diffs), reusing
`src/shared` and following the same crawler → artifact → server pipeline.

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
| `Action` | derived, **experimental-only** | `{ capability_slug, maturity, text, ordinal, parent_ordinal?, official: false, parse_quality }`. **Semantics: maturity assessment characteristics (rubric states), not to-do steps** — every description/output says so. Served only via `get_actions` when `FINOPS_MCP_EXPERIMENTAL=1`; default surface exposes the verbatim official `maturity_raw` text instead (`get_maturity_assessment`) |

Maturity parsing reality (B1): each `<h4>Crawl|Walk|Run</h4>` is followed by
a flat `<ul>` that may nest one level; child `<li>`s become their own Action
records with `parent_ordinal` linking to the parent item. No group labels
exist there; the bolded-group pattern is the page-top callout →
`headline_groups`.

**Official vs. unofficial separation:** `content/` = crawled canonical only;
`derived/` = Actions, maturity-extension (Pre-Crawl), changelog — all either
`official: false` or (for Pre-Crawl) an explicitly labeled unofficial
extension. Flags + display naming + explicit notes in every server output
that touches them, and both are hidden entirely unless
`FINOPS_MCP_EXPERIMENTAL=1` (§5).

**v1 descope (owner decision, `.agents/specs/v1-official-only.md` §0):** the
v0.1 capability relationship graph — official edges from Definition/KPI-modal/
domain/Inputs & Outputs links, plus a restrained inferred-edge pass over bare
title mentions — was **deleted outright**: `infer.ts`, the `graph.ts`
resource/tool wiring, `get_prerequisites`/`get_related`, both
`relationships-*.json` derived files, and the `CapabilityRelationship` type
are all gone. Neither harvesting nor inference cleared the bar (see the spec
Problem statement); KPI records still carry their own on-page
`related_capability_slugs` (§3 table, `KPI` row) since that's official
per-KPI popup content, not a graph.

## 4. Data artifact contract

```
data/framework/
  schema/              # JSON Schema per entity + manifest schema
  content/             # principles, phases, domains, capabilities, personas,
                       # scopes (single doc), technology-categories,
                       # maturity-levels (official 3), kpis
  content/markdown/    # CANONICAL markdown layer (see below): capabilities/
                       # <slug>.md (22), personas/<slug>.md (11), kpis/<slug>.md
                       # (88), principles.md, phases.md, domains.md,
                       # maturity-model.md, technology-categories.md, scopes.md
  derived/             # actions.json (experimental-only), maturity-extension.json
                       # (pre-crawl, experimental-only), changelog.json
  manifest.json        # data_version, schema_version, crawled_at, source_urls,
                       # sha256 per file (incl. every markdown doc), counts,
                       # counts_mismatch?, parse_warnings
```

**Markdown is the canonical intermediate, JSON is regenerable from it**
(`.agents/specs/v1-official-only.md` §2-§3): the crawler's HTML parse
produces `content/markdown/**` first (deterministic serializers in
`src/crawlers/framework/markdown/compose.ts`, plain `key: value` front-matter
via `frontmatter.ts` — no YAML dependency), then a separate offline `derive`
step (`src/crawlers/framework/markdown/derive.ts`) parses ONLY that markdown
dialect (front-matter, `^#{1,6} ` headings, `- ` lists with 2-space nesting,
fenced code) back into every `content/*.json`/`derived/*.json` payload,
including experimental-only `derived/actions.json` (ordinal sequence,
`parent_ordinal` from list nesting, `official: false`). `derive` never
touches the network or the HTML cache — it is a pure function of the
committed markdown, runnable standalone (`node dist/crawlers/framework/cli.js
derive`) to regenerate JSON offline, which is what lets a schema-only or
JSON-only fix regenerate cleanly without a recrawl.

Rules (all enforced by tests):
- Server validates against `schema/` at startup; refuses to start with an
  error naming file, path, mismatch.
- Crawler and server import only `src/shared`; the artifact is the sole
  interface.
- **Idempotence:** canonical content hashing excludes volatile fields; two
  crawls of identical input produce byte-identical `content/` (markdown
  included), an empty diff, no version bump (M15/M16 test).
- **Refresh↔derive parity:** `refresh` (fetch → parse → compose → write
  markdown → derive from that markdown → validate → emit) and standalone
  `derive` over the same markdown produce byte-identical JSON — checked by a
  round-trip test per capability fixture and a zero-diff refresh-then-derive
  test.
- Version bumps — crawler auto-selects `max(patch: any content hash change,
  minor: entity count delta)`; schema-affecting bumps are manual, tied to
  `schema_version` (a schema major bump forces the next `data_version` to
  `<major>.0.0`), checked by a manifest-consistency test.
- Search index is built at server startup from the artifact — never
  committed (m10).

## 5. MCP surface

Server `finops-framework`. Canonical-path rule (m2): **tools are the model's
canonical path and return complete records at the leaf level; resources are
the attachment/bulk-reading layer.** Every eval question must be answerable
via tools alone (M6). One renderer per entity feeds both surfaces, and
entity-returning tools attach a `resource_link` to the canonical URI (M10).

**Experimental flag** (`.agents/specs/v1-official-only.md` §4):
`createServer(artifact, { experimental? })`; `main.ts` sets it from
`FINOPS_MCP_EXPERIMENTAL=1` or `--experimental`. Default (flag off, the npm
package's out-of-the-box behavior): official-only — 3 maturity levels
(crawl/walk/run), no `get_actions` tool, no Pre-Crawl anywhere (enums,
`get_maturity_model` output, resource templates/completions, prompt text,
`overview`/`instructions`). Flag on: `get_actions` and Pre-Crawl return,
labeled EXPERIMENTAL in title/description. Both modes are covered by a
`server.test.ts` "flag matrix" describe block asserting the default
`tools/list` has no "pre-crawl" substring anywhere in its JSON.

### 5.1 Resources

Single constant authority (m6): `finops://framework/...`, canonical form
lowercase without trailing slash. `mimeType: text/markdown` for prose,
`application/json` for manifest/changelog. Annotations: `lastModified` =
manifest `crawled_at` everywhere; `priority` 0.9 on the overview (m7). Every
resource footer: attribution + license + **modification indication** (B5).
Unknown slug/URI → JSON-RPC `-32002` with `data.uri` and nearest-match
suggestions in the message (m5).

| URI | Content |
|---|---|
| `finops://framework/overview` | orientation + how to navigate this server |
| `finops://framework/principles` , `/phases` , `/domains` , `/technology-categories` | full small collections |
| `finops://framework/scopes` | the conceptual Scopes guidance document |
| `finops://framework/maturity-model` | official Crawl/Walk/Run levels; Pre-Crawl section only when experimental |
| `finops://framework/personas` , `/personas/{slug}` | index + each persona (11 concrete entries + template) |
| `finops://framework/capabilities` , `/capabilities/{slug}` | index + full capability doc (22 concrete entries + template) |
| `finops://framework/capabilities/{slug}/maturity/{level}` | template: verbatim official assessment text; `level` enum is crawl\|walk\|run by default, adds pre-crawl when experimental |
| `finops://framework/kpis/{slug}` | template: full KPI library entry |
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
| `get_framework_info` | `()` | manifest + overview + navigation guide — tools-only parity for orientation (M6) |
| `search_framework` | `(query, entity_types?, limit?, cursor?)` | ranked index lookup; results carry slugs + resource URIs |
| `list_capabilities` | `(domain?, persona?, limit?, cursor?)` | **no phase filter** (M12) |
| `get_capability` | `(slug, include?)` | default `include = [summary, definition]` (m1); sections: maturity, activities (optionally `persona`-filtered), kpis, headline_groups, inputs_outputs |
| `get_maturity_assessment` | `(capability, level?)` | **default surface's per-capability maturity tool** — verbatim official `maturity_raw` text (crawl\|walk\|run, omit for all three), not a parsed breakdown |
| `get_actions` | **experimental only** — `(capability, maturity?)` | discrete assessment-characteristic items parsed from maturity prose + parse_quality + unofficial note; at `pre-crawl` returns the extension definition |
| `get_kpis` | `(capability?, featured_only?, limit?, cursor?)` | **full records** (formula, data_sources, related capabilities, slug) (M6) |
| `assess_maturity_path` | `(capability, current_level, target_level)` | official-only enum in both modes (crawl\|walk\|run — never needed Pre-Crawl once per-level `maturity_raw` existed); `gap: [{maturity, assessment_md}]`, verbatim text, "evidence to look for, not steps to execute" (M11) |
| `map_personas` | `(capability?, persona?)` | persona→capabilities returns persona-scoped activity bullets inline (M5); no args → full persona index (m3); allied persona → group-level data explicitly labeled (m16) |
| `get_entity` | `(entity_type, slug?)` | tools-only parity for small collection types that would otherwise live only in resources (principles/phases/domains/technology-categories/scopes/persona) |
| `get_maturity_model` | `()` | capability-agnostic Crawl/Walk/Run characteristics + sample goals; `unofficial_extension` field present only when experimental |
| `get_changelog` | `(limit?)` | rolling crawl-diff summaries (B4 replacement for diff_framework_versions) |

Default surface: 11 tools (no `get_actions`). `FINOPS_MCP_EXPERIMENTAL=1`: 12
(adds `get_actions`).

### 5.3 Prompts

`prompts/get` renders messages **server-side with embedded-resource content
blocks** (uri + mimeType + text from the artifact) so workflows survive
hosts that never surface resources; bare URI mentions appear only for
content the model should fetch via tools (M8). Single renderer shared with
§5.1. Prompt arguments (capability/persona slugs) support completion (m4) —
`.describe()` stays *inside* `completable()` since zod v4 clones on
`describe` and would otherwise drop the SDK's completable marker.

| Prompt | Args | Orchestrates |
|---|---|---|
| `explain-framework` | audience? | embedded overview + indexes → guided tour; mentions Pre-Crawl only when experimental |
| `assess-capability-maturity` | capability | embedded capability content → structured interview → level verdict citing evidence; calls `get_maturity_assessment` by default, `get_actions` when experimental |
| `plan-maturity-roadmap` | capability, current, target | embedded capability summary → `assess_maturity_path` gap + `get_kpis` + `map_personas` → phased roadmap; `current`/`target` are crawl\|walk\|run in both modes |
| `map-personas-to-capabilities` | persona? | persona matrix → engagement guide |

### 5.4 Transport

stdio primary via `servers/framework` bin; `createServer(artifact)` is
transport-free; Streamable HTTP later = a new entry point only. **Now
built:** `src/workers/index.ts` — a Cloudflare Worker entry point serving
the framework server over Streamable HTTP, plus a static browser `demo/`
against it (see `docs/deploy-worker.md`).

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
4. **compose** — serialize the sanitized parse output to the canonical
   markdown layer (`content/markdown/**`, §4): deterministic per-entity
   serializers (`compose.ts`) with plain `key: value` front-matter
   (`frontmatter.ts`) for non-prose facts (kind, slug, title, wp_id, domain,
   category, source_url, license, compose-time warnings — no timestamps, for
   idempotence) and canonical H2/H3 markdown headings for prose sections.
5. **derive** — the offline `derive.ts` step (§4) parses that same markdown
   back into every `content/*.json`/`derived/*.json` payload, replacing what
   used to be built directly off the HTML parse; this is also exposed as the
   standalone `derive` CLI subcommand (no network/cache access) so a
   schema/JSON-only fix can regenerate without recrawling.
6. **validate** — ajv + counts, run over the derived JSON. Local/CI on
   committed artifacts: hard-fail. Automation (refresh): soft-fail with
   `counts_mismatch` in the manifest, prominent in the diff report, PR still
   opens for human decision (m13). Parse-quality budget: fail the refresh if
   raw_fallback exceeds threshold.
7. **diff + emit** — canonical-hash diff vs current artifact (markdown +
   JSON both hashed into the manifest) → `diff-report.md` (full content
   diffs for changed prose, M2) + changelog entry + version bump per §4.

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
capability pages + section pages) — no network. Markdown-layer tests
(`src/crawlers/framework/markdown/*.test.ts`): compose snapshot assertions
per fixture, front-matter round-trip, `derive(compose(parseHtml(fixture)))`
deep-equals the direct parser output, refresh-then-derive zero diff,
double-derive byte-identical, actions ordinal/parent-nesting test. Artifact
contract tests: schema validation; manifest hashes; official/derived
separation; per-record `source_url`/`license` + NOTICE presence (B5);
idempotence (double-crawl byte-identical, M15). Server tests via SDK
`Client` + `InMemoryTransport`: resources (incl. `-32002` unknown-URI, m5),
each tool (happy path, unknown-slug suggestions, cursor restart), prompts
(embedded content present), and a **flag matrix** describe block running two
in-memory clients (default + `--experimental`) asserting the default
`tools/list` has no `get_actions` and no "pre-crawl" substring anywhere in
its JSON, while the experimental client has both. Evals per Phase 5,
tools-only.

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Site redesign | normalized-heading anchoring; page-wide modal parse; raw_fallback + completeness warnings; fixtures pin shapes; refresh (once installed) surfaces breakage as PR or failure-issue |
| Prompt injection via crawled content | sanitize stage + heuristics + full-content-diff PRs (M2) |
| Markdown dialect drift (compose/derive disagree) | round-trip + zero-diff tests (§8) catch it before it reaches the artifact |
| Artifact/schema drift | startup refusal; CI validation; manifest-consistency test |
| License compliance | dual licensing: code MIT, `data/framework/**` CC BY 4.0; NOTICE Modifications section; footer attribution + modification note; contract test |
| Framework evolution (23rd capability) | count soft-fail in automation with human-decided PR; hard-fail locally |
| Nobody watches automation | failure-issue + parse-quality budget + auto-disable documentation (M4) |
| Unofficial extensions (Actions, Pre-Crawl) mistaken for official | hidden by default behind `FINOPS_MCP_EXPERIMENTAL`; labeled EXPERIMENTAL/`official: false` whenever shown |

## 10. Definition-of-done mapping

1. All official entities queryable → §5.1 + §5.2 (tools-only parity, M6).
2. Capability detail incl. featured KPI popup content → §3 KPI entity +
   `get_kpis` full records; page-wide modal parse (B2).
3. Markdown-canonical, JSON regenerable offline → §4 + `derive` CLI +
   refresh↔derive parity tests (§8).
4. Decoupling → §4 + idempotence tests + double-refresh test.
5. Official-only default surface, unofficial extensions opt-in and labeled
   → §5 experimental flag + flag-matrix tests (§8).
6. Evals ≥9/10 + two critique gates, zero unresolved BLOCKERs →
   `docs/critique-1.md`, `docs/critique-2.md`, `docs/eval-results.md`. **Now
   built:** two further critique gates (`docs/critique-3-publish-gate.md` —
   framework-server publish readiness; `docs/critique-4-focus-gate.md` —
   the FOCUS server build) plus a five-lens final pre-launch review
   (`docs/final-status-review.md`).
