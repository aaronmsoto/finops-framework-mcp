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
