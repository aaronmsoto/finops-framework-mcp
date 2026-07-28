# NOTICE — FOCUS official sample data fixture

`focus_sample.csv` in this directory is the official 1,000-row sample
dataset published by the FOCUS Open Cost and Usage Specification project:
<https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS-Sample-Data>
(`FOCUS-1.0/focus_sample.csv`), © FinOps Foundation / FOCUS Open Cost and
Usage Specification contributors.

Licensed under the **Creative Commons Attribution 4.0 International license
(CC BY 4.0)**: <https://creativecommons.org/licenses/by/4.0/>.

Retrieved verbatim (unmodified) via `scripts/fetch-official-sample.mjs`; see
`PROVENANCE.json` in this directory for the exact source URL, retrieval
date, and sha256 used to confirm byte-for-byte reproducibility. Committed
here as the ground-truth conformance test fixture for the FOCUS 1.0
validator (`src/shared/focus/validate.ts`, exercised by
`src/shared/focus/validate.test.ts`). The FOCUS project does not endorse
this repository or its use of the data.
