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

**T-073 (2026-08-06): guide layout at large viewports.** The container was
pinned at `78ch` at every desktop width, so the six nav links wrapped to two
lines and the Data Model's five cards never shared a row. Added a `--wrap`
custom property to the shared chrome (`78ch`, `62rem` from `64rem` up) — one
knob for `header.guide`/`footer.guide`/`main`, with the `main` override in
the chrome block so it stays byte-identical across all six pages. Prose
deliberately does not widen (`main p:not(.callnote), main ul, main ol {
max-width: 78ch }`): body text was already ~111 chars/line and is now ~100,
while the nav, tables and card grids get the extra room. `.datamodel`
switched from grid to flex so the `→` arrows stop claiming a full column;
below `34rem` they go full-width and rotate for a vertical flow. Verified by
measurement across 8 viewports plus screenshots; phone behavior compared
against `origin/main` and unchanged or better.
**Known pre-existing, NOT introduced by this:** `index`, `framework-server`
and `focus-server` overflow horizontally at 414/360px — identical on
`origin/main`. Deserves its own task.

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

**Both landed and CONFIRMED WORKING** (PR #13 merged 2026-08-06):

- Live main-branch ruleset now reads `required_approving_review_count: 0`,
  `require_code_owner_review: false`, required checks `['gates-fast']` —
  matching the generated `.github/rulesets/main-branch.json`. No drift, no
  deadlock. (An earlier note here claimed the live ruleset still required a
  review; that was a stale API read and was wrong.)
- `governance` passed on PR #13 itself, whose body carried the attribution
  footer — the end-to-end proof that all four enforcement points now honor
  `ai_attribution: allow`.

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
protected-path write). **DONE and live** — Pages source is set to GitHub
Actions and the site serves at
<https://aaronmsoto.github.io/finops-framework-mcp/>. See
`docs/deploy-pages.md` and journal `20260805-t065-github-pages.md`.

**v1 close-out COMPLETE; publish owner-gated.** PR #9 merged 2026-08-04:
T-050..T-064 (CI fix, 19-MINOR review backlog, six-page guide, `.mcp.json`).
Evals: focus Runs 1+2 10/10, combined two-server scenario PASS.

## Next steps

1. Owner: `npm publish` BOTH packages — `packages/finops-focus-mcp/` and
   root `finops-framework-mcp`; MCP-registry submit both `server.json`
   manifests.
2. Owner: `wrangler deploy` (set `ALLOWED_ORIGINS`), `wrangler pages
   deploy demo/`; smoke-test the demo against the deployed Worker.

   (PRs #11, #12 and #13 are all merged; GitHub Pages is live; the CI split
   and both policy toggles are in. Nothing else is waiting on a merge.)
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
- **FIXED HERE, still to port upstream (both found 2026-08-06)**: the two
  template rules that were unsatisfiable for a solo-maintained repo —
  `compileRuleset`'s mandatory code-owner review (GitHub forbids
  self-approval, so every owner-authored PR was unmergeable; hit on PR #11)
  and the no-AI-attribution policy (footers are re-appended server-side
  after submission, so the PR-body check could never be satisfied; hit on
  PR #12). Both are now `approvals.yaml` toggles — `solo_maintainer` and
  `ai_attribution` — defaulting to the old behavior.
  **The port brief is written and ready to execute:**
  `.agents/specs/upstream-port-to-agentic-starter-repo.md` — self-contained
  (rationale, applyable diffs, tests to add, the smaller feedback list), so
  a session with access to agentic-starter-repo needs nothing from the
  originating conversation. Hand it that path.

## Last updated

2026-08-06 — Pages + policy-toggle session (PRs #11/#12/#13 all merged).
GitHub Pages live and verified in production; `solo_maintainer` and
`ai_attribution` toggles landed and confirmed working (`governance` green on
a PR whose body carries the footer). Remaining owner work is npm/registry
publish and the Worker deploy — nothing waiting on a merge.
