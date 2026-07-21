# Architecture: finops-framework-mcp

Status: proposed (Phase 2) — gated by the Phase 3 adversarial critique panel.
Companion: `docs/research.md` (verified crawl surfaces, license, MCP spec notes).

## 1. Goal

An MCP server that lets an AI agent understand and reason about every
top-level aspect of the FinOps Framework (finops.org/framework): Principles,
Phases, Domains, Capabilities (with per-maturity Actions and KPIs), Maturity
levels, Personas, Scopes, Technology Categories, and a queryable capability
relationship graph. Crawler, data artifact, and server are fully decoupled.

## 2. Repository layout (adapted monorepo)

The build brief proposed top-level `packages/ crawlers/ servers/`. This repo's
quality gates (`agentic.config.json`, a protected policy file) run
prettier/eslint/tsc/vitest over `src` and `tests`. Rather than edit protected
gate definitions, the same monorepo shape lives **under `src/`** as npm
workspaces — every gate covers every line with zero policy changes:

```
src/
  shared/              # @finops-mcp/shared — entity types, artifact loader+validator, slugs
  crawlers/framework/  # @finops-mcp/crawler-framework — fetch → cache → parse → infer → emit
  servers/framework/   # @finops-mcp/server-framework — the MCP server (reads artifact only)
  index.ts             # repo entry: re-exports the framework server main
data/framework/        # versioned data artifact (the decoupling seam)
evals/framework/       # eval.xml + runner
docs/                  # research, architecture, critiques, eval results
tests/                 # repo-level tests (artifact contract, integration)
```

Future siblings: `src/crawlers/focus`, `src/servers/focus`, `data/focus/`.
Root `package.json` gains `"workspaces": ["src/shared", "src/crawlers/*",
"src/servers/*"]`. Import boundaries (crawler ⇸ server, server ⇸ crawler,
both → shared only) are enforced three ways: package dependency declarations
(a workspace can only import what it declares), an ESLint
`no-restricted-imports` rule per package, and code review. TypeScript strict
everywhere; no `any` at package boundaries.

Toolchain: TypeScript ~6, `@modelcontextprotocol/sdk` (+`zod`), `cheerio`
(HTML parsing), `ajv` (JSON Schema validation). All boring, replaceable.

## 3. Domain model

Entity types (JSON Schema in `data/framework/schema/`, TS types mirrored in
`@finops-mcp/shared`). Every record embeds provenance:
`{ source_url, retrieved_at, license: "CC-BY-4.0" }`.

| Entity | Count | Key fields beyond id/slug/title/provenance |
|---|---|---|
| `Principle` | 6 | description, order |
| `Phase` | 3 | description, tagline (Inform/Optimize/Operate) |
| `Domain` | 4 | description, capability slugs |
| `Capability` | 22 | domain, summary, definition_md, maturity assessments (raw prose per level), functional_activities (per persona), kpi_bullets[], example_kpis[] (objective/kpi pairs), inputs_outputs_md, featured_kpi_ids[], wp_id |
| `Persona` | 6 core + 5 allied | category (core/allied), description_md, capability links |
| `Scope` | crawled set | description_md |
| `TechnologyCategory` | 5 | description_md (SaaS, Data Center, Data Cloud Platforms, AI, Public Cloud) |
| `MaturityLevel` | 4 | `pre-crawl \| crawl \| walk \| run`; characteristics_md; **`official: false` on `pre-crawl`** (unofficial extension: "not even Crawl actions done consistently") |
| `KPI` | 88 library + inline | description_md, formula, data_sources[], related_capability_slugs[] (official, from popup), featured_on[] (capability slugs), `featured: bool`, wp_id |
| `Action` | derived | `{ capability_id, maturity, group_label?, text, ordinal, official: false, parse_quality: itemized \| raw_fallback }` |
| `CapabilityRelationship` | derived + official | `{ from, to, type: prerequisite\|informs\|related, from_maturity?, to_min_maturity?, source: official\|inferred, evidence_url?, rationale, confidence }` |

**Official vs. unofficial separation (standing order):**

- `content/` holds only crawled canonical content. `derived/` holds parsed
  Actions, inferred relationships, and search indexes.
- Schema-level flags: `official: false` on `pre-crawl`, every `Action`, and
  every `source: inferred` edge. Server output includes an explicit
  `"note": "unofficial extension"` marker on these.
- Official relationship edges are harvested only from on-page evidence
  (Definition prose links, KPI-modal Related Capabilities, Inputs & Outputs
  links) and carry `evidence_url`.

### Relationship inference pass

