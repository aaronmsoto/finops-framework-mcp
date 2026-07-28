# Active context — the handoff file

<!--
  Format (keep all four sections, most recent truth only — this file is
  overwritten, not appended; history lives in .agents/journal/ and git):
    ## In flight       — what is currently being worked on, by whom/what mode
    ## Next steps      — ordered, concrete, small
    ## Open questions  — things a future session must not silently re-decide
    ## Last updated    — ISO date + actor
  `memory lint` warns when this file goes stale while commits continue.
-->

## In flight

focus-spec-mcp v1 build loop (`.agents/specs/focus-mcp-v1.md`, tasks
T-027..T-038) is underway. T-027..T-030 are DONE.

T-030 this session: `src/servers/focus/` — the version-aware FOCUS stdio
server, mirroring `src/servers/framework/`'s module layout (server/main/
tools/resources/prompts/uris/render/search). Loading: `src/shared/focus/
schemas.ts` defines `FOCUS_ARTIFACT_FILES` (manifest.json/columns.json/
attributes.json schemas); `src/shared/focus/artifact.ts` `loadFocusStore(dir)`
reads `data/focus/index.json`, loads each version dir through
`loadArtifactGeneric` (T-028) into `Map<spec_version, FocusVersionArtifact>`
(+ raw glossary.md/CHANGELOG.md text), cross-checks each version's
manifest.json sha256 against index.json's `manifest_sha256`, and loads/
verifies the derived diff file against index.json's `derived` map — throws
`ArtifactValidationError` on any mismatch (tested: schema violation,
manifest hash mismatch, tampered diff, missing file). Server: 7 tools
(list_versions, get_column, list_columns, search_focus, get_attribute,
get_requirements, compare_versions) — all but list_versions/compare_versions
take `version` (default "1.2", echoed as `spec_version` in structuredContent);
column/attribute lookup accepts Column ID or slug, case-insensitive, with
nearestMatches suggestions on miss. `list_columns`/`search_focus` cursors
bind `version` into `cursorContext`'s fingerprint (shared/tools.ts), so
cross-version cursor reuse hits "Cursor mismatch" (tested). Resources:
`focus://spec/overview`, `/versions`, `/{version}/columns/{slug}` +
`/attributes/{slug}` + `/glossary` (ResourceTemplates, 2-var complete()
using request context for `slug` filtered by `version`), `/changes/1.0-1.2`
(fixed) — unknown version/slug both hit -32002 with nearestMatches (tested).
2 prompts (explain-focus, map-column-across-versions). CC BY 4.0 footer
(`render.ts` `footer()`) on every content-bearing response, mirroring
`shared/footer.ts`'s `ccByFooter`. `main.ts` mirrors the framework server's
main.ts exactly (isDirectRunOf gate, --version flag prints
`focus-spec-mcp vX (FOCUS spec versions: 1.0, 1.2; latest 1.2)`, FOCUS_MCP_DATA
env override). Discovered attribute IDs are renamed across versions
(CurrencyCodeFormat@1.0 → CurrencyFormat@1.2, ColumnNamingAndOrdering@1.0 →
ColumnHandling@1.2) — get_attribute needs the right `version` for a 1.0-only
id, which the outputSchema-conformance and get_attribute tests now cover
explicitly. 42 new tests (server.test.ts incl. outputSchema conformance
over every tool + cross-version cursor rejection; artifact.test.ts;
main.test.ts incl. dist symlink --version), all green. Verified live via
`node dist/servers/focus/main.js --version` and
`node evals/framework/mcp-call.mjs --server=focus list-tools|call ...`
(the eval bridge is already server-agnostic from T-028, no changes needed).
Root package.json bin/files untouched — packaging (`packages/focus-spec-mcp/`)
is a later task per the spec. Gates green, 268/268 tests pass (+42 for focus).

## Next steps

1. Continue T-031..T-038 per `.agents/specs/focus-mcp-v1.md` in order
   (KPI mapping / calculate_kpi, sample data, packaging shim, worker,
   critique gate #4, evals/focus).
2. Open PR (branch → dev) for the harness fix batch (T-025/T-026) + v1.1
   mini-batch once focus-mcp-v1 work reaches a natural checkpoint.
3. Owner: npm publish + mcp-publisher registry submit remain pending from
   v1 (PR #4 merged to dev; publish happens from main after release).
4. Port-back session in agentic-starter-repo: copy the harness diff per the
   tracker's port-back notes (deviations: fractional max_iteration_minutes,
   RunnerResult.stderr, AGENTIC_MOCK_USAGE contract) + consider harness-CI.
5. Owner: install docs/proposed/refresh-data.yml per its checklist.

## Open questions

- M11 rename (Action → MaturityCharacteristic) — owner call; moot while
  Actions stay behind FINOPS_MCP_EXPERIMENTAL.
- Known limitation: MCP SDK zod validation silently strips unknown tool
  params (docs/eval-results.md #3) — revisit when SDK supports strict input
  schemas.
- Template feedback queued for agentic-starter-repo: `gates --tier full`
  runs only full-tier gates (use `--tier all` before shipping); refresh-
  workflow GITHUB_TOKEN/CI caveats mirror the template's item 3; NEW —
  supervising sessions must not commit a live loop's in-flight tasks.json
  (stop-hook lesson, journal 20260723-harness-improvements-session.md).

## Last updated

2026-07-28 — T-030 done (version-aware focus stdio server); focus-mcp-v1 loop underway.
