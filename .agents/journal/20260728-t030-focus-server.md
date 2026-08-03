## T-030: build the version-aware focus stdio server — 2026-07-28T07:50:00Z

- Did:
  - Added `src/shared/focus/schemas.ts` (`FOCUS_ARTIFACT_FILES`: JSON
    Schemas for manifest.json/columns.json/attributes.json, mirroring
    `src/shared/schemas.ts`'s pattern) and `src/shared/focus/artifact.ts`
    (`loadFocusStore(focusDir)`): reads `data/focus/index.json`, loads
    each version dir through `loadArtifactGeneric` (T-028) into
    `Map<spec_version, FocusVersionArtifact>` (columns/attributes/manifest
    + raw glossary.md/CHANGELOG.md text read alongside), cross-checks
    each version's manifest.json sha256 against index.json's
    `manifest_sha256` and the derived diff file against index.json's
    `derived` map, throwing `ArtifactValidationError` on any mismatch.
    Exported from `shared/index.ts`.
  - Added `src/servers/focus/`: `server.ts`/`main.ts`/`tools.ts`/
    `resources.ts`/`prompts.ts`/`uris.ts`/`render.ts`/`search.ts`,
    module-for-module mirroring `src/servers/framework/`'s layout so the
    two servers stay maintainable in parallel.
  - Tools: `list_versions`, `get_column`, `list_columns` (feature_level/
    column_type filters), `search_focus`, `get_attribute`,
    `get_requirements`, `compare_versions`. All version-taking tools
    default `version` to "1.2" and echo `spec_version` in
    structuredContent; column/attribute lookup accepts Column ID or slug
    case-insensitively with `nearestMatches` suggestions on miss.
    `list_columns`/`search_focus` cursors fold `version` into
    `cursorContext`'s fingerprint (existing shared/tools.ts machinery) so
    a cursor from one version reused against another hits "Cursor
    mismatch" rather than silently applying the wrong offset.
  - Resources: `focus://spec/overview`, `/versions`,
    `/{version}/columns/{slug}`, `/{version}/attributes/{slug}`,
    `/{version}/glossary` (ResourceTemplates with list() + 2-variable
    complete(), `slug` completion filtered by the in-progress `version`
    argument via the SDK's completion request context), and the fixed
    `/changes/1.0-1.2`. Unknown version or slug both throw -32002 with a
    nearestMatches suggestion. 2 prompts (explain-focus,
    map-column-across-versions).
  - CC BY 4.0 attribution footer (`render.ts` `footer()`, reusing
    `shared/footer.ts`) on every content-bearing tool/resource response.
  - `main.ts` mirrors the framework server's CLI exactly: `isDirectRunOf`
    gate, `FOCUS_MCP_DATA` env override, `--version` prints
    `focus-spec-mcp vX (FOCUS spec versions: 1.0, 1.2; latest 1.2)`.
  - Tests: `src/shared/focus/artifact.test.ts` (load + 4 failure modes:
    schema violation, manifest hash mismatch, tampered derived diff,
    missing file), `src/servers/focus/server.test.ts` (33 tests: every
    tool incl. version default/echo/unknown-version/nearest-match,
    outputSchema conformance over all 7 tools with an explicit
    "every registered tool is covered" assertion, cursor accept/cross-
    version-reject/cross-tool-reject/stale, resource list/read/-32002
    for unknown version+column+attribute, template completion, both
    prompts), `src/servers/focus/main.test.ts` (5 tests: direct-run
    detection, `--version` incl. via a dist symlink).
- Result (evidence):
  - `npx vitest run` (full suite): 268/268 passed (was 226 before this
    task; +42 new). `./scripts/agentic gates`: PASS across format, lint,
    typecheck, test, designs, integrity, memory (one pre-existing
    integrity WARN about diff size vs `origin/main`, unrelated to this
    task — origin/main is several merged PRs behind local history).
  - Observed behavior: `node dist/servers/focus/main.js --version` →
    `focus-spec-mcp v1.0.0 (FOCUS spec versions: 1.0, 1.2; latest 1.2)`.
    `node evals/framework/mcp-call.mjs --server=focus list-tools` lists
    all 7 tools (the eval bridge needed no changes — the `--server=`
    flag was already added in T-028). Manually called every tool via the
    bridge (get_column by ID and slug, unknown column/version errors,
    list_columns with feature_level/column_type filters, search_focus,
    get_attribute, get_requirements, compare_versions with and without
    `column`) and inspected the JSON — attribution footers present,
    `spec_version` echoed, error messages carry nearest-match
    suggestions.
  - Discovered while testing: attribute IDs are renamed across versions
    (`CurrencyCodeFormat`@1.0 → `CurrencyFormat`@1.2,
    `ColumnNamingAndOrdering`@1.0 → `ColumnHandling`@1.2) — not a bug,
    just means `get_attribute` needs the matching `version` for a
    1.0-only id; covered explicitly in server.test.ts.
- Next:
  - T-031 onward per `.agents/specs/focus-mcp-v1.md`: KPI→FOCUS mapping
    (`get_kpi_mapping`/`calculate_kpi`, DERIVED/UNOFFICIAL, cross-
    validated against `data/framework` kpis.json), sample data
    (official 1.0 CSV fixture + seeded generator), packaging shim
    (`packages/focus-spec-mcp/`), worker route, critique gate #4,
    `evals/focus`.