After crawling: scan each capability's Actions, KPI text, and Inputs &
Outputs for references to other capabilities' outputs (allocation metadata,
budgets, forecasts, rates, tags, anomaly alerts …) via a curated
term→capability lexicon. Propose `prerequisite`/`informs`/`related` edges
with maturity constraints (e.g. "Reporting & Analytics at Walk requires
Allocation ≥ Walk"), each with one-sentence rationale + confidence ∈ [0,1].
Post-checks before acceptance: cycle detection on `prerequisite` edges,
degree sanity (no node related to everything), and a manual review of the
full edge list recorded in the journal. Written to
`derived/relationships-inferred.json`, never blended with official edges.

## 4. Data artifact contract (the decoupling seam)

```
data/framework/
  schema/              # JSON Schema per entity type + manifest schema (versioned)
  content/             # principles.json, phases.json, domains.json, capabilities.json,
                       # personas.json, scopes.json, technology-categories.json,
                       # maturity-levels.json, kpis.json
  derived/             # actions.json, relationships-official.json,
                       # relationships-inferred.json, search-index.json
  manifest.json        # { data_version (semver), schema_version, crawled_at,
                       #   source_urls[], sha256 per file, counts per entity }
```

Rules (enforced by tests):
- Server validates the artifact against `schema/` with ajv at startup;
  refuses to start on failure with an error naming file, path, and mismatch.
- Crawler never imports server code; server never imports crawler code;
  shared types/loader live in `@finops-mcp/shared` only.
- Re-crawl produces `diff-report.md` (added/removed/changed per entity, by
  content hash) and bumps `data_version`: patch = text changes, minor =
  entity add/remove or new optional field, major = schema break.
- Content-only changes never require server code changes (verified in Phase 6
  by running the server against two artifact versions).

## 5. MCP surface

Server name `finops-framework` (namespace); short element names inside.
Spec revision target: 2025-11-25 via current TS SDK.

### 5.1 Resources — the framework as addressable content

URI scheme `finops://`, concrete resources listed via `resources/list`,
parameterized families via resource templates (RFC 6570):

| URI | Content |
|---|---|
| `finops://framework/overview` | orientation doc: what/how counts, how to navigate this server (markdown) |
| `finops://principles` , `finops://phases` , `finops://domains` , `finops://scopes` , `finops://technology-categories` | full small collections (markdown with stable anchors) |
| `finops://maturity-model` | levels incl. flagged `pre-crawl` extension |
| `finops://personas` , `finops://personas/{slug}` | index + one per persona |
| `finops://capabilities` | index: slug, domain, one-line summary |
| `finops://capabilities/{slug}` | full capability doc (definition, maturity, activities, KPIs, inputs/outputs) |
| `finops://capabilities/{slug}/maturity/{level}` | that level's assessment + parsed Actions (flagged unofficial) |
| `finops://kpis/{slug}` | KPI library entry (description, formula, sources, related capabilities) |
| `finops://graph/relationships` | full edge list, official + inferred clearly partitioned |
| `finops://meta/manifest` | data version, crawl date, license/attribution |

Small enumerable sets are concrete list entries; `{slug}` families are
templates with `completeCallback` for slug completion. Markdown
(`text/markdown`) for prose resources, JSON for graph/manifest. Every
resource footer carries attribution (CC BY 4.0, source URL, retrieved date).

### 5.2 Tools — parameterized query & computation (all read-only)

All tools: `readOnlyHint: true`, `idempotentHint: true`, `openWorldHint:
false`, Zod input schemas with descriptions + examples, `outputSchema` +
`structuredContent`, in-band errors with nearest-match suggestions for
unknown slugs, `cursor`/`limit` pagination on list-shaped outputs.

| Tool | Signature (essentials) | Why a tool |
|---|---|---|
| `search_framework` | `(query, entity_types?, limit?, cursor?)` | ranked lookup over the search index |
| `list_capabilities` | `(domain?, persona?, phase?, limit?, cursor?)` | filtered projection |
| `get_capability` | `(slug, include?: [definition, maturity, activities, kpis, relationships])` | composed, size-controlled fetch |
| `get_actions` | `(capability, maturity?)` | parsed Action records + parse_quality |
| `get_kpis` | `(capability?, featured_only?, limit?, cursor?)` | KPI join across library + capability |
| `get_prerequisites` | `(capability, target_maturity?, include_inferred?: default true)` | transitive closure over graph with min-maturity propagation |
| `assess_maturity_path` | `(capability, current_level, target_level)` | Action gap between levels |
| `map_personas` | `(capability? \| persona?)` | either direction of the persona↔capability matrix |
| `diff_framework_versions` | `(from?, to?)` | change report between artifact versions (errors helpfully when only one version present) |

Not tools: whole-entity static reads (those are resources); `explain_*`
anything (prompts). Tool descriptions written for agents: when to use,
when *not* to (pointer to the cheaper resource).

### 5.3 Prompts — user-invoked workflows

| Prompt | Args | Orchestrates |
|---|---|---|
| `explain-framework` | audience? | overview resource + domain/capability indexes → guided tour |
| `assess-capability-maturity` | capability | get_capability + get_actions → structured interview → level verdict with cited Actions |
| `plan-maturity-roadmap` | capability, current, target | get_prerequisites + assess_maturity_path → ordered plan honoring prerequisite minima |
| `map-personas-to-capabilities` | persona? | map_personas + persona resources → engagement guide |

Prompts contain instructions + resource references, never duplicated content.

### 5.4 Transport

stdio primary (`servers/framework` `bin`). Server construction
(`createServer(artifact)`) is transport-free; `main()` wires
`StdioServerTransport`. Streamable HTTP later = new entry point only.

## 6. Crawler pipeline

`npm run refresh` (root) → workspace script running stages, each restartable:

1. **fetch** — REST APIs (`capabilities-api`, `kpis-api`, `personas-api`) +
   sitemap cross-check + HTML pages (~130 URLs). Politeness: 1 rps, retries
   with backoff, honest UA `finops-framework-mcp-crawler/x.y (+repo URL)`,
   on-disk cache (`.cache/crawl/`, keyed by URL hash, respected unless
   `--no-cache`).
2. **parse** — cheerio, anchored on heading text/ids per research.md §2.5.
   Any structural surprise → `parse_quality: raw_fallback` + raw prose stored
   + warning in crawl report. Never fabricate structure.
3. **infer** — relationship pass (§3), separate stage, separate output file.
4. **validate** — ajv against `schema/`; counts asserted (22 capabilities, 6
   principles, …) with explicit override flag if the framework itself changes.
5. **diff + emit** — compare against current artifact by content hash, write
   `diff-report.md`, bump `data_version`, write manifest.

Fixtures: representative saved HTML pages committed under
`src/crawlers/framework/fixtures/` so parser unit tests never touch the
network.

## 7. Refresh automation

GitHub Actions workflow (monthly cron + `workflow_dispatch`): checkout → npm
ci → `npm run refresh` → if diff non-empty, open PR with `diff-report.md` as
body (base `dev`, human merges; the release train to `main` is the repo's
existing rolling PR). Downstream consumers pin by using a git tag/release of
this repo; floating = tracking `main`. Note: `.github/workflows/` is a
protected path in this repo — the workflow lands in this change set under the
owner-approved build brief; if the protection hook blocks the write, the file
is staged at `docs/proposed/refresh-data.yml` for the owner to move.

## 8. Testing strategy

- Parser unit tests vs. fixtures (per capability page shape, KPI modal, each
  section page) — the bulk of tests.
- Artifact contract tests: schema validation of the committed artifact;
  manifest hashes match files; official/derived separation (no `official:
  false` records inside `content/`).
- Server tests via SDK `Client` + `InMemoryTransport`: resource list/read per
  URI family, each tool's happy path + unknown-slug error + pagination,
  prompt rendering.
- Graph tests: prerequisite closure correctness on a synthetic mini-graph;
  cycle rejection.
- Eval suite (Phase 5): 10 multi-step Q&A in `evals/framework/eval.xml`, run
  by a fresh agent session against the built server, ≥9/10 to pass.

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| finops.org redesign breaks selectors | heading-anchored parsing; raw_fallback degradation; fixtures pin current shape; monthly refresh surfaces breakage as a failing PR, not silent rot |
| KPI modal structure varies | all popup fields optional; join by wp_id with title fallback; unresolved joins reported in crawl report |
| Inferred edges are wrong/absurd | separate file, confidence + rationale, cycle/degree checks, panel review at both gates; `include_inferred: false` escape hatch |
| Artifact drifts from schema | server refuses to start; CI validates artifact on every PR |
| License compliance | CC BY 4.0 attribution in NOTICE.md, every record, every resource footer |
| Count drift (e.g. 23rd capability) | validate stage asserts counts, fails loudly with override flag documented |

## 10. Definition-of-done mapping

1. Entities queryable → §5.1 resources + §5.2 list/search tools.
2. Capability detail incl. featured KPI popup content → Capability + KPI
   entities (§3), `get_capability`/`get_kpis`.
3. Graph queryable, inferred edges marked → §3 relationships, §5.1
   `finops://graph/relationships`, §5.2 `get_prerequisites`.
4. Decoupling → §4 contract + §8 contract tests + Phase 6 double-refresh.
5. Evals + two critique gates → §8, Phases 3/5/6.
