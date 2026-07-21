# 20260721 — FinOps Framework MCP server build (owner brief, overnight run)

## T-003 + Phases 0-2 — 2026-07-21T21:30:00Z

- Did: owner dropped the full build brief (multi-phase gated process,
  research -> architecture -> critique panel -> implement -> evals -> final
  critique; owner-approved deviation from one-task-per-session and loop
  design; owner asleep, build-to-completion authorized). Phase 0: verified
  CC BY 4.0 + robots OK; found WP REST endpoints and server-rendered KPI
  modals (docs/research.md). Phases 1-2: docs/architecture.md (domain model,
  artifact contract, MCP surface, refresh pipeline) + spec
  .agents/specs/finops-framework-mcp-server.md => completes T-003.
- Deviation note: monorepo lives under src/ as npm workspaces so protected
  agentic.config.json gate definitions stay untouched while gates cover all
  code.
- Next: Phase 3 adversarial critique panel (5 subagents) before any code.

## Phase 3 gate: critique panel 1 — 2026-07-21T22:40:00Z

- Did: 5 parallel critic subagents (MCP purist, agent-UX, data engineer,
  FinOps practitioner, maintainer). 5 unique BLOCKERs, 16 MAJORs, 13+
  MINORs -> docs/critique-1.md with dispositions; architecture.md rewritten;
  research.md 2.5 corrected (maturity blocks are h4+flat/nested ul, NOT
  p/b+ul; KPI modals can live under a separate h2; Scopes are NOT
  enumerable — legacy /wp/v2/scope == today's Technology Categories).
- Key decisions: drop npm workspaces (plain dirs + eslint boundaries);
  cut diff_framework_versions (changelog in artifact + get_changelog);
  dual licensing (code MIT, data CC BY 4.0); sanitize stage vs prompt
  injection; workflow ships ONLY as docs/proposed/refresh-data.yml (owner
  installs); tests only under src/**/*.test.ts (tests/ is protected);
  inference restrained to evidence-quoted edges, enum confidence.
- Owner morning item: approve renaming derived entity Action ->
  MaturityCharacteristic (M11, accepted-with-rationale for now; semantics
  already fixed in descriptions).
- Gate verdict: zero unresolved BLOCKERs. Phase 4 (implementation) begins.

## Phase 4 complete — 2026-07-22T00:20:00Z

- Crawler: fetch/cache/robots -> parse -> sanitize-scan -> infer -> validate
  -> emit. Real artifact committed (v1.0.0: 22 caps, 489 items, 88 KPIs,
  65 official + 38 inferred edges). Double refresh = byte-identical (tested).
- Parse reality handled: htmlToMd multi-node bug found via principles=0;
  ESA "As someone in an X role" h4s; ITAM/Sustainability named allied
  personas; governance missing Definition h2 (id fallback); intersecting-
  disciplines duplicate Maturity h2. All covered by fixture tests (63 total).
- Server: 11 tools / 40+ resources + 4 templates / 4 prompts; stdio smoke
  test green; full gates (incl. build) PASS.
- Workflow delivered as docs/proposed/refresh-data.yml only (protected path).
