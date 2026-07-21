## 2026-07-13 — PR preparation session

- did: created `main` from an empty initial commit so the template branch has
  a review base; first real integrity run against origin/main exposed an
  over-broad focus-marker scan (docs MENTIONING `.only(`/`fit(`/`fdescribe(`
  failed the gate). Scoped the scan to files matching project.testGlobs
  (markers are inert elsewhere), updated the contract wording, and adjusted
  the integrity tests (supervised policy-edit marker used and removed —
  harness/tests/** is a protected path).
- result: 128/128 tests; all 7 gates green against the real origin/main base.
- next: open the PR (first live CI run) and hand to owner for review.
