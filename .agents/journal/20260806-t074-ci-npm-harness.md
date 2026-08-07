# 2026-08-06 — T-074: governance CI installs the harness from GitHub Packages

**Task:** T-074 (spec `.agents/specs/harness-npm-consumption.md`).

**Did:** In `.github/workflows/ci.yml` (protected-path edit AUTHORIZED by
the task; documented `.agents/.cache/policy-edit-ok` override used and
removed):

- "Acquire harness" now runs `npm ci --prefix .agentic` with
  `NPM_TOKEN: ${{ secrets.GITHUB_TOKEN }}` in the step env —
  `.agentic/.npmrc` expands it. The `FORK_PR` exit-0 no-op is unchanged,
  as are both product jobs and every other governance step.
- **Deliberate adjacent inclusion, one line:** the setup-node
  `cache-dependency-path` moved `.agentic/harness/package-lock.json` →
  `.agentic/package-lock.json`. Leaving it would strand CI at T-076
  (setup-node fails when the cache path resolves no file after the
  vendored dir is deleted), and T-076 carries no workflow authorization.
  It is part of the same acquisition concern; the whole change is still
  ONE diff hunk (cache line + step are adjacent), satisfying the
  acceptance's no-unrelated-changes intent literally and in spirit.

**Observed:**

- The exact CI command proven locally first: `rm -rf
  .agentic/node_modules && NPM_TOKEN=<owner token> npm ci --prefix
  .agentic` → clean install from npm.pkg.github.com, CLI present, shim
  resolves it (`--prefix` does pick up `.agentic/.npmrc`).
- `python3 yaml.safe_load` on ci.yml: parses. `git diff` on ci.yml: 1
  hunk, 11+/6−, nothing else in the file. `gates` PASS.

**Reviewer catch (fail → fixed):** the fresh-context reviewer failed the
first cut with a blocking defect inspection alone could see: the
workflow-level `permissions: contents: read` zeroes all other scopes, so
the governance job's GITHUB_TOKEN had `packages: none` and the Acquire
step was guaranteed E401 on every non-fork run — the local PAT proof
could never exercise that difference. Fixed by restating job-level
`permissions: {contents: read, packages: read}` on `governance` only
(least privilege; product jobs unchanged). ci.yml now carries TWO hunks,
both inside the governance job, both the acquisition concern.

**Post-merge observable (cannot be seen locally):** a green governance
run on a real PR — requires BOTH the owner's package "Manage Actions
access" grant to finops-framework-mcp (owner reports granted) AND the
job-level packages:read above. If it still fails E401/E403, the fallback
documented in the template's operations.md is an NPM_TOKEN repo secret
(read:packages PAT).

**Next:** T-075 — `agentic upgrade` with the npm harness + drift review.
