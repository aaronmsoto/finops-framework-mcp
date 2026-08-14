## Rename get_capability/get_attribute's slug param (T-081) — 2026-08-13T00:00:00Z

- did: Q&A session on the `slug`-vs-`capability` param investigation from
  2026-08-07 (T-079 scoping) surfaced that the prior decision's own stated
  rule didn't hold: `get_actions`, `get_maturity_assessment`, and
  `assess_maturity_path` already use `capability` as their sole required
  identifying param — the same role `get_capability`'s `slug` plays, making
  `get_capability` the actual outlier against its true siblings, not the
  reverse. Same shape one level down in FOCUS (`get_column`'s `column` vs
  `get_attribute`'s generic `slug`). Confirmed via direct source inspection
  (`grep` across both tools.ts files) and asked the owner whether to reopen
  the no-rename ruling given nothing is published yet (no git tag,
  `docs/release-runbook.md`'s first-publish step still open). Owner chose
  to rename. Added T-081, implemented: `get_capability`'s `slug` →
  `capability` (framework); `get_attribute`'s `slug` → `attribute` (FOCUS).
  Updated all call sites — server.test.ts (both servers), demo-requests.test.ts,
  demo/requests.js (the live Worker demo's request builder — this one
  matters, it's what the deployed demo actually sends), both render.ts
  overview navs, search_framework's description, docs/mcp-surface.md
  (regenerated), docs/guide/*.html (6 files: example-esr, example-forecasting,
  example-showback, focus-server, framework-server, index — including
  re-running the live CLI transcript embedded in index.html against the
  rebuilt server to keep it honest), evals/*.xml (3 files: focus/eval.xml,
  focus/combined-scenario.xml, framework/eval.xml). Recorded the amendment
  in decisions.md (2026-08-13 entry) with full rationale and rejected
  alternatives.
- result: `./scripts/agentic gates` full run PASS (format, lint, typecheck,
  test — 413 tests, designs, integrity, memory); one transient test-gate
  flake on a prior run (isolated `gates test` and full `gates` both passed
  clean afterward — no code issue, not investigated further since it didn't
  reproduce). Live stdio probes against the rebuilt dist/ servers confirm:
  `get_capability({capability: "forecasting"})` and
  `get_attribute({attribute: "datetime_format"})` both work; the old
  `{slug: ...}` shape on either tool now returns a loud MCP validation error
  ("expected string, received undefined" on the now-required field) instead
  of the SDK's usual silent-drop-unknown-param behavior, because there's no
  other required field to mask the miss.
- implementer notes: kept T-079 separate and still pending (get_kpi_mapping
  capability-filter validation; get_column description clarity) — this
  rename doesn't substitute for it, though get_attribute's half of T-079's
  "clarify slug vs column" acceptance criterion is now moot since the param
  name itself is unambiguous.
- next: T-079 remains the next pending tracked task. No further renames
  planned — the 2026-08-07 ruling's core scope (get_kpis' slug+capability,
  map_personas' persona+capability, get_kpi_mapping's kpi+capability, FOCUS
  column) stands, since those tools genuinely need role-distinct names to
  address two different slug-typed filters in one call.
