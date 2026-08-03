# T-047 — MINOR polish: stable example slug, cross-version hints, slug param docs (gate4 C1-protocol-3+4, C3-version-3)

## What

Last item in the critique-4 fix batch. Two independent MINOR fixes, one shared
locus (`src/servers/focus/tools.ts`):

**1. `get_attribute`'s inline example (C1-protocol-3).** The tool description
and its `slug` parameter both used `'CurrencyCodeFormat'` as the example — that
attribute was renamed to `CurrencyFormat` in FOCUS 1.2, so the server's own
copy-pasteable example failed at the default version. Replaced the example
with `'datetime_format'` (confirmed present as `DateTimeFormat` in both served
versions via a one-off Node check against `data/focus/{1.0,1.2}/attributes.json`).
The tool's top-level `description` previously never named the `slug` parameter
or explained how to discover attribute slugs at all (get_column's description
does both, for contrast) — added "Look up by the \`slug\` parameter — an
attribute ID or its lowercase slug, e.g. 'datetime_format'. Attribute names can
change between versions; discover current slugs via search_focus with
entity_types=['attribute']."

**2. Cross-version unknown-column hints (C1-protocol-4 + C3-version-3, one fix
covers both).** `findColumn` (tools.ts:136, shared by `get_column` and
`get_requirements`) previously returned a bare "Unknown column" with
fuzzy-match suggestions drawn only from the *current* version's columns —
useless when the input is an exact, real column name that just isn't in the
requested version (e.g. `ServiceSubcategory`/`SkuMeter` queried at 1.0; both
added in 1.1, served starting at 1.2). Now, before falling back to fuzzy
matching, `findColumn` scans every *other* served version in `store.versions`
for an exact id/slug match; on a hit it reports:

> "ServiceSubcategory" does not exist in FOCUS 1.0 — it exists in FOCUS 1.2
> (added in 1.1). Retry with version="1.2" or see compare_versions.

(`added in X` only appears when `introduced_version` differs from the served
version it resolves in, since 1.1 itself isn't a served version.) When the
column resolves in no served version at all, the fallback "Unknown column"
message now names the version consulted (`Unknown column "X" in FOCUS
{version}.`) instead of staying silent on it — satisfying the "otherwise the
error names the version consulted" half of the acceptance criteria.
`findColumn`'s signature changed to take `currentVersion` alongside
`artifact`/`input`; both call sites (`get_column`, `get_requirements`) updated.
`findAttribute` and `compare_versions`' own separate not-found branch
(tools.ts:661, already names both versions) were left untouched — out of this
task's scope.

## Tests

`src/servers/focus/server.test.ts` gained:
- `get_column names the exists-in-another-version hint for a column added
  after 1.0` (ServiceSubcategory@1.0 → mentions FOCUS 1.2 + "added in 1.1" +
  compare_versions)
- `get_column names the exists-in-another-version hint for SkuMeter at 1.0`
- `get_column names the version consulted for a column unknown to any served
  version` (typo'd column at version 1.0 → "in FOCUS 1.0" in the message)
- `get_attribute's example slug from its own tool description resolves at the
  default version` (datetime_format → DateTimeFormat at 1.2)

## Result

- Gates: PASS (format, lint, typecheck, test — 379 tests, up from 375;
  designs, integrity, memory; coverage skipped, no bound command).
- Live-probed via `node evals/framework/mcp-call.mjs --server=focus call ...`:
  - `get_column '{"column":"ServiceSubcategory","version":"1.0"}'` → isError
    true, `"ServiceSubcategory" does not exist in FOCUS 1.0 — it exists in
    FOCUS 1.2 (added in 1.1). Retry with version="1.2" or see
    compare_versions.`
  - `get_column '{"column":"SkuMeter","version":"1.0"}'` → same shape.
  - `get_attribute '{"slug":"datetime_format"}'` → succeeds at the default
    version (spec_version 1.2, id DateTimeFormat), full CC BY footer intact.
  - `get_column '{"column":"BilldCost","version":"1.0"}'` (typo, unknown to
    both versions) → `Unknown column "BilldCost" in FOCUS 1.0. Did you mean:
    billedcost, listcost? Use list_columns for the full list.`
  - `get_requirements '{"column":"BilledCost"}'` (the other `findColumn`
    caller) unaffected — still 8 bullets + CC BY footer.
- No artifact regen needed; this task only touches server-side error strings
  and tool descriptions, not derived data.

## Next

This closes the gate-4 fix batch (T-039..T-047). Remaining per
`activeContext.md`: open the PR for the T-025/T-026 harness fix batch +
v1.1 mini-batch; C4-community-3 (package trademark naming) is a separate
owner decision point, not yet queued as a task.
