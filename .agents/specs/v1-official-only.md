# Spec: v1 — official-only surface, markdown-canonical pipeline, publish prep

Owner-approved 2026-07-22 (supersedes the unofficial-extension scope of
`finops-framework-mcp-server.md` v0.1). Executed via the autonomous loop as
tasks T-005…T-009; each task cites the section it implements. Work lands on
branch `claude/session-k75rxy` (open PR #4 becomes the v1 PR).

## Problem

v0.1 shipped two unofficial derivation layers that missed the bar: itemized
"Action" records captured poorly, and the capability relationship graph
(harvested + inferred) neither captured nor inferred well. v1 must focus on
the official FinOps Framework structure and content, with a markdown-first
pipeline whose JSON is regenerable offline.

## Owner decisions (binding)

1. **Relationships: DELETE** — all content, inference code, tools, resource.
2. **Actions: FIX via markdown, HIDE** — regenerated from our own markdown;
   served only when `FINOPS_MCP_EXPERIMENTAL=1`.
3. **Pre-Crawl extension: HIDE** behind the same flag; official 3 levels
   (crawl/walk/run) everywhere by default.
4. **Markdown FULL LAYER** — crawler saves a semantic markdown doc per page
   into the artifact; ALL structured JSON derived from that markdown by a
   separate offline step (`derive` CLI command).
5. Deliberate keep: KPI records' `related_capability_slugs` (official
   on-page KPI popup content, served only inside KPI records — NOT a graph).

## §1 Versions + relationship deletion (T-005)

- `src/shared/schemas.ts`: `SCHEMA_VERSION = "2.0.0"`.
- `src/servers/framework/server.ts`: `SERVER_VERSION = "1.0.0"`.
- `src/crawlers/framework/emit.ts` `bumpVersion`: if previous manifest's
  `schema_version` major ≠ current `SCHEMA_VERSION` major, next
  `data_version` = `<new schema major>.0.0`.
- Delete files: `src/crawlers/framework/infer.ts`, `infer.test.ts`,
  `src/servers/framework/graph.ts`; `git rm`
  `data/framework/derived/relationships-official.json`,
  `relationships-inferred.json`,
  `data/framework/schema/relationships.schema.json` (emit never deletes
  stale files — remove by hand; also remove the changelog references is NOT
  needed, changelog history may mention them).
- `src/shared/types.ts`: delete `RelationshipType`, `RelationshipSource`,
  `Confidence`, `CapabilityRelationship`, and both `relationships_*` fields
  on `Artifact`. `schemas.ts`: delete `relationshipsSchema` + both
  `ARTIFACT_FILES` entries. `artifact.ts`: remove their loads and the two
  relationship blocks in `crossValidate`.
- `src/crawlers/framework/cli.ts`: remove the relationships stage and both
  files from the emit map. `parse/capability.ts`: remove
  `definition_capability_links` + `inputs_outputs_capability_links` (fields
  and extraction); KEEP `FeaturedKpiDetail.related_capability_slugs`.
- `src/servers/framework/tools.ts`: delete `get_prerequisites` and
  `get_related`; remove `"relationships"` from `get_capability` INCLUDE +
  section + description; in `assess_maturity_path` drop
  `related_prerequisites_hint` (schema + code). `resources.ts`: delete the
  graph resource. `uris.ts`: delete `URI.graph`. `render.ts`: delete
  `relationshipList` + the relationships branch in `capabilityMd`; remove
  the prerequisites/graph bullet from `overviewMd`. `prompts.ts`:
  plan-maturity-roadmap drops the get_prerequisites step (renumber).
  `server.ts` instructions: remove graph/inferred-edge mentions.
- Tests: remove relationship/graph cases from `server.test.ts` and
  `artifact.test.ts`. Regenerate the artifact
  (`npm run build && node dist/crawlers/framework/cli.js refresh` — seeded
  cache, offline) so relationship files disappear and data_version becomes
  2.0.0. All gates green.

## §2 Markdown compose layer (T-006)

New canonical intermediate at `data/framework/content/markdown/`:
`capabilities/<slug>.md` (22), `personas/<slug>.md` (11), `kpis/<slug>.md`
(88), `principles.md`, `phases.md`, `domains.md`, `maturity-model.md`,
`technology-categories.md`, `scopes.md`.

