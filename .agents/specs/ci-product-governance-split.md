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
      it can remain a required check without blocking forks indefinitely — the
      job itself always runs; only its harness steps skip internally.
- [ ] The product job is named `gates-fast`, so no ruleset recompile is needed
      and `.github/rulesets/main-branch.json` is untouched by this work.
- [ ] The vitest config enforces coverage thresholds set at or below the
      measured baseline (75.6% statements, 65.21% branches, 75.6% functions,
      76.72% lines); artificially raising a threshold by one point makes
      `npm test` fail, proving enforcement is live.
- [ ] The unbound optional `coverage` entry is removed from
      `agentic.config.json`, and `./scripts/agentic gates` no longer prints
      `SKIP coverage`.
- [ ] `.github/workflows/ci.yml` triggers `push` on both `main` and `dev`.
- [ ] Workflow comments explain the product/governance split in the same style
      as the existing fast/full and `merge_group` notes.
- [ ] A fork-PR simulation is documented in the journal with observed output,
      not asserted from reading YAML.

## Open questions

All four resolved by the owner on 2026-08-04. Recorded here as decisions; no
open questions remain.

1. **Required-check strategy for forks — RESOLVED: always run, no-op on
   forks.** A job skipped by an `if:` condition reports "skipped", which does
   **not** satisfy a required status check and blocks the PR forever — the
   same class of trap the existing `merge_group` comment warns about. The
   governance job therefore always runs so its check name always reports; the
   harness-dependent steps detect a fork and skip internally, exiting 0.
   Rejected: leaving governance non-required (nothing would enforce that gates
   ran before merge), and a separate always-green aggregator check (adds a job
   whose only purpose is reporting, and obscures which real job went red).
2. **`coverage` — RESOLVED: move product-side via vitest thresholds.** Encode
   thresholds in the vitest config so `npm test` fails on regression and forks
   see coverage failures like any other test failure. Thresholds must start at
   or below the current measured baseline — 75.6% statements, 65.21% branches,
   75.6% functions, 76.72% lines — so the change is not a silent tightening.
   The now-redundant unbound `coverage` gate entry is removed: it is optional
   with no `command` and always reports SKIP, so replacing it with enforced
   vitest thresholds is strictly stronger, not a weakened gate.
   `e2e` is out of scope and stays as-is.
3. **Trigger coverage — RESOLVED: add `dev` to the `push` triggers.** Today a
   PR merged into `dev` gets no post-merge CI run at all, so breakage there is
   invisible until the next PR.
4. **Required-check names — RESOLVED: the product job keeps the name
   `gates-fast`.** It inherits the existing required-check name, so no ruleset
   recompile and no `approvals.yaml` churn. The governance job takes a new
   name and is added as a required check separately if desired — explicitly
   out of scope here.
