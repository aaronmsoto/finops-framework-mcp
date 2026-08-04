# Spec: CI product/governance split

## Problem

Every CI signal in this repo flows through the harness. Both jobs in
`.github/workflows/ci.yml` run `./scripts/agentic gates`, and both bootstrap
the harness from `.agentic/harness/` first. There is no job that builds the
MCP servers or runs vitest independently.

Two consequences. First, when this repo goes public, GitHub does not expose
secrets or trusted contexts to fork PRs — so once the harness becomes a
private npm package, a fork PR will fail at install and produce no signal at
all, not even "do the servers compile." Second, the coupling hides which
checks are about *the product* versus *the development loop*, which is the
same boundary the harness extraction has to cut along.

## Outcome

`.github/workflows/ci.yml` runs product checks and governance checks as
separate jobs with separate dependency graphs:

- A **product** job needs only the root toolchain — `npm ci` plus
  prettier/eslint/tsc/vitest. It runs on every PR including forks, and it
  never touches `.agentic/`, `scripts/bootstrap.sh`, or the harness binary.
- A **governance** job runs the harness-implemented gates (`designs`,
  `integrity`, `memory`), `approvals check`, the integrity diff, and the
  PR-body attribution check. It acquires the harness in exactly one step, so
  swapping `./scripts/bootstrap.sh` for an npm install of the extracted
  package is a one-line diff later.

Command definitions live in **one** place: root `package.json` scripts. Gate
entries in `agentic.config.json` invoke `npm run <script>`, and the product
CI job invokes the same scripts. Neither file restates a tool invocation, so
the two tiers cannot drift.

## Non-goals

- Extracting the harness to npm. This spec only makes that extraction a small
  diff; it does not perform it.
- Changing what any gate checks, its thresholds, or its tier assignment.
- Adding new tests, new lint rules, or new gates.
- Reworking the fast/full tier concept. Fast/full is about *cost*; this split
  is about *dependencies*. They are orthogonal and both survive.
- Touching `approvals.yaml` or the compiled ruleset beyond whatever renaming
  required checks demands.

## Authorized protected-path edits

This work **explicitly authorizes** editing `.github/workflows/ci.yml` and
the `gates` block of `agentic.config.json`, which the AGENTS.md hard rules
otherwise forbid. No other protected path is in scope; `approvals.yaml` and
`.claude/settings.json` stay untouched unless a required-check rename forces
a recompile, which must be its own reviewed step.

## Acceptance criteria

- [ ] Root `package.json` gains `lint`, `format:check`, and `typecheck`
      scripts whose bodies are exactly the commands currently inlined in the
      `agentic.config.json` gate entries.
- [ ] The `format`, `lint`, `typecheck`, `test`, and `build` gate entries in
      `agentic.config.json` invoke `npm run <script>`; no tool binary is named
      in both `package.json` and `agentic.config.json`.
- [ ] `./scripts/agentic gates --tier all` passes on a clean tree, proving the
      indirection changed no behavior.
- [ ] `.github/workflows/ci.yml` defines a product job that does **not** run
      `scripts/bootstrap.sh` and does not reference `.agentic/`; its
      `cache-dependency-path` is the root `package-lock.json`.
- [ ] The product job passes when `.agentic/` is absent — verifiable locally
      with `git stash push -- .agentic && npm ci && npm run lint && npm run
      typecheck && npm test && npm run build`.
- [ ] The governance job acquires the harness in exactly one named step, with
      a comment stating that this step is what changes when the harness moves
      to npm.
- [ ] The governance job reports a conclusion (not "skipped") on fork PRs, so
      it can remain a required check without blocking forks indefinitely — see
      Open question 1.
- [ ] Workflow comments explain the product/governance split in the same style
      as the existing fast/full and `merge_group` notes.
- [ ] A fork-PR simulation is documented in the journal with observed output,
      not asserted from reading YAML.

## Open questions

1. **Required-check strategy for forks.** A job skipped by an `if:` condition
   reports "skipped", which does **not** satisfy a required status check and
   blocks the PR forever — the same class of trap the existing `merge_group`
   comment warns about. Options: (a) always run the governance job and no-op
   its harness steps on forks so the check still reports success; (b) leave
   governance non-required and rely on maintainer-owned branches; (c) a
   separate always-green aggregator check. Recommend (a).
2. **`coverage` and `e2e` have no `command`** in `agentic.config.json` — they
   are harness-implemented, and `coverage` is not obviously governance. Does
   coverage enforcement move product-side via vitest thresholds, or stay in
   the governance job? Recommend vitest thresholds so forks see coverage
   failures.
3. **Trigger coverage.** CI currently runs `push` only on `main`, but PRs
   target `dev`. Should the product job also run on pushes to `dev`?
4. **Whether required-check names change.** If the product job is named
   something other than `gates-fast`, the branch ruleset and
   `.github/rulesets/main-branch.json` need recompiling — an
   `approvals compile` step that must be reviewed separately. Keeping the name
   `gates-fast` for the product job avoids this entirely.
