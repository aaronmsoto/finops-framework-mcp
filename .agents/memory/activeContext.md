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

**CI product/governance split — COMPLETE (T-065/T-066/T-067 all done)**
(spec `.agents/specs/ci-product-governance-split.md`, owner-validated
2026-08-04).

- **T-065 done** (2026-08-05): product gate commands collapsed into root
  npm scripts; gate entries invoke `npm run <script>`. See
  `.agents/journal/20260805-t065-npm-script-gates.md`.
- **T-066 done** (2026-08-05): coverage enforced via vitest thresholds at
  the measured baseline (75.6/65.21/75.6/76.72); unbound `coverage` gate
  removed. See `.agents/journal/20260805-t066-vitest-coverage-thresholds.md`.
- **T-067 done** (2026-08-05): `ci.yml` split into `gates-fast` (product
  fast: npm ci + format:check/lint/typecheck/test, zero `.agentic/`
  references, root lockfile cache), `gates-full` (product full: build,
  merge_group+push, also harness-free), and `governance` (always runs, no
  job-level `if:`; PR-body check covers forks; harness acquired in ONE
  named step; harness steps exit 0 on fork PRs via `FORK_PR` env). `push`
  triggers now include `dev`. Harness-independence proven by physically
  moving `.agentic/` out of the repo and running all five product commands
  green (the acceptance's `git stash push -- .agentic` no-ops — stash
  saves changes, not files). Ruleset + approvals.yaml untouched. See
  `.agents/journal/20260805-t067-ci-product-governance-split.md`.
- **Post-merge check on first external PR**: a real fork PR must show the
  governance check reporting "success" (not "skipped") before making
  `governance` a required check — not locally observable.

**v1 close-out is COMPLETE on `claude/session-k75rxy`; publish is
owner-gated.** PR #9 (FOCUS v1 batch + close-out + usage guide) was merged
2026-08-04. T-050..T-064 all landed: CI fix, the full 19-MINOR review
backlog from `docs/final-status-review.md`, the six-page guide under
`docs/guide/`, and `.mcp.json` local wiring. Evals: focus Runs 1+2 10/10,
combined two-server scenario PASS (`docs/eval-results.md`).

## Next steps

1. Owner: `npm publish` BOTH packages — `packages/finops-focus-mcp/` and
   root `finops-framework-mcp`; MCP-registry submit both `server.json`
   manifests.
2. Owner: enable GitHub Pages (serve `docs/` from the default branch so
   `docs/guide/index.html` is the public usage guide) — repo setting, not
   agent-reachable.
3. Owner: `wrangler deploy` (set `ALLOWED_ORIGINS`), `wrangler pages
   deploy demo/`; smoke-test the demo against the deployed Worker (CORS
   fix is handler-level verified, not yet wrangler-deployed).
4. Harness extraction to `@aaronsoto/agentic-harness` (private scoped npm,
   name available) is the follow-on project, not yet specced. The vendored
   `.agentic/harness/` here has drifted from agentic-starter-repo
   (`approvals.ts` −307 lines, `tasks.ts` −57, `gates.ts` −27; template
   copy is ahead and publish-configured). Reconcile deliberately during
   migration; the CI split (T-065..T-067) has now landed on the branch, so
   the governance job's "Acquire harness" step is the one-line swap point.

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
  accept an allowlist of HTML dirs (it warns on all six guide pages).

## Last updated

2026-08-05 — T-067 session (ci.yml split into product/governance jobs;
CI split spec complete; publish remains owner-gated).
