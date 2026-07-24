## T-005: delete relationship functionality, bump schema 2.0.0 — 2026-07-23T01:05:00Z

- Did: implemented spec §1 (`.agents/specs/v1-official-only.md`) in full.
  - Deleted `src/crawlers/framework/infer.ts`, `infer.test.ts`,
    `src/servers/framework/graph.ts` (`git rm`).
  - `shared/types.ts`: removed `RelationshipType`, `RelationshipSource`,
    `Confidence`, `CapabilityRelationship`, and the two `relationships_*`
    fields on `Artifact`. Kept `Kpi.related_capability_slugs`.
  - `shared/schemas.ts`: `SCHEMA_VERSION = "2.0.0"`; removed
    `relationshipsSchema` and both `ARTIFACT_FILES` entries.
  - `shared/artifact.ts`: removed the two relationship loads and both
    `crossValidate` blocks (referential check + inferred/official shape
    checks).
  - `crawlers/framework/cli.ts`: removed the relationships stage (import,
    computation, emit-map entries).
  - `crawlers/framework/parse/capability.ts`: removed
    `definition_capability_links` and `inputs_outputs_capability_links`
    (fields + extraction); `FeaturedKpiDetail.related_capability_slugs`
    untouched.
  - `crawlers/framework/emit.ts`: `bumpVersion` now takes the previous
    `Manifest` (not just a version string) and returns
    `<new schema major>.0.0` whenever the previous manifest's
    `schema_version` major differs from the current `SCHEMA_VERSION` major;
    otherwise unchanged minor/patch bump logic. Added a unit test for the
    schema-major-bump path; removed the relationship-specific
    `diffArtifact` keying test (relationships no longer exist as an
    entity — the generic from/to keying branch in `entityKey` is
    untouched, just no longer exercised by a domain-specific fixture).
  - `servers/framework/tools.ts`: deleted `get_prerequisites` and
    `get_related`; removed `"relationships"` from `get_capability`'s
    `INCLUDE` + its section-building code + description; removed
    `related_prerequisites_hint` (schema + code) from
    `assess_maturity_path`.
  - `servers/framework/resources.ts` + `uris.ts`: deleted the `graph`
    resource and `URI.graph`.
  - `servers/framework/render.ts`: deleted `relationshipList` and the
    relationships branch in `capabilityMd`; removed the
    prerequisites/graph bullet and "inferred relationship edges" mention
    from `overviewMd`.
  - `servers/framework/prompts.ts`: `plan-maturity-roadmap` drops its
    `get_prerequisites` step and renumbers (2 steps instead of 3).
  - `servers/framework/server.ts`: `SERVER_VERSION = "1.0.0"`; instructions
    no longer mention the relationship graph or inferred edges.
  - Tests: removed the graph-resource and `get_prerequisites` cases from
    `server.test.ts`; removed the two relationship assertions from
    `artifact.test.ts`'s "marks every derived record unofficial" test
    (kept the `maturity_extension`/`actions` assertions).
  - `git rm` the four relationship data/schema files under
    `data/framework/{derived,schema}/`.
  - Regenerated the artifact fully offline: `npm run build && node
    dist/crawlers/framework/cli.js refresh` — used the seeded
    `.cache/crawl` (0 network fetches, 44 cached), 0 added/removed/changed
    content diffs, and `data_version`/`schema_version` both landed at
    `2.0.0` per the bumpVersion schema-major rule.
- Result (evidence):
  - `./scripts/agentic gates --tier all` → PASS on every gate: format,
    lint, typecheck, test (79/79, coverage report clean), designs,
    integrity (1 warning: diff mixes impl + its own tests — expected for a
    deletion task, not a defect), memory, build.
  - `grep -rln "relationship\|Relationship\|get_prerequisites\|get_related\|prerequisiteClosure\|relatedEdges" src` →
    empty.
  - `ls data/framework/derived data/framework/schema` → no
    `relationships-*` files remain.
  - Ran the built server directly (`node dist/servers/framework/main.js`):
    printed `finops-framework MCP server ready on stdio (data v2.0.0, 22
    capabilities)` and exited cleanly — confirms the regenerated artifact
    loads and validates under the new schema with no relationship files.
- Next: T-006 (markdown compose layer, spec §2) is next in the loop
  sequence. No blockers.
