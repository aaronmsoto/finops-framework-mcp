# Active context — the handoff file

<!--
  Format (keep all four sections, most recent truth only — this file is
  overwritten, not appended; history lives in .agents/journal/ and git):
    ## In flight       — what is currently being worked on, by whom/what mode
    ## Next steps      — ordered, concrete, small
    ## Open questions  — things a future session must not silently re-decide
    ## Last updated    — ISO date + actor
  `memory lint` warns when this file goes stale while commits continue.
-->

## In flight

**GitHub Pages is LIVE** (2026-08-06): the six-page guide serves at
<https://aaronmsoto.github.io/finops-framework-mcp/>. Verified in production
— 6/6 pages 200, 404 page works, all seven deployed files byte-identical to
`docs/guide/`, and `critique-*.md`/`final-status-review.md`/`mcp-surface.md`
all 404 (guide-only upload holds). Repo stays private (Pro covers Pages).
Gotcha: the deploy fires on the merge push, so if Pages' source is set
*after* merging, run #1 fails `Get Pages site failed` — re-dispatch
`pages.yml`.

**Two template rules became owner toggles** (T-070/T-071/T-072, 2026-08-06,
owner-authorized protected-path edits):

- `solo_maintainer` (approvals.yaml, default false; **true** here) —
  `compileRuleset` was requiring one approving CODEOWNER review, and
  CODEOWNERS names only the owner. GitHub forbids self-approval, so every
  owner-authored PR was permanently unmergeable. Now emits count 0 +
  code-owner false, and `derivedPermissions` restores `Bash(gh pr merge*)`
  even in integration mode so main is not ungated on both sides.
- `ai_attribution: forbid|allow` (default forbid; **allow** here) — read by
  the prepare-commit-msg hook, the integrity gate, and ci.yml's PR-body
  check (grep, not the CLI: that step runs before harness acquisition and on
  fork PRs). Motivation: attribution footers are **re-appended server-side
  after submission**, so under `forbid` the PR-body check is unsatisfiable
  for tool-authored PRs — verified by removing one and watching it return in
  a different form within minutes.

**Owner action outstanding**: the LIVE main-branch ruleset still requires 1
code-owner review — Settings → Rules → Rulesets → main-branch must be set to
approvals `0` with "Require review from Code Owners" unticked to match the
regenerated `.github/rulesets/main-branch.json`, or the deadlock returns.