- New `src/crawlers/framework/markdown/frontmatter.ts`: emit/parse plain
  `key: value` front-matter between `---` fences; sorted keys; values are
  string | number | string-list (comma-joined `[a, b]` form); no YAML dep.
- New `src/crawlers/framework/markdown/compose.ts`: deterministic
  serializers from the existing parser outputs (`ParsedCapabilityPage`,
  section parser results, persona/KPI records) to markdown docs. Rules:
  - Front-matter carries non-prose facts: `kind`, `slug`, `title`, `wp_id`,
    `domain`, `category`, `source_url`, `license`, `warnings` (compose-time
    parse warnings). NO timestamps (idempotence).
  - Canonical H2 headings are derive keys. Capability doc sections in
    order: `## Summary`, `## Headline Groups` (one `### <label>` per group,
    items as flat `- ` list), `## Definition` (verbatim md), `## Maturity
    Assessment` with `### Crawl|Walk|Run` (verbatim md incl. nested lists),
    `## Functional Activities` (one `### <heading verbatim>` per block,
    flat `- ` items), `## Measures of Success & KPIs` (flat `- ` items;
    `### Examples` items as `- <objective>` with nested
    `- Objective: …` / `- KPI: …` pairs preserved losslessly),
    `## Inputs & Outputs` (verbatim md), `## Featured KPIs` with one
    `### <KPI title> {wp_id=<id>}` per modal (description paragraphs,
    `#### Formula` fenced code block, `#### Candidate Data Sources` list,
    `#### Related Capabilities` list of `[Title](url)` links). Absent
    section ⇒ absent heading.
  - Escaping guard: compose THROWS if a plain-text item/label starts with
    `-`, `#`, or contains a newline (closed-dialect safety).
- `emit.ts`: `emitArtifact`/`diffArtifact` accept string payloads — written
  verbatim (single trailing newline), hashed into manifest `sha256`, diffed
  as whole-file entities.
- `cli.ts` refresh: after parsing, compose and include all markdown files
  in the emit map (JSON files unchanged this task).
- Tests (`src/crawlers/framework/markdown/compose.test.ts`): snapshot-style
  assertions per existing fixture (allocation, forecasting,
  finops-practice-operations, executive-strategy-alignment,
  sustainability); front-matter round-trip unit tests; double-refresh
  byte-idempotence still green. Regenerate artifact; gates green.

## §3 Derive step (T-007)

- New `src/crawlers/framework/markdown/derive.ts`:
  `deriveArtifactPayload(markdownDir): { files: Map<string, unknown>,
  counts, warnings }` — parses ONLY our dialect (front-matter, `^#{1,6} `
  headings, `- ` lists w/ 2-space nesting, fenced code) and produces every
  content/derived JSON payload currently built in `cli.ts`, including
  `derived/actions.json` regenerated from the `### Crawl|Walk|Run` lists
  (ordinal sequence, `parent_ordinal` from nesting, `official: false`,
  `parse_quality: "itemized"`; `raw_fallback` only when a level block has
  no list). KPI join: modal blocks keyed by `{wp_id=N}` merged into library
  records from `kpis/<slug>.md`.
- `cli.ts`: `refresh` = fetch → parse → compose → write markdown → derive
  from that markdown → validate → emit (JSON now comes FROM derive, not
  from the HTML parse directly). New `derive` subcommand regenerates JSON
  from `content/markdown/` with zero network/cache access. Completeness
  assertions, injection scan, count checks, ajv validation run in the
  shared derive path.
- Tests: round-trip — for each capability fixture,
  `derive(compose(parseHtml(fixture)))` deep-equals the direct parser
  output for every field; `refresh` then `derive` produces zero diff;
  double-`derive` byte-identical; actions ordinal/parent test vs the
  allocation fixture (known nested items). Gates green; artifact
  regenerated (content identical, markdown unchanged ⇒ ideally no diff).

## §4 Experimental flag + official-only maturity surface (T-008)

- `createServer(artifact, opts?: { experimental?: boolean })`;
  `registerTools/registerResources/registerPrompts` accept the option.
  `main.ts`: `experimental = process.env.FINOPS_MCP_EXPERIMENTAL === "1" ||
  process.argv.includes("--experimental")`.
