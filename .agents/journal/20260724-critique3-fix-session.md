# 2026-07-24 — Critique gate 3 (publish gate): panel, fixes, Run 4

Owner-ordered two-track adversarial review; this repo got Track A, the
publish gate. Method: 4 lenses probing the LIVE server via the eval bridge
plus SDK probes; every finding confirmed by a reproduce-evidence verifier
and a so-what skeptic. Result: 1 BLOCKER, 3 MAJOR, 10 MINOR confirmed;
1 refuted. Verdict SHIP-after-fixes. Report: docs/critique-3-publish-gate.md.

## Fixes landed (T-020..T-024, one commit each, chain valid)

- T-020 BLOCKER: npm bin guard compared argv[1] by suffix — false under the
  node_modules/.bin symlink, so npx/Claude Desktop/claude mcp add silently
  exited 0. Realpath comparison + symlink tests; npm pack + temp install
  smoke test now serves --version and initialize through the .bin entry.
  (Regression introduced by T-019's isDirectRun refactor; caught only
  because the panel simulated npm's exact install mechanism.)
- T-021 MAJOR: cursors now carry a context fingerprint; cross-query/
  cross-tool reuse errors instead of silently serving empty pages with
  "try broader terms" advice.
- T-022 MAJOR: list_capabilities serves full official summaries (14/22 were
  mid-word 200-char cuts); text block includes them per the description.
- T-023 MAJOR: map_personas carries the CC BY footer + per-entry
  uri/source_url + license field in all three modes.
- T-024 (gate-required MINOR): get_kpis outputSchema declares
  source_url/license; new conformance test walks EVERY tool's
  structuredContent against its declared schema (honoring z.record) — the
  validating SDK client now accepts get_kpis calls.

## Verification

Gates PASS incl. --tier all; eval Run 4 (fresh agent, tools-only,
text-blocks-only): 10/10, zero errors/detours — recorded in
docs/eval-results.md with a self-grading disclosure note.

## Still open from the gate (MINOR queue, not publish-gating)

entity_type singular/plural mismatch; misnamed-optional-param silent drop
(SDK limitation, mitigations possible); map_personas 35KB persona view size
control; changelog text shows artifact paths; stale parse_warnings in
manifest; refresh cadence promise; "not endorsed" placement; non-Claude
client install docs. All listed with fix sketches in the gate report §MINOR.

## Publish recommendation

SHIP: BLOCKER + 3 MAJORs + the schema fix are in with regression tests, the
gate's re-verification (gates --tier all + eval re-run) is done. npm publish
+ registry submit remain the owner's human approval point.
