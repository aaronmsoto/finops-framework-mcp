# 20260804 — CI product/governance split (planning session)

## Spec written, awaiting owner validation — 2026-08-04T05:43:41Z

**Did:** Planning session only, no implementation. Owner asked for a spec for
splitting CI so the repo can go public and the harness can later be extracted
to a private scoped npm package. Wrote
`.agents/specs/ci-product-governance-split.md` via the `plan-feature` skill.
Stopped at the mandatory human checkpoint — no tasks generated.

**Context that drove the spec** (all verified this session, not assumed):

- Every CI signal flows through the harness. Both jobs in
  `.github/workflows/ci.yml` run `./scripts/agentic gates` after
  `./scripts/bootstrap.sh`; `cache-dependency-path` is
  `.agentic/harness/package-lock.json`. There is no product-only job.
- Gate definitions split cleanly by dependency. Product (explicit commands,
  project toolchain only): `format`, `lint`, `typecheck`, `test`, `build`.
  Harness-implemented: `designs`, `integrity`, `memory`, plus the optional
  `coverage` and `e2e` which have **no `command` key at all** — they are
  internal to the harness. `coverage` being harness-internal is the one
  wrinkle in an otherwise clean split.
- The product toolchain genuinely stands alone: `prettier` 3.9.6, `eslint`
  v10.7.0, `typescript` 6.0.3 (tsc), `vitest` 4.1.10 are all root
  `devDependencies`, root `package-lock.json` exists, and all four resolve via
  `npx --no-install` with the harness untouched. This is the assumption the
  whole design rests on; it holds.
- Root `package.json` already has `test` and `build` scripts but **no**
  `lint`, `format:check`, or `typecheck` — those are inlined in
  `agentic.config.json`. Hence the spec's single-source-of-truth move.

**Design decision recorded in the spec:** command definitions live only in
root `package.json` scripts; gate entries and CI both call `npm run <script>`.
Rejected the alternative of CI restating tool invocations directly — that
creates exactly the two-definitions-drifting failure mode the harness
extraction exists to fix.

**Result:** Spec is one page, four open questions left for the owner. The
sharpest is Q1: a job skipped via an `if:` condition reports *skipped*, which
does not satisfy a required status check and blocks the PR forever — the same
class of trap the existing `merge_group` comment in ci.yml warns about.
Recommended always running the governance job and no-opping its harness steps
on forks so the check still reports a conclusion.

**Branch note:** PR #9 was merged, and `claude/session-k75rxy` had zero
unmerged commits beyond `dev`, so the branch was restarted from `dev`
(`git checkout -B claude/session-k75rxy dev`) rather than stacked on merged
history. `dev` is ahead of `main` by 120 commits and current with its remote.
Incidental observation: `git fetch origin dev` reports "couldn't find remote
ref dev" even though `refs/remotes/origin/dev` exists and
`git symbolic-ref refs/remotes/origin/HEAD` is unset — worth a look, but it
did not block this session.

**Next:** Owner answers the four open questions, then decompose into tasks via
`./scripts/agentic tasks add --spec .agents/specs/ci-product-governance-split.md`.
Implementation must not start before that — the spec explicitly authorizes
protected-path edits to `.github/workflows/ci.yml` and the `gates` block of
`agentic.config.json`, so the authorizing task text has to carry that through.

## Owner validated the spec; decomposed into T-065..T-067 — 2026-08-04T05:51:36Z

**Did:** Owner answered all four open questions, each matching the spec's
recommendation. Rewrote the spec's Open questions section as recorded
decisions (with the rejected alternatives and why), added the criteria the
answers implied, and decomposed into three tasks. Still planning only — no
implementation.

**Decisions:**

1. Fork required-checks: governance job **always runs**; its harness steps
   detect a fork and exit 0 internally. Rejected non-required governance
   (nothing would enforce gates before merge) and an always-green aggregator
   (a job that exists only to report, obscuring which real job went red).
2. Coverage moves **product-side via vitest thresholds**, set at or below the
   measured baseline (75.6% stmts / 65.21% branches / 75.6% funcs / 76.72%
   lines). The unbound optional `coverage` gate entry is removed.
3. `push` triggers gain **`dev`** — today a PR merged to `dev` gets no
   post-merge run at all.
4. Product job **keeps the name `gates-fast`**, so no ruleset recompile and
   `approvals.yaml` stays out of scope.

**Care taken on decision 2:** removing a gate entry could read as weakening
gates, which the hard rules forbid. It is not. The `coverage` entry is
`optional: true` with **no `command` key**, so it always reported
`SKIP coverage (optional gate has no command bound)` and checked nothing.
Replacing it with enforced vitest thresholds is strictly stronger. T-066's
acceptance criteria require the implementing session to state this in its own
journal so the integrity gate and reviewer see the rationale rather than a
bare deletion.

**Tasks added** (dependency order; `tasks validate` → "task chain valid"):

- **T-065** Collapse product gate commands into root npm scripts — the
  single-source-of-truth move that everything else rests on.
- **T-066** Enforce coverage via vitest thresholds, drop unbound gate.
- **T-067** Split ci.yml into product and governance jobs.

Each carries the protected-path authorization in its acceptance text, since a
fresh-context session will not have this conversation. T-067 requires proving
harness-independence by actually stashing `.agentic/` and running the product
command sequence — not by reading the YAML.

**Known limit:** true fork-PR behavior cannot be observed locally or from a
same-repo branch. T-067 proves harness-independence and that the job reports a
conclusion; confirming a real fork PR goes green is a post-merge check on the
first external PR, and should not be claimed before then.

**Next:** `/next-task` (or the loop) picks up T-065 in a fresh context.

