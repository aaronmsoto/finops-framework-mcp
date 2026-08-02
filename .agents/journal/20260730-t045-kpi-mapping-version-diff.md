# T-045 — Version-differentiate commitment KPI mappings for 1.2 (gate4 C3-version-2)

## What

`get_kpi_mapping(kpi='consumption-versus-commitment', version='1.2')` (and,
per the acceptance criteria, the other two commitment KPIs —
`commitment-utilization-score`, `percentage-of-commitment-based-discount-waste`)
self-contradicted at version 1.2: the caveat said a quantity-based ratio
"would need CommitmentDiscountQuantity, which FOCUS only introduced in
1.2" — while the requested version *is* 1.2, where that column exists. All
18 KPIs in `src/crawlers/focus/kpi-mapping-data.ts` used the shared
`perVersion()` helper, so `columns_by_version['1.0']` and `['1.2']` were
byte-identical everywhere; nothing was actually version-differentiated.

Fixed the three commitment KPIs (only these — the other 15 don't reference
a column that diverges across the two pinned versions, so `perVersion()`
stays correct for them):

- `columns_by_version` is now written out by hand instead of via
  `perVersion()`: `'1.0'` keeps the original four columns (ChargeCategory,
  CommitmentDiscountId, EffectiveCost, ContractedCost); `'1.2'` adds
  `CommitmentDiscountQuantity`/`CommitmentDiscountUnit` (both introduced in
  FOCUS 1.1, confirmed present in `data/focus/1.2/columns.json` and in
  `derived/diff-1.0-1.2.json`'s `added_columns`).
- The (previously version-blind) `caveat` string for all three is rewritten
  to be version-neutral and non-contradictory: "Uses spend
  (EffectiveCost/ContractedCost) as a proxy ... at FOCUS 1.0, which has no
  dedicated committed-quantity column; FOCUS 1.2 adds
  CommitmentDiscountQuantity/CommitmentDiscountUnit, which a
  quantity-based ... ratio should prefer instead." This is a single shared
  string (not a `caveat_by_version` structural split) — deliberately: it
  reads correctly regardless of which version the caller asked about, and
  avoids introducing a second per-version field that `calculate_kpi` would
  then need to resolve too (see "Why not a structural per-version
  caveat/formula field" below).
- `focus_formula` text is unchanged for all three — it already only made a
  claim about FOCUS 1.0 specifically ("a spend ratio, since FOCUS 1.0 has
  no dedicated committed-quantity column"), which is true regardless of
  the requested version and was never the self-contradictory part.
- Top-of-file comment updated: it previously asserted every column used in
  the file is present in both pinned versions; that's no longer true for
  these three entries, so the comment now explains why they're the
  exception.

## Why not a structural per-version caveat/formula field

Considered adding `focus_formula_by_version`/`caveat_by_version` optional
overrides to `KpiMappingEntry` (mirroring `columns_by_version`), consulted
by both `get_kpi_mapping` and `calculate_kpi`. Rejected: `calculate_kpi`'s
actual registered formula in `kpi-calc.ts` (unchanged by this task, still
the spend-based ratio for both versions per T-044) would then display an
override caveat/formula written to *recommend* the quantity-based approach
at 1.2, while the `value` it returns is still computed the spend-based way
— i.e. it would trade today's bug for a new one where the displayed
formula text doesn't match the displayed value. A single version-neutral
caveat string sidesteps this: it's accurate whether read from
`get_kpi_mapping` (a recommendation for future work) or `calculate_kpi`
(read alongside a spend-based value, which the caveat itself explains).
Implementing an actual quantity-based `calculate_kpi` formula for 1.2 is
out of scope for this task (acceptance criteria is about the mapping
metadata, not the calculator).

## Regeneration

- `node dist/crawlers/focus/cli.js` (cache-only, 0 network fetches) —
  `data/focus/derived/kpi-mapping.json` and `data/focus/index.json`'s hash
  changed; nothing else did.
- `node scripts/bundle-worker-data.mjs` — `src/workers/generated/focus-store.ts`
  regenerated to match.

## Tests

Added one case to `src/servers/focus/server.test.ts`'s `get_kpi_mapping`
describe block: for all three commitment KPIs, asserts `columns` at 1.2
includes both quantity columns and `caveat` matches "FOCUS 1.2 adds
CommitmentDiscountQuantity" while *not* matching "only introduced in 1.2";
and at 1.0, `columns` excludes `CommitmentDiscountQuantity` and `caveat`
still matches "spend ... as a proxy". The pre-existing
`kpi-mapping.test.ts` cross-validation tests (column ids exist in their
version's `columns.json`, formula mentions a mapped column) passed
unchanged — they're generic over `columns_by_version`'s shape and didn't
assume both versions match.

## Evidence

`./scripts/agentic gates` (`--tier` default): format/lint/typecheck/test
(375 tests, up from 374)/designs/integrity/memory all pass.

Live-probed via `node evals/framework/mcp-call.mjs --server=focus call
get_kpi_mapping '{"kpi":"consumption-versus-commitment","version":"1.2"}'`:
`columns` now includes `CommitmentDiscountQuantity`/`CommitmentDiscountUnit`;
`caveat` reads "...FOCUS 1.2 adds CommitmentDiscountQuantity/
CommitmentDiscountUnit, which a quantity-based ratio should prefer
instead." — no "only introduced in 1.2" claim. Same call at `version:
"1.0"`: `columns` excludes both quantity columns; same caveat text still
explains the spend proxy ("Uses spend as a proxy for committed/consumed
units at FOCUS 1.0, which has no dedicated committed-quantity column").
Both responses carry `structuredContent.official: false` and the
`UNOFFICIAL:` text banner unchanged. Also confirmed `calculate_kpi` at 1.2
is unaffected: still computes `0.4982433908723174` (unchanged from T-044)
and now surfaces the rewritten, non-contradictory caveat alongside it.

## Next

T-046 (README "official" phrasing, C2-fidelity-3) and T-047 (MINOR polish:
stable example slug, cross-version unknown-column hints, slug param docs —
C1-protocol-3+4, C3-version-3) remain in the gate-4 fix batch. Package
trademark naming (C4-community-3) is still an owner decision point, not
queued.
