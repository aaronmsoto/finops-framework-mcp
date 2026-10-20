# 2026-10-20 — npm 12 `npm pack --json` packaging-test fix

## v0.2.0 publish run failed in npm test (npm 12 pack JSON) — 2026-10-20T16:00:00Z

- Did: the owner published tokenomics-overview-mcp@0.2.0 by hand. npm put
  it in staged publishing (it published the 0.0.0-stage placeholder first),
  and the owner approved it in the web UI; `latest` is 0.2.0. Verified with
  a fresh install: --version prints data v2.0.0, 20 tools, L0–L6.
- Result: the tag `v0.2.0` publish run failed at `npm test`, before any
  publish step. publish.yml installs npm@latest (now 12.2.0), and npm 12
  prints `npm pack --json` as an object keyed by package name instead of
  an array. That broke all 5 tests in src/packaging.test.ts. Reproduced
  locally under npm 12.2.0 (5 failed, same TypeErrors). The parse now
  accepts both shapes: npm 12 gives 518/518 under `npm test` with
  coverage, and npm 10 gives 5/5 packaging tests.
  npm-publish-once.sh exit codes behave the same under npm 12.
- Next (owner): merge to dev → main, then re-point the `v0.2.0` tag at the
  new main commit (nothing was published from the old tag).
