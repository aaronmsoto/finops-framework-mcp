# 2026-07-30 — T-042: compare_versions errors on unknown columns

## Task

T-042 — compare_versions must error on a column that resolves in neither
served FOCUS version, instead of reporting status "unchanged" (critique
gate 4, finding C1-protocol-2, MAJOR).

## What I did

`compare_versions`'s fallthrough branch (`src/servers/focus/tools.ts`, after
the added/removed/changed lookups) previously returned success with
`status: "unchanged"` for *any* column that didn't match one of the diff's
three lists — including typos and nonexistent columns, since the diff only
records added/removed/changed entries and never lists genuinely-unchanged
columns explicitly. With the current data (14 added, 0 removed, 43 changed,
covering every real overlapping column), "unchanged" was reachable
*exclusively* via bad input.

Fix: before falling through to "unchanged", look up the column against both
`store.versions.get(diff.from)` and `store.versions.get(diff.to)`'s column
sets (same id/slug matcher `findColumn` uses). If it resolves in neither,
return `err(...)` with the same `nearestMatches` did-you-mean suggester
`get_column` uses (built from the de-duplicated slug union of both
versions), `isError: true`. Only if it resolves in at least one artifact
does it report `status: "unchanged"`, using the canonical `id` from
whichever artifact matched (mirrors added/removed/changed already returning
canonical ids, not the raw user input).

## Tests

`src/servers/focus/server.test.ts`:
- Tightened the pre-existing "compare_versions reports 'changed' for
  BilledCost" test from `expect(["changed","unchanged"]).toContain(...)` to
  `.toBe("changed")` — the loose assertion was exactly the old bug's cover.
- New test: `BilledCosts` (typo) → `isError: true`, text matches
  `Unknown column "BilledCosts"` and `Did you mean`.
- New test: since the real 1.0→1.2 diff has zero naturally-unchanged
  columns (all 43 shared columns are flagged changed), constructed a
  synthetic case — clone the real store, remove one real
  `changed_columns` entry (a column genuinely present in both real version
  artifacts) from the clone's diff, spin up a second `createServer`
  instance over the synthetic store, and confirm `status: "unchanged"` for
  that column id. This is a real column in both artifacts with no diff
  entry, matching the acceptance criterion's exact semantics without
  hand-rolling a fake `FocusStore` from scratch.

## Result

`./scripts/agentic gates` — PASS (format/lint/typecheck/test 367 passed,
up from 365/designs/integrity/memory/build all green).

Live-probed via `node evals/framework/mcp-call.mjs --server=focus call
compare_versions '{"column":"BilledCosts"}'` → `isError: true`, text
`Unknown column "BilledCosts" in FOCUS 1.0 or 1.2. Did you mean: billedcost?
Use list_columns for the full list.`; and
`'{"column":"BilledCost"}'` → `status: "changed"`, `changed_fields:
["description_md","requirements"]` (unchanged from before — real column
behavior untouched).

Independently verified by the `reviewer` subagent: traced the fix logic by
hand, live-probed the built server itself, ran the gates independently, and
confirmed no protected paths or unrelated files were touched. Verdict:
pass, no defects found.

## Next steps

T-043..T-047 remain in the gate-4 fix batch (README "official" phrasing,
compare_versions materiality caveat, calculate_kpi 0/0 guard, KPI mapping
version differentiation, cross-version unknown-column hints, diff artifact
official:false marker, package trademark naming — owner decision).
