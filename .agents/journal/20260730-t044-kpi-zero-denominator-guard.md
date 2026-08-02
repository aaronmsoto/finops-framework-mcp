## T-044 — calculate_kpi zero-denominator guard (gate4 C3-version-1/C4-community-2) — 2026-07-30T00:00:00.000Z

- task: T-044 — For the three commitment KPIs (commitment-utilization-score,
  percentage-of-commitment-based-discount-waste, consumption-versus-commitment),
  `calculateKpi` (`src/shared/focus/kpi-calc.ts`) called the shared `ratio()`
  helper, which coerces a zero denominator to 0 — so at FOCUS 1.0, where the
  official sample has zero `ChargeCategory="Purchase"` rows, the server
  reported a definite-looking "0%"/"100%"/"0" instead of erroring, silently
  violating its own stated design ("uncomputable KPIs error with guidance
  instead").
- fix: added `commitmentUsageAndPurchase(t)` in `kpi-calc.ts` — computes the
  same usage/purchase sums the three formulas already computed inline, and
  throws (instead of returning) when `purchase === 0`, with a message
  explaining the sample lacks qualifying Purchase rows and suggesting
  `version="1.2"` (verified FOCUS 1.2's bundled synthetic sample does carry
  12 qualifying rows, so the suggestion is actually true, not just a stock
  phrase). The three formulas now call this helper instead of duplicating the
  usage/purchase computation; ESR's `ratio()`-based zero-denominator return-0
  is untouched (0 ListCost really does mean 0% savings — semantically true,
  per the task's carve-out). `calculateKpi`'s thrown error is caught by the
  existing `tools.ts` `calculate_kpi` handler's try/catch, which already
  wraps it into the clean `err(...)` guidance path (isError: true) — no
  handler change needed, only the formula-level throw.
- tests updated per this task's explicit authorization to touch fixtures that
  pinned the old fabricated values:
  - `src/shared/focus/kpi-calc.test.ts`: new `it.each` over the three
    commitment KPIs asserting a zero-Purchase-rows table throws matching
    `/no ChargeCategory="Purchase" rows.*not computable.*version="1\.2"/s`.
  - `src/servers/focus/server.test.ts`: new test asserting all three KPIs
    error with guidance (not computable, mentions `version="1.2"`) at 1.0,
    and a second test asserting all three compute a real number at 1.2
    (whose synthetic sample has qualifying rows).
  - `src/workers/demo-requests.test.ts`: the walkthrough's step-6 KPI loop no
    longer asserts numeric 0/100/0 for the three commitment KPIs; instead it
    branches on `result.isError`, recording each as not-computable and
    asserting the error text matches `/not computable/` and
    `/version="1\.2"/`. ESR's real-number assertion (26.552972346576816%) is
    unchanged.
  - `demo/app.js`: the per-KPI `calculate_kpi` loop (step 6) now catches a
    per-iteration failure instead of letting it propagate to the outer
    `runWalkthrough` catch — a `calculate_kpi` error is that tool's own
    documented contract (error-with-guidance), not a walkthrough failure, so
    the error step is rendered (already handled by `callStep`/`logStep`) and
    the walkthrough continues to the next featured KPI; final status notes
    how many of the featured KPIs were not computable instead of claiming a
    blanket "stopped".
  - `evals/focus/combined-scenario.xml`: step 5's `<expected>` now states the
    three commitment KPIs return a tool error with guidance (not 0%/100%/0);
    step 6 (author annotation) rewritten to explain *why* the guarded throw
    is correct (undefined ratio, not 0), that 1.2's sample does compute, and
    explicitly notes this supersedes the prior "not a bug, 0/0 floors to
    0%/100%" framing that gate 4 (C3-version-1/C4-community-2) found to be a
    fabrication.
- Re-ran `node scripts/bundle-worker-data.mjs` — no diff (kpi-calc.ts's logic
  isn't baked into the committed data bundles, only invoked at request time).
- gates: PASS (`--tier all`: format/lint/typecheck/test 374 passed/coverage
  skipped/designs/integrity/memory/build all pass).
- Live probes:
  - `calculate_kpi '{"kpi":"commitment-utilization-score","version":"1.0"}'`
    → `isError: true`, text: `Could not calculate "commitment-utilization-score"
    over the FOCUS 1.0 official sample: the sample contains no
    ChargeCategory="Purchase" rows carrying a CommitmentDiscountId, so the
    commitment-spend denominator is 0 and this ratio is not computable (not
    0%, 100%, or 0) — FOCUS 1.2's bundled sample has qualifying commitment
    purchase rows; try version="1.2".` — no 0% value anywhere.
  - `calculate_kpi '{"kpi":"effective-savings-rate-percentage","version":"1.0"}'`
    → unchanged: value `26.552972346576816`, unit `percent`, `isError` absent.
  - `calculate_kpi '{"kpi":"commitment-utilization-score","version":"1.2"}'`
    → computes normally: `49.82433908723174%` over the 60-row synthetic
    sample (12 qualifying rows), confirming the "try version=1.2" guidance is
    actually actionable.
- next: T-045..T-047 remain (KPI mapping version differentiation
  C3-version-2, cross-version unknown-column hints C1-protocol-4/
  C3-version-3, package trademark naming C4-community-3 — owner decision).
