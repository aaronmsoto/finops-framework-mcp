# NOTICE — synthetic FOCUS 1.0 sample data

**This file is SYNTHETIC. It is not real billing data and was not published
by the FOCUS Open Cost and Usage Specification project.**

Generated deterministically by `scripts/generate-focus-synthetic-samples.mjs`
via the seeded generator in `src/shared/focus/synthetic.ts` (T-032): seed
42, 60 rows, 43 columns matching FOCUS 1.0's
`data/focus/1.0/columns.json` column list exactly. Re-running the
generator with the same seed reproduces this file byte-for-byte.

Committed as a conformance test fixture for
`src/shared/focus/validate.ts` (validates with 0 errors against FOCUS
1.0) — see `src/shared/focus/synthetic.test.ts`. For the official
1,000-row ground-truth sample, see
`src/crawlers/focus/fixtures/samples/1.0/`.