**Merge reconciliation (2026-08-06):** `origin/main` was merged into
`claude/session-k75rxy`. A parallel Pages session (PR #11, merged) had
allocated T-065/T-066 for Pages work while this branch used T-065..T-067
for the CI split — the CI-split tasks were renumbered **T-067 (npm-script
gates), T-068 (coverage thresholds), T-069 (ci.yml split)** and the hash
chain recomputed (`tasks validate`: chain valid). Journals written before
the merge reference the old IDs. The `dev` branch was deleted with PR #10,
so this branch's PR targets `main` directly.

**CI product/governance split — COMPLETE (T-067/T-068/T-069, formerly
T-065..T-067)** (spec `.agents/specs/ci-product-governance-split.md`,
owner-validated 2026-08-04). Product gate commands live only in root npm
scripts; coverage enforced via vitest thresholds at the measured baseline
(75.6/65.21/75.6/76.72); `ci.yml` split into `gates-fast` + `gates-full`
(product, zero `.agentic/` references) and `governance` (always runs,
fork-safe via `FORK_PR` exit 0, harness acquired in ONE named step — the
one-line swap point for the npm-packaged harness). Harness-independence
proven by physically moving `.agentic/` out and running all five product
commands green. **Post-merge check on first external PR:** governance must
report "success" (not "skipped") before being made a required check.

**GitHub Pages — landed on main via PR #11 (parallel session):** T-065/
T-066 (Pages numbering) published `docs/guide/` alone through a staged
Actions workflow (`.github/workflows/pages.yml`, owner-authorized
protected-path write). Remaining owner step: Settings → Pages → Source =
**GitHub Actions** (REST API blocked to agents). See
`docs/deploy-pages.md` and journal `20260805-t065-github-pages.md`.

**v1 close-out COMPLETE; publish owner-gated.** PR #9 merged 2026-08-04:
T-050..T-064 (CI fix, 19-MINOR review backlog, six-page guide, `.mcp.json`).
Evals: focus Runs 1+2 10/10, combined two-server scenario PASS.

## Next steps

1. Owner: review/merge the **CI-split PR** (`claude/session-k75rxy` →
   `main`; includes this merge-reconciliation commit).
2. Owner: `npm publish` BOTH packages — `packages/finops-focus-mcp/` and
   root `finops-framework-mcp`; MCP-registry submit both `server.json`
   manifests.
3. Owner: Settings → Pages → Source = **GitHub Actions** (workflow is
   installed; Pro covers Pages on a private repo).
4. Owner: `wrangler deploy` (set `ALLOWED_ORIGINS`), `wrangler pages
   deploy demo/`; smoke-test the demo against the deployed Worker.
5. Harness extraction: template Phase B is COMPLETE in
   agentic-starter-repo (versioned surface markers + approvals.lock.json,
   `agentic upgrade` + gates skew warning, registry-ready packaging).
   Owner chose **GitHub Packages**; publish pending there. Phase C (this
   repo): drop vendored `.agentic/harness/`, add the devDependency +
   `.npmrc`, swap the governance job's "Acquire harness" step, reconcile
   the deliberate drift (template approvals.ts is ~307 lines ahead) — spec
   it after the package is installable.

## Open questions

- npm publish of the root framework package: 1.0.x now vs after PR merge —
  owner call (registry manifests are ready either way).
- Trademark posture recorded in `decisions.md` (finops-focus-mcp,
  accepted-risk): revisit only if the FinOps Foundation objects.
- `src/shared/index.ts` `export *` barrel: any new server code importing a
  real binding from it can silently reintroduce fs-reachability in the
  Worker; `fs-boundary.test.ts` only catches code reachable from
  `src/workers/index.ts`. Splitting the barrel is a real refactor (queued
  observation since T-037).
- `validateFocusCsv` can't validate JSON-typed columns whose
  `allowed_values` are embedded-key names (1.2 `SkuPriceDetails`); the
  generator emits null as a workaround (decisions.md 2026-07-28).
- M11 rename (Action → MaturityCharacteristic) — owner call; moot while
  Actions stay behind `FINOPS_MCP_EXPERIMENTAL`.
- MCP SDK zod validation silently strips unknown tool params
  (docs/eval-results.md #3) — revisit when the SDK supports strict input
  schemas.
- Template feedback queued for agentic-starter-repo: `gates --tier full`
  runs only full-tier gates (use `--tier all` before shipping);
  supervising sessions must not commit a live loop's in-flight tasks.json;
  background watchers must not `pgrep` for a pattern contained in their
  own command line (self-match false positive); `design check` should
  accept an allowlist of HTML dirs (it warns on all six guide pages);
  NEW — task IDs collide across parallel branches (`tasks add` numbers
  from the local file only; this merge had to renumber T-065..T-067 →
  T-067..T-069 and recompute the chain by hand).
- **Template BUG (blocking, found 2026-08-06)**: `compileRuleset` in
  `.agentic/harness/src/approvals.ts` emits
  `required_approving_review_count: 1` + `require_code_owner_review: true` +
  `bypass_actors: []` whenever `merge_to_main: human`, and CODEOWNERS makes
  the owner the only reviewer. GitHub forbids approving your own PR, so on
  any **single-maintainer** repo every PR the owner opens is permanently
  unmergeable (`mergeable_state: blocked`) — hit for real on PR #11.
  `compileIntegrationRuleset` gets it right (`count: 0`). Fix: emit a
  Repository-admin bypass actor (or `count: 0`) when the owner is the sole
  code owner. Workaround: owner added the bypass by hand in Settings →
  Rules → Rulesets, which now drifts from the generated
  `.github/rulesets/main-branch.json`.

## Last updated

2026-08-06 — merge-reconciliation session: origin/main merged into
claude/session-k75rxy (Pages work + CI split now coexist); CI-split task
IDs renumbered T-067..T-069 after the parallel-session collision, chain
revalidated; CI-split PR targets main (dev was deleted with PR #10).
