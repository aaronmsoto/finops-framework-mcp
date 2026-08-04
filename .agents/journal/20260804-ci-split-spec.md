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
