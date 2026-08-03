# T-034 — calculate_kpi over bundled sample data

## What I did

Added a `calculate_kpi` tool to the FOCUS server that computes a mapped KPI
over one of the bundled sample CSVs — never user-supplied data.

- Extended the FOCUS data artifact with a new `data/focus/samples/` section:
  `manifest.json` (per-entry version/kind/file/row_count/license/
  source_url|seed/note) plus one CSV per (version, kind) — official
  FOCUS-Sample-Data for 1.0 (1000 rows, real), and the existing seeded
  synthetic sample for 1.0 and 1.2 (60 rows each). Registered in a new
  `index.json.samples` sha256 map, mirroring how `derived/` is already
  hash-verified. `data/focus` grew from 868K to 1.8M (cap 3MB, spec
  acceptance — still comfortably under).
- `src/crawlers/focus/emit.ts`: new `emitSamples()`; `emitIndex()` gained a
  5th `samples` param (default `{}`, so the existing `emit.test.ts` call
  site needed no change).
- `scripts/bundle-focus-samples.mjs`: new standalone script (mirrors
  `generate-focus-synthetic-samples.mjs`'s pattern — not folded into
  `cli.ts`'s `ingest()`, since `ingest()` runs from `dist/` with no path
  back to the `src/crawlers/focus/fixtures/` source fixtures once
  packaged) that reads the 3 committed fixture CSVs and writes
  `data/focus/samples/` + re-emits `index.json`.
- `src/crawlers/focus/cli.ts`'s `ingest()` now reads any existing
  `index.json.samples` and carries it forward into its own `emitIndex`
  call, so a routine refresh (which knows nothing about samples) doesn't
  wipe the registration. Verified live: `node dist/crawlers/focus/cli.js`
  (0 network fetches, 128 cached) — `index.json.samples` byte-identical
  before/after.
- `src/shared/focus/artifact.ts`'s `loadFocusStore`: reads + sha256-verifies
  every `data/focus/samples/*` file listed in `index.json.samples`, parses
  `manifest.json`, cross-validates every entry's `version` against the
  loaded FOCUS versions, and exposes `FocusStore.sampleManifest` +
  `sampleCsv: Map<"version:kind", csvText>`.
- `src/shared/focus/kpi-calc.ts` (new): a small, explicit formula registry —
  9 of the mapping's ~18 KPIs (ESR, commitment-utilization-score, percent-
  of-compute-spend-covered-by-commitment-based-discounts, percentage-of-
  commitment-based-discount-waste, consumption-versus-commitment,
  allocation-accuracy-index-aai, and the 3 unallocated/untagged/
  unallocated-shared percentage KPIs) whose FOCUS-terms formula reduces to
  a pure SUM/WHERE aggregation over `{header, rows}` (reuses `parseCsv`
  from validate.ts, T-031) — no external forecast/budget input, no
  ambiguous free-text `ConsumedUnit` matching. `calculateKpi()` throws for
  a slug with no registered formula or a table missing a required column;
  `hasFormula()`/`calculableKpiSlugs()` let the tool build a clean error
  with guidance for the rest.
- `src/servers/focus/tools.ts`: `calculate_kpi(kpi, version?, sample?)` —
  no dataset-input parameter exists at all, so user-supplied data structurally
  cannot enter. Resolves the KPI (nearest-match error like `get_kpi_mapping`),
  checks `hasFormula` (clean error naming the caveat + calculable-KPI list
  otherwise), resolves the sample (`official` preferred when present, else
  `synthetic`; an explicit unavailable kind errors listing what exists),
  parses the CSV, and returns `value`/`unit`/`focus_formula`/`caveat` plus
  full `sample` provenance. Every response's text starts with an
  `UNOFFICIAL CALCULATION:` banner distinct from `get_kpi_mapping`'s
  `UNOFFICIAL:` banner (this one is about the *computed value*, not just
  the mapping).

## Result

- `src/shared/focus/kpi-calc.test.ts` (new): the ESR hand-computed 10-row
  fixture (`ListCost` sum 1250, `EffectiveCost` sum 1060 → exactly 15.2%),
  NULL/empty-as-zero handling, zero-denominator safety, 4 other formulas'
  WHERE-filter correctness with hand-picked rows, `hasFormula`/
  `calculableKpiSlugs` behavior, and a missing-column error.
- `src/shared/focus/artifact.test.ts` additions: sample manifest loading
  (1.0 official row_count 1000, both synthetic entries present, no 1.2
  official entry), a tampered-CSV sha mismatch, an unknown-version manifest
  entry.
- `src/servers/focus/server.test.ts` additions: ESR over the 1.0 official
  sample with banner + provenance; 1.2 falls back to synthetic (no official
  1.2 sample exists anywhere); explicit `sample: "official"` for 1.2
  errors; 2 more calculable KPIs succeed; a no-formula KPI errors with
  guidance; unknown-kpi nearest-match error; the tool's inputSchema has
  exactly `kpi`/`version`/`sample` (no dataset param); added to the
  outputSchema conformance sweep.
- Gates green (`./scripts/agentic gates`): format, lint, typecheck, test
  (28 files / 336 tests, up from 316), designs, integrity, memory.
- Verified live over the real stdio server (`node dist/servers/focus/main.js`
  via an ad hoc MCP stdio client, not just the in-memory vitest client):
  ESR/1.0 = 26.552972346576816% over the official sample; ESR/1.2 =
  17.858936132116433% falling back to the synthetic sample; AAI/1.0 =
  108.2959595022164%; `forecast-accuracy-rate-spend` and an unknown slug
  both errored cleanly with guidance. All temp scratch files removed after.

## Note for a future reader (not fixed, not a bug)

AAI over the official 1.0 sample computes ~108.3% — mathematically correct
per its registered formula, but >100% because the sample contains real
negative-cost rows (credits/refunds) outside the allocated subset, pulling
the unfiltered denominator below the filtered numerator. See decisions.md.

## Next

T-035 (focus eval suite + combined two-server scenario) is next per the
spec's task order.
