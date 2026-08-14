# Session: slug/capability param-naming investigation → T-079

## Investigate rename ask, add T-079 instead — 2026-08-07T00:00:00Z

- **Did:** Owner asked to add a param-unification task "only if the
  parameter should truly be the same" after hitting `slug` vs `capability`
  validation errors while driving the framework server over stdio.
  Explored both servers' tool schemas and handler resolution paths.
- **Result:** No rename task. All `capability` params and
  `get_capability.slug` resolve via the same `findCapability` lookup
  (same value domain), but the names encode role — `slug` = fetch-target
  identifier (polymorphic per tool), `capability` = filter — and T-077
  recorded an explicit owner "NO param renames" directive. Decision +
  rejected alternatives (unify, alias) recorded in decisions.md 2026-08-07.
- **Found instead:** two real defects, tracked as **T-079** via
  `tasks add`: (1) FOCUS `get_kpi_mapping` `capability` filter
  (src/servers/focus/tools.ts ~812) has no validation, case-folding, or
  nearestMatches hint — unknown values silently return `total: 0`, unlike
  every sibling lookup; (2) `get_attribute` uses `slug` where twin
  `get_column` uses `column` — fix is description-level only (T-077 bars
  renames).
- **Implementer notes:** reuse `nearestMatches` (src/shared/slugs.ts);
  valid capability slugs on the FOCUS side = union of
  `related_capability_slugs` across KPI mapping entries; regenerate
  docs/mcp-surface.md and rerun pack-focus after description edits.
- **Next:** T-079 sits pending for a future `tasks next` session; no code
  changed this session.

## T-080: description audit fixes implemented — 2026-08-07T00:00:00Z (later same session)

- **Did:** Owner asked "do any tool descriptions need updating?" — full audit
  of both servers found 6 genuine inaccuracies + 10 friction issues; owner
  chose to fix all 16 (T-080), tracked and implemented in-session.
- **Fixed (framework):** completable/.optional() ordering bug on the
  map-personas prompt persona arg (description+completion were being
  stripped — proof was the blank arg in docs/mcp-surface.md); search_framework
  description now names which param each downstream tool takes (root cause of
  the earlier slug-vs-capability live error); overview nav lists all 11 tools
  with their identifying params; map_personas retitled "mapping" (no matrix
  mode) + both-params error documented; get_kpis AND-combination documented;
  get_actions maturity-wins precedence documented; get_capability persona
  filter now errors with nearest-match hints (was silent empty).
- **Fixed (FOCUS):** get_kpi_mapping description adds the variance category
  + kpi-wins precedence; overview no longer claims every tool takes version
  (list_versions/compare_versions don't) and lists all 9 tools with params;
  compare_versions title interpolates diff versions; list_columns documents
  the 'unknown' parse-fallback enum value (enum KEPT — crawler emits it,
  crawlers/focus/parse/columns.ts); calculate_kpi states v1.2 bundles only
  the synthetic sample; findAttribute gains findColumn-style cross-version
  retry hint; explain-focus excludes the current version from "other
  versions"; get_requirements "nothing else" softened.
- **Evidence:** gates PASS (all 7); live stdio probes: persona-miss →
  'Unknown persona "financee". Did you mean: finance?'; CurrencyCodeFormat @
  1.2 → 'exists in FOCUS 1.0 … retry with version="1.0"'; mcp-surface.md
  regenerated (persona arg description now present). New vitest cases for
  persona validation (unknown + case-insensitive) and attribute cross-version.
- **Next:** reviewer subagent verdict pending (first run lost to a session
  interruption); then tasks complete T-080.