- Default (flag off): NO `get_actions` tool; NO pre-crawl anywhere —
  tool enums (`LEVELS` usage), resource template `levels` + completions,
  `get_maturity_model` output (no `unofficial_extension` field... keep the
  outputSchema field optional and omit), `maturityLevelMd`/`collectionMd`
  pre-crawl branches, prompt texts, `overviewMd`, server `instructions`.
- New default tool `get_maturity_assessment(capability, level?)` —
  verbatim official `maturity_raw` markdown per level, attribution footer,
  `resource_link`, nearest-match errors. `assess_maturity_path` reshaped:
  `gap: [{maturity, assessment_md}]` (verbatim md), enums crawl|walk|run,
  no unofficial note; keep `level`-style naming consistent.
- Flag on: `get_actions` returns (description prefixed "EXPERIMENTAL",
  keeps unofficial note + pre-crawl behavior); pre-crawl restored in enums,
  maturity model, resources, prompts.
- IMPORTANT regression traps: keep `.describe()` INSIDE `completable()`
  for any touched prompt args; `get_kpis`/text-equivalence and attribution
  behavior unchanged.
- Tests: flag-matrix (two servers via `createServer` — default lacks
  get_actions and any "pre-crawl" mention in tools/list schemas +
  maturity-model output has exactly 3 levels; experimental has both);
  `get_maturity_assessment` happy/miss/attribution; existing get_actions
  and pre-crawl tests move into the flag-on describe block. Gates green.

## §5 Docs, artifact v2, evals, npm prep (T-009)

- Regenerate artifact (refresh, offline cache): manifest `schema_version`
  2.0.0, `data_version` 2.0.0, markdown files hashed; commit.
- `docs/architecture.md`: rewrite §3 (drop relationships; Action = hidden
  experimental), §4 (markdown layer + derive), §5 (final tool/resource
  list, flag), §6 (compose/derive stages). `README.md`: v1 scope note (no
  relationship graph; official-only default; experimental flag doc),
  tool list update, npx quickstart. `.agents/specs/`: this spec stays; old
  spec gets a superseded note.
- `evals/framework/eval.xml`: Q1 expected_calls →
  `get_maturity_assessment` or `get_capability include maturity`, drop the
  unofficial-parsing phrasing; Q2 → "What does a Walk-level Sustainability
  practice look like? Quote two statements from the official maturity
  assessment" (expected: verbatim quotes via get_maturity_assessment);
  Q10 → "How many maturity levels does the official FinOps model define,
  and what are they?" (expected: exactly 3 — Crawl, Walk, Run; server must
  NOT volunteer pre-crawl).
- npm prep: `package.json` — remove `"private": true`, version `1.0.0`,
  `files: ["dist", "data/framework", "README.md", "LICENSE", "NOTICE.md"]`,
  `mcpName: "io.github.aaronmsoto/finops-framework-mcp"`, `repository`,
  `keywords`, `description`, `prepublishOnly: "npm run build && npm test"`.
  New root `server.json` (MCP registry: name
  `io.github.aaronmsoto/finops-framework-mcp`, npm package, stdio).
  Verify `npm pack --dry-run` lists dist + data only (~1-2 MB), no
  fixtures/src/tests.
- Gates `--tier all` green.

## Non-goals (v1)

Cloudflare Workers remote endpoint (v1.1 — needs artifact-from-memory
loader + Worker entry); Action→MaturityCharacteristic rename (still an open
owner decision, moot while hidden); cheerio dependency slimming.

## Acceptance (spec-level)

- [ ] Default `tools/list`: no get_actions/get_prerequisites/get_related;
      has get_maturity_assessment; no schema/description mentions pre-crawl.
- [ ] `FINOPS_MCP_EXPERIMENTAL=1`: get_actions + pre-crawl served, labeled.
- [ ] `content/markdown/` complete (127 docs) and canonical: `derive`
      rebuilds byte-identical JSON from it offline.
- [ ] refresh idempotent; refresh→derive zero diff.
- [ ] Artifact v2.0.0; no relationship files; all gates `--tier all` green.
- [ ] Eval re-run (revised eval.xml) ≥9/10 — done post-loop by the
      supervising session.
- [ ] `npm pack --dry-run` clean; owner runs the actual publish.
