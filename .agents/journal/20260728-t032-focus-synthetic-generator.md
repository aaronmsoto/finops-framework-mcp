# T-032 — Seeded synthetic FOCUS data generator

## What I did

Built a deterministic, seeded synthetic FOCUS CSV generator and committed
its sample fixtures.

- `src/shared/focus/synthetic.ts`: `generateFocusCsv(columns, {rows, seed})`.
  Uses a `mulberry32` seeded PRNG (small, deterministic, no external dep).
  Every value is derived purely from a version's `columns.json` metadata —
  `data_type` (Decimal/Date-Time/JSON/String), `allowed_values`,
  `value_format_md` (Currency Code Format detection), `number_range`
  (non-negative constraint), `allows_nulls` — same "no hardcoded
  per-version table" principle `validate.ts` (T-031) already established,
  so adding a future spec version needs no generator change. Header is
  `columns.map(c => c.id)` in artifact order, quoting/NULL conventions
  match the official sample (`NULL` unquoted, strings/JSON quoted,
  Decimal/Date-Time unquoted).
- `src/crawlers/focus/generate-cli.ts`: `runGenerate(opts)` mirrors
  `validate-cli.ts`'s shape (exported, synchronous, testable) plus a
  `main()`. `node dist/crawlers/focus/generate-cli.js --version 1.2 --rows
  N --seed S [--out file.csv] [--data-dir data/focus]`.
- `scripts/generate-focus-synthetic-samples.mjs`: regenerates the committed
  fixtures deterministically (no network — imports the built `dist/`
  modules, matching the `refresh` script convention). Ran it to produce
  `src/crawlers/focus/fixtures/samples/synthetic/{1.0,1.2}/
  focus_synthetic_sample.csv` (seed 42, 60 rows), each with a `NOTICE.md`
  explicitly labeling the file synthetic and naming the generator/seed.
- Tests: `src/shared/focus/synthetic.test.ts` (same seed → byte-identical;
  different seed → different output; header exactly equals the version's
  column-ID list for both 1.0 and 1.2; generated output passes its own
  version's validator with 0 errors *and* 0 warnings; the committed
  fixtures themselves are re-validated as a regression guard) and
  `src/crawlers/focus/generate-cli.test.ts` (CLI wrapper: writes the right
  row count, byte-identical across two runs with the same seed, exit 1 for
  an unknown version).

## A real generation gap: JSON columns with allowed_values

First full-fixture validation run on FOCUS 1.2 failed with 48 errors, all
on `SkuPriceDetails`: `data_type: "JSON"` but it also declares
`allowed_values` (`CoreCount`, `DiskType`, …) — those are valid property
*keys* for the column's `KeyValueFormat` object, not literal values.
`validateFocusCsv` checks `data_type` and `allowed_values` independently
(parse-as-JSON, then exact-match the whole raw string against an enum
entry), so no single raw string can satisfy both at once for this column —
a real gap in the T-031 validator's model, not a generator bug to route
around by mimicking one specific real value. Since `SkuPriceDetails` is
nullable, and it's the only column with this metadata combination in
either pinned version (checked both), the fix is a fully generic rule in
the generator: when `data_type === "JSON"` and `allowed_values` is
non-empty and the column is nullable, always emit `NULL`. No column is
named directly — see `.agents/memory/decisions.md` 2026-07-28 entry for
why fixing `validate.ts` itself was left out of scope.

## Result

`./scripts/agentic gates` → PASS (format/lint/typecheck/test/designs/
integrity/memory all green), 297/297 tests (13 new). Live-verified both
committed fixtures:

```
node dist/crawlers/focus/validate-cli.js
  src/crawlers/focus/fixtures/samples/synthetic/1.0/focus_synthetic_sample.csv
  --version 1.0
→ 60 rows, 43 columns, 0 errors, 0 warnings

node dist/crawlers/focus/validate-cli.js
  src/crawlers/focus/fixtures/samples/synthetic/1.2/focus_synthetic_sample.csv
  --version 1.2
→ 60 rows, 57 columns, 0 errors, 0 warnings
```

Fixture sizes: 1.0 ≈ 52KB, 1.2 ≈ 68KB — 140KB total on disk (`du -sh`),
under the 200KB acceptance cap.

## Noted, not fixed (out of scope for this task)

`validateFocusCsv` (T-031) has no notion of `KeyValueFormat`-style embedded
keys for a JSON column's `allowed_values` — it treats the enum as literal
whole-value matches always. `SkuPriceDetails` (1.2) is the only affected
column today. Flagged in activeContext.md's Open Questions and
decisions.md; a future task could teach the validator to parse
`KeyValueFormat` keys against the declared enum instead of forcing null.

## Next

T-033+ per `.agents/specs/focus-mcp-v1.md` (KPI mapping / calculate_kpi is
next in sequence) — `calculate_kpi`'s "bundled samples only" acceptance
criterion can point at either the official 1.0 sample or these new
synthetic 1.0/1.2 fixtures for its worked examples.
