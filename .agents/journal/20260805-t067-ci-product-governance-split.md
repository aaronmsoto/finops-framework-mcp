# 20260805 — T-067: split ci.yml into product and governance jobs

## T-067 done — 2026-08-05

- Did: final task of the CI product/governance split
  (`.agents/specs/ci-product-governance-split.md`). `.github/workflows/ci.yml`
  now has three jobs cut along the dependency axis:
  - **gates-fast** (product, fast tier, all events): root toolchain only —
    `npm ci` then `npm run format:check` / `lint` / `typecheck` / `test`
    (the exact scripts the gate entries invoke, per T-065). No
    `scripts/bootstrap.sh`, no `.agentic/` reference; `cache-dependency-path`
    is the root `package-lock.json`. Keeps the required-check name, so
    `.github/rulesets/main-branch.json` is untouched.
  - **gates-full** (product, full tier, merge_group + push): `npm ci` +
    `npm run build`. Now also harness-free.
  - **governance** (all events, NO job-level `if:`): PR-body attribution
    check (harness-free, so it covers fork PRs too), then the harness steps —
    acquire harness (the ONE named step whose body is swapped for an npm
    install when the harness is extracted; commented as such), `gates designs
    integrity memory` (explicit gate names, a documented harness CLI mode),
    `approvals check`, and the integrity diff vs base (PR-only). Every
    harness step opens with `if [ "$FORK_PR" = "true" ]; then ...; exit 0; fi`
    where `FORK_PR` is a job-level env from
    `github.event.pull_request.head.repo.full_name != github.repository` —
    so on fork PRs the job still reports success rather than "skipped".
  - `push` triggers now cover `main` **and** `dev` (spec decision 3).
- Protected path: the `.github/workflows/ci.yml` edit is explicitly
  AUTHORIZED by the spec and T-067's acceptance criteria. The supervised-edit
  marker (`.agents/.cache/policy-edit-ok`) was placed for the single Write
  and removed immediately after (same protocol as T-065). `approvals.yaml`,
  `.claude/settings.json`, and `.github/rulesets/main-branch.json` untouched
  — `git diff --stat` shows only `ci.yml` + `tasks.json`.
- Fork-PR simulation (observed, not asserted): the acceptance's literal
  `git stash push -- .agentic` printed "No local changes to save" and
  removed nothing (stash saves *changes*, and `.agentic/` had none), so the
  stronger simulation was used: `mv .agentic /home/user/.agentic-stash-t067`
  (confirmed `ls .agentic` → "No such file or directory"), then `npm ci`,
  `npm run format:check` ("All matched files use Prettier code style!"),
  `npm run lint`, `npm run typecheck`, `npm test` (coverage summary
  75.6/65.21/75.6/76.72, thresholds enforced per T-066), `npm run build` —
  all exit 0 under `set -e` — then `mv` back (restore confirmed). The
  product surface genuinely needs nothing from the harness.
- Fork-skip logic tested directly: running a harness step's script with
  `FORK_PR=true` printed the skip message and exited 0.
- Governance commands run for real (non-fork path): `./scripts/agentic gates
  designs integrity memory` → PASS/PASS/PASS; `approvals check` → "no
  drift"; `integrity --base origin/main` → "ok (0 warning(s))".
- Result: `./scripts/agentic gates --tier all` PASS on the changed tree
  (format/lint/typecheck/test/designs/integrity/memory/build all pass, only
  `SKIP e2e` remains).
- Independent reviewer verdict: **PASS** on all eight review criteria
  (job structure, single acquisition step, fork guard both branches
  executed, triggers, protected files, comments, per-event coverage
  parity, YAML sanity), gates independently reproduced. Two non-blocking
  observations worth keeping: (1) the governance job's setup-node step
  keys its npm cache on `.agentic/harness/package-lock.json`, so harness
  extraction touches that line too — "one named step" holds for
  *acquisition*, but the cache key is a second (mechanical) line in the
  same diff; (2) fork PRs today skip designs/integrity/memory, approvals
  check, and the anti-gaming integrity diff even though the in-repo
  harness would still work — this is exactly the owner-resolved spec
  decision 1 (always run, no-op on forks), accepted so behavior does not
  change when the harness goes private.
- Not locally observable: a real fork PR reporting "success" on the
  governance check. First external PR after going public is the post-merge
  verification (noted in activeContext).
- Next: CI split spec fully landed (T-065/T-066/T-067). Owner-gated publish
  steps, then harness extraction to `@aaronsoto/agentic-harness`.
