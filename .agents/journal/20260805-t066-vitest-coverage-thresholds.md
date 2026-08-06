# 20260805 — T-066: enforce coverage via vitest thresholds, drop unbound gate

## T-066 done — 2026-08-05

- Did: second task of the CI product/governance split
  (`.agents/specs/ci-product-governance-split.md`). `vitest.config.ts`
  gained `coverage.thresholds` set exactly at the measured baseline —
  statements 75.6, branches 65.21, functions 75.6, lines 76.72 — so any
  coverage regression now fails `npm test` directly (the root `test`
  script is `vitest run --coverage`, so the product `test` gate and any
  future fork-PR CI job inherit enforcement for free). The unbound
  optional `coverage` entry was removed from `agentic.config.json`.
- **This STRENGTHENS coverage enforcement, not weakens it.** The removed
  `coverage` gate entry was `optional: true` with no `command` bound — it
  always reported `SKIP coverage` and checked nothing. It is replaced by
  live vitest thresholds that fail the `test` gate on regression. This is
  not a deleted or weakened gate; it is the spec's resolved decision #2
  (move coverage product-side).
- Enforcement proven live, not asserted: raising the statements threshold
  one point above baseline (75.6 → 76.6) made `npm test` exit 1 with
  `ERROR: Coverage for statements (75.6%) does not meet global threshold
  (76.6%)`, then the threshold was reverted to 75.6. At baseline
  thresholds `npm test` exits 0 with the summary exactly at
  75.6/65.21/75.6/76.72.
- Protected path: the `agentic.config.json` gates-block edit (removing the
  `coverage` entry) is explicitly AUTHORIZED by the spec ("Authorized
  protected-path edits") and this task's acceptance criteria.
  `approvals.yaml`, `.claude/settings.json`, and `.github/workflows/`
  untouched.
- Result: `./scripts/agentic gates --tier all` PASS — format/lint/
  typecheck/test/designs/integrity/memory/build all green, 407 tests, and
  the gate report no longer prints `SKIP coverage` (only `SKIP e2e`
  remains, which the spec keeps as-is).
- Next: T-067 — split `.github/workflows/ci.yml` into product +
  governance jobs, with the `.agentic/` stash fork-simulation evidence.
