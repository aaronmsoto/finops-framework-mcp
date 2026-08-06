# Architecture

This document is the contract for the repository. Every component listed here — file paths, command names, config schemas, exit codes — is normative. If code and this document disagree, fix one of them in the same change.

The research behind every decision here lives in [`.agentic/docs/research/`](research/), with `research-synthesis.md` as the entry point. Key decisions are recorded as ADRs in [`.agentic/docs/adr/`](adr/).

## What this repository is

A starter template for **agentic software projects**: repos where AI coding agents (Claude Code and GitHub Copilot CLI) do most of the implementation work in autonomous, iterative loops, while human owners define exactly where their approval is required (merging to main, deployments, releases, policy changes).

Design principles (justified in `.agentic/docs/research/research-synthesis.md`):

1. **One source of truth, per-tool shims.** `AGENTS.md` is canonical; `CLAUDE.md` is a tiny `@AGENTS.md` import shim.
2. **Advisory prose gets a deterministic twin.** Every rule that matters ships as instruction text *plus* a hook, permission rule, or CI check.
3. **Stop conditions live in the harness, never the prompt.** Iteration/wall-clock caps are mandatory; loops terminate in `success`, `budget_exhausted`, or `blocked`.
4. **Fresh context per iteration; state in files and git.** One task per iteration, one commit per task, hash-chained task list.
5. **The writer never grades its own work.** Independent fresh-context verification before a task flips to done.
6. **Gates are data, run identically everywhere.** Agent loop, git hooks, and CI all call the same named gates.
7. **Approval points are compiled, not documented.** `approvals.yaml` generates every enforcement surface.
8. **Deny and ask beat allow.** Claude `ask` rules survive `bypassPermissions`; Copilot `--deny-tool` beats `--allow-all`.
9. **Ship an effort dial.** Small tasks skip ceremony; big ones get spec → plan → tasks with a human spec checkpoint.
10. **Memory is a reviewable git artifact with a budget.** Curated markdown, size/staleness linted as a gate.
11. **Zero-infrastructure core.** Everything load-bearing is plain shell commands + committed files. MCP, beads, vector search are optional.
12. **Few, sharp, curated components.** ~9 skills, ~8 gates. No catalogs.

## Repository layout

```
AGENTS.md                  Canonical agent instructions (budget: ~150 lines)
CLAUDE.md                  Claude Code shim: @AGENTS.md + tiny Claude-only section
README.md                  Human-facing overview and quickstart
agentic.config.json        Gates-as-data + project mechanics (see schema below)
approvals.yaml             Owner policy: approval points, protected paths, loop caps
package.json               Root project package (the template itself is a TS project)
.agentic/package.json               Tooling manifest: installs @aaronmsoto/agentic-harness from GitHub Packages
  package.json             deps: typescript, vitest, @types/node, yaml, eslint (dev)
  tsconfig.json            ES2022 modules, strict, outDir dist/
  src/                     cli.ts + modules (see "Harness modules")
  schemas/                 JSON Schemas for agentic.config.json, approvals.yaml, tasks.json
  tests/                   vitest unit tests (*.test.ts)
.agentic/presets/          Language presets: typescript.json, python.json, README.md,
                           plus typescript/ and python/ starter-file dirs (the `files`
                           key copies these into the repo root, never overwriting)
.agentic/docs/             Template documentation: architecture.md (this file),
                           getting-started.md, operations.md, approvals.md,
                           quality-gates.md, memory.md, adr/, research/
.agentic/INSTANTIATE.md    Agent runbook: create a new project from this template
                           into a separate connected repo (dual-repo session)
.agentic/LICENSE           The template's MIT notice (travels with the machinery)
.agentic/licenses/         License texts written by `init --license` (mit, apache-2.0)
.agents/                   Agent-facing state (committed)
  memory/                  MEMORY.md, decisions.md, patterns.md, activeContext.md
  roadmap.md               Owner-curated feature backlog (idea → designing → specced → building → done)
  prompts/                 plan.md, build.md, verify.md (loop preambles)
  specs/                   Feature specs; TEMPLATE.md + README.md
  tasks.json               Hash-chained task list (harness-managed)
  journal/                 One dated entry file per session/loop run (YYYYMMDD-<slug>.md;
                           per-file ownership keeps parallel merges conflict-free)
  .cache/                  Gitignored scratch (gate reports, mock fixtures)
.claude/
  settings.json            Hooks + permissions (permissions.ask/deny are compiler-owned)
  agents/reviewer.md       Read-only independent verifier subagent
  skills/<name>/SKILL.md   9 skills (see "Skills")
.github/
  workflows/ci.yml         Two-tier CI (fast on PR/push-main, full on merge_group + push-main)
  workflows/claude-review.yml  Advisory LLM review, disabled by default
  CODEOWNERS               GENERATED by `agentic approvals compile`
  rulesets/main-branch.json  GENERATED importable branch ruleset
scripts/
  agentic                  Shell shim: exec the @aaronmsoto/agentic-harness CLI (npm-first probe)
  bootstrap.sh             npm ci --prefix .agentic (installs the harness package); install git hooks
  copilot.sh               GENERATED guarded Copilot CLI wrapper (--deny-tool flags)
  github-setup.sh          Applies non-transferring GitHub repo settings via gh api
  setup-beads.sh           Opt-in beads task-graph memory setup
  hooks/                   Claude Code hook scripts (node .mjs, zero deps)
  git-hooks/               pre-push, prepare-commit-msg (installed by bootstrap)
docs/                      PROJECT-owned documentation (the derivative's, not the
                           template's): README.md + adr/INDEX.md stubs
  designs/                 Owner-facing design docs: TEMPLATE.html + <slug>.html —
                           self-contained HTML (validated by the `designs` gate)
```

The harness is independent of the user's project language: it arrives as the `@aaronmsoto/agentic-harness` npm package via `.agentic/package.json`, separate from the root project manifest.

## The `agentic` CLI

Invoked as `./scripts/agentic <command>` (resolves the CLI from the installed `@aaronmsoto/agentic-harness` package). All commands exit `0` on success, `1` on failure, `2` on usage error. `--json` on any command emits machine-readable output to stdout.

| Command | Purpose |
|---|---|
| `init --name <n> --preset <p> --owner <@handle> [--runner claude\|copilot] [--branching trunk\|integration] [--license mit\|apache-2.0\|proprietary\|keep] [--license-holder "<name>"] [--fresh]` | Adapt template for a new project: apply preset gate bindings, set owner and branching mode, copy preset starter files (never overwriting), seed onboarding tasks (T-001..T-003, plus a license task when `--license` is left at keep), reset memory/roadmap/journal templates, archive the template README and write a project stub, run `approvals compile`, install git hooks. `--license` rewrites (mit/apache-2.0, from `.agentic/licenses/`, holder required) or removes (proprietary) the root LICENSE; default `keep` never touches it. The template's own MIT notice persists at `.agentic/LICENSE` regardless. `--fresh` also clears example specs and example design docs (keeps TEMPLATE.html). On a TTY, missing flags are prompted with defaults (wizard); non-TTY runs require explicit flags — the wizard never runs headless. |
| `gates [--tier fast\|full\|all] [name ...]` | Run named gates from `agentic.config.json` in declared order (default tier: `fast`; explicit names override tier filtering). Prints per-gate pass/fail + durations; writes report to `.agents/.cache/gates-report.json`. Fails on first hard failure only with `--fail-fast`, otherwise runs all and reports. |
| `loop [--mode build\|plan] [--runner claude\|copilot\|mock] [--max-iterations N] [--max-minutes M] [--no-verify] [--skip-preflight] [--task <id>]` | The supervised autonomous loop. See "The loop". A one-time preflight probes that the runner can edit files (fails fast with guidance; `--skip-preflight` bypasses). |
| `tasks <list\|next\|add\|start\|complete\|block\|validate>` | Manage `.agents/tasks.json`. `complete <id> --summary "..." [--commit]` refuses unless gates (fast tier) pass, then extends the hash chain (`--commit` also commits the task record). `block <id> --reason "..."` records why. `validate` re-verifies the chain. |
| `verify [--task <id>]` | Deterministic verification: gates green + chain valid + acceptance criteria present + working tree committed. Used by CI and the loop. |
| `approvals compile` | Regenerate all enforcement surfaces from `approvals.yaml` (see "Approvals compiler"). |
| `approvals check` | Recompile to temp and diff against committed surfaces; nonzero if drift. CI runs this. |
| `memory lint` | Enforce memory budgets and staleness (see "Memory"). |
| `memory show [--session-start]` | Print memory summary (used by the SessionStart hook). |
| `integrity [--base <ref>] [--strict]` | Anti-gaming diff checks (see "Integrity gate"). |
| `design new <slug> [--title "..."]` | Scaffold `docs/designs/<slug>.html` (from TEMPLATE.html) + `.agents/specs/<slug>.md`. |
| `design check` | Validate design docs: well-formed HTML, **no external resources or network calls** (the privacy guarantee), no dead relative links; warns on HTML files outside `docs/designs/` in documentation trees (markdown is the docs format). Wired as the `designs` gate. |
| `design publish <slug\|file>` | Run the owner's optional `designs.publishCommand` hook with `DESIGN_FILE`/`DESIGN_SLUG` env; errors if unconfigured. Nothing publishes by default. |
| `serve [--port <n>] [--dir <path>]` | Zero-dependency static server bound strictly to `127.0.0.1` for private design/doc review. Default port 4177. |
| `status` | One-screen summary: tasks by state, last gates report, journal tail, loop caps. |

## Config schemas

### `agentic.config.json` (mechanics)

```jsonc
{
  "$schema": "https://github.com/aaronmsoto/agentic-starter-repo (harness schemas ship upstream)",
  "preset": "self",                    // name of applied preset, or "self"/"custom"
  "project": { "name": "your-project", "srcDirs": ["src"], "testGlobs": ["tests/**"] },
  "gates": {                            // ordered map: name -> gate
    "<name>": {
      "command": "shell command",      // run via sh -c from repo root
      "tier": "fast" | "full",
      "optional": false,                // optional gates missing a command are skipped with a notice
      "timeoutSeconds": 600
    }
  },
  "loop": { "runner": "claude" },       // default runner ONLY; caps live in approvals.yaml
  "memory": { "dir": ".agents/memory", "coreBudgetLines": 200, "staleDays": 45 }
}
```

Canonical gate names (presets bind these; extra names allowed): `format`, `lint`, `typecheck`, `test`, `coverage`, `integrity`, `memory`, `designs`, `security`, `build`, `e2e`.

An optional top-level `designs` section configures the design-doc tier: `{ "dir": "docs/designs", "publishCommand": "<shell command>" }` — both keys optional; `publishCommand` receives `DESIGN_FILE`/`DESIGN_SLUG` env when `design publish` runs.

### `approvals.yaml` (policy — the owner edits this one file)

```yaml
version: 1
owner: "@your-github-handle"          # used by CODEOWNERS generation
approvals:
  merge_to_main: human                 # human | auto
  deploy_production: human             # human | auto
  release: human
  force_push: never                    # never | human
protected_paths:                       # CODEOWNERS entries + edit-hook protection
  - tests/**
  - .github/workflows/**
  - approvals.yaml
  - agentic.config.json
  - .claude/settings.json
commands:
  ask:                                 # -> .claude/settings.json permissions.ask
    - "Bash(git push*)"
    - "Bash(gh pr merge*)"
    - "Bash(npm publish*)"
  deny:                                # -> permissions.deny + copilot.sh --deny-tool
    - "Bash(git push --force*)"
    - "Bash(git push -f*)"
loop:                                  # HARD caps enforced by the harness
  max_iterations: 10
  max_wall_minutes: 120
  max_consecutive_failures: 3
branching:                             # optional; defaults shown
  mode: trunk                          # trunk | integration
  default_branch: main                 # the protected branch (ruleset + push-ask rules)
  integration_branch: dev              # integration mode only
  task_branch_prefix: "task/"
  integration_merge_method: squash     # ruleset-pinned method INTO dev
  release_merge_method: merge          # ruleset-pinned method dev -> main
```

**Branching modes.** `trunk` (default): feature branches PR into `main`, humans review every merge. `integration`: task branches PR into the integration branch and **auto-merge on green `gates-fast`** (the compiler emits an extra `integration-branch` ruleset: PR required, zero reviews, check required, and the merge method pinned to **squash** so dev stays linear with one commit per task; the main ruleset gains **merge-commit-only** so each release lands as a real merge point; the derived `gh pr merge*` ask rule is dropped so agents can arm auto-merge — main-merge safety moves entirely server-side to the main ruleset's required human review); `.github/workflows/release-pr.yml` maintains one rolling **"Release: dev → main"** PR whose merge is the human approval point. One-time setup for integration mode: enable "Allow auto-merge" in repo settings and import both rulesets.

**Default branch.** `branching.default_branch` (default `main`) is the branch the `main-branch` ruleset targets (`refs/heads/<default_branch>`) and the branch the derived push-ask rules guard (`Bash(git push origin <default_branch>*)`); it is also the default integrity base in trunk mode. The generated ruleset file keeps the stable name `main-branch.json` regardless. `.github/workflows/ci.yml` and `release-pr.yml` embed the branch name literally and are owner-owned (protected paths the compiler never generates) — a non-`main` default branch requires hand-editing those two files.

### `.agents/tasks.json` (harness-managed)

```jsonc
{
  "version": 1,
  "chainHead": "<sha256 of last completed entry, or 'genesis'>",
  "tasks": [{
    "id": "T-001",                     // assigned by `tasks add`, monotonic
    "title": "...",
    "spec": ".agents/specs/foo.md",    // optional
    "acceptance": ["criterion", ...],  // required, non-empty
    "status": "pending" | "in_progress" | "done" | "blocked",
    "evidence": null | { "gates": "pass", "summary": "...", "commit": "<sha>", "verifiedBy": "gates" | "reviewer" | "human", "completedAt": "ISO" },
    "hash": null | "<sha256(prevHash + id + canonical evidence JSON)>"
  }]
}
```

The chain makes silent status-flipping detectable: only `agentic tasks complete` (which runs gates first) extends it, and `tasks validate` / `verify` / CI recompute it. An agent editing `status` by hand breaks validation.

## Harness modules (upstream: agentic-starter-repo `.agentic/harness/src/`)

- `cli.ts` — argv parsing (hand-rolled, no deps), command dispatch, `--json` plumbing.
- `config.ts` — load + validate `agentic.config.json` and `approvals.yaml` (via `yaml` package); typed accessors; clear error messages with the offending path.
- `gates.ts` — sequential gate execution (`sh -c`, cwd = repo root, streamed output, timeout kill), report struct, tier filtering.
- `tasks.ts` — task list CRUD, hash chain (sha256 via node:crypto, canonical JSON stringify with sorted keys), `next` selection (first `pending` in file order).
- `loop.ts` — the supervised loop (see below).
- `runners/types.ts` — `AgentRunner` interface: `run({ prompt, cwd, timeoutMs }) => { exitCode, durationMs, finalText, events, usage? }`.
- `runners/claude.ts` — spawns `claude -p <prompt> --output-format stream-json --verbose` plus any extras in `$AGENTIC_CLAUDE_ARGS` (permission mode is the user's session/config choice — the harness never passes a bypass flag itself). Parses JSONL events; finalText = last `result` event.
- `runners/copilot.ts` — spawns `scripts/copilot.sh -p <prompt> --output-format json -s --no-ask-user` plus `$AGENTIC_COPILOT_ARGS` extras (the guarded wrapper injects deny flags). Parses JSONL.
- `runners/mock.ts` — for tests and dry runs: executes `$AGENTIC_MOCK_SCRIPT` via `sh -c` (simulating the agent's file edits) and returns its stdout as finalText. Selected with `--runner mock`.
- `approvals.ts` — the compiler (see below); pure functions from parsed policy to file contents, so tests can snapshot them.
- `memory.ts` — lint (budgets, staleness via git log -1 --format=%ct -- <file>, falling back to mtime) and show.
- `integrity.ts` — diff-based anti-gaming checks against `--base`; when `--base` is absent the default is derived from branching policy (`resolveDefaultBase`: `origin/<integration_branch>` in integration mode, else `origin/<default_branch>`, then the remote's `origin/HEAD`, then `origin/main`), so a non-`main` repo is not silently skipped. Graceful skip if nothing resolves.
- `journal.ts` — per-session entry files in `.agents/journal/` (`YYYYMMDD-<slug>.md`; a session/run writes only its own file), newest-N tail for status/banner.
- `util.ts` — repo-root discovery (walk up to find `agentic.config.json`), exec helpers, color-free logging (respect `--json`).
- `init.ts` — template adaptation: preset application + starter-file copy, owner/branching/license writes, memory/tasks/journal/roadmap reset, README takeover, recompile.
- `wizard.ts` — TTY-only interactive prompts for missing `init` flags (injectable IO; never runs headless).
- `verify.ts` — deterministic verification bundle: fast gates + chain valid + clean tree + evidence on done tasks.
- `designs.ts` — design-doc scaffold/check/publish (self-containment validation).
- `serve.ts` — 127.0.0.1-only static server with traversal-safe paths.

No runtime dependencies except `yaml`. Node >= 20. ESM throughout.

## Feature definition pipeline (roadmap → design → spec → tasks)

How new features and interfaces get defined before the loop builds them. Format rule: **markdown for machine contracts, HTML for human design surfaces** — specs, memory, prompts, and instruction files stay markdown (agent-consumed, token-lean, GitHub-rendered); design docs are rich HTML (owner-consumed, tabs/collapsibles/inline SVG).

1. **Intent** lands in `.agents/roadmap.md` (owner-curated backlog; statuses idea → designing → specced → building → done). Small fixes skip the pipeline entirely — the effort dial applies.
2. **Design**: the `design-feature` skill scaffolds via `agentic design new <slug>` and produces `docs/designs/<slug>.html` (rationale, architecture, alternatives, interface mockups) plus the companion spec. Design docs are **strictly self-contained** single files — all CSS/JS/SVG inline, zero network on open — so they render privately anywhere: `file://`, IDE preview, `agentic serve` (127.0.0.1 only), or the owner's own renderer via the `designs.publishCommand` hook. The `designs` gate enforces self-containment deterministically (principle 2), which is also the privacy guarantee: no public hosting exists or is needed.
3. **Owner checkpoint**: the owner reviews the rendered design; nothing downstream starts unapproved. The design explains *why*; the spec's acceptance criteria are what the loop and verifier enforce — on conflict the spec wins.
4. **Plan & build**: `/plan-feature` decomposes the approved spec into tasks; the loop takes over (below).

Seed example: `docs/designs/design-pipeline.html` documents this pipeline itself.

## The loop (`agentic loop`)

The refined Ralph pattern, supervised:

1. Load caps from `approvals.yaml` (`loop:` section). CLI flags may *lower* caps, never raise them. Caps are mandatory — absent config uses defaults (10 / 120 / 3).
1b. **Preflight (once, unless `--skip-preflight`):** spawn the runner with an `AGENTIC_LOOP_PHASE=preflight` prompt asking it to write a gitignored sentinel file, and confirm the file appeared. A missing CLI (exit 127), a hang/timeout, or a runner that runs but cannot write (untrusted workspace or an edit-denying permission mode in headless `-p`) throws a `CliError` naming the symptom and fix — before any iteration or journal file. This turns three identical "no new commit" failures into one fast, legible error.
2. Each iteration (while pending tasks remain and no cap is hit):
   a. Compose the prompt: `.agents/prompts/build.md` (or `plan.md` in plan mode) — a deterministic preamble instructing the agent to read memory + journal + git log, run `./scripts/agentic tasks next`, do ONE task, run gates, update memory/journal, commit, and run `./scripts/agentic tasks complete <id>`.
   b. Spawn a **fresh runner process** (never resume a session).
   c. After it exits, the harness independently checks: gates (fast tier), chain validity, whether a new commit exists, whether exactly one task moved. Agent claims are ignored; only these checks count.
   d. If `--no-verify` is not set and a task was completed: spawn a fresh runner with `.agents/prompts/verify.md` + the task + its evidence; a `VERDICT: pass|fail` line is required. `fail` reverts the task to `pending` (chain entry removed via `tasks` API) and counts as a failed iteration.
   e. Append a journal entry: iteration #, task, outcome, gate summary, duration.
3. Terminal states (exit code / `--json` `state` field):
   - `success` (0): no pending tasks AND gates green AND chain valid.
   - `budget_exhausted` (1): iteration or wall-clock cap hit.
   - `blocked` (1): `max_consecutive_failures` reached — the harness writes `.agents/BLOCKED.md` with the failing task, last errors, and gate output, and marks the task `blocked`.

**Plan mode** (`--mode plan`) runs exactly ONE iteration: the runner gets `.agents/prompts/plan.md` verbatim (plus a short harness-generated footer with the pending-task count and the files under `.agents/specs/`); no task is selected or started and the verifier pass is skipped. Success = pending task count strictly increased AND `tasks validate` passes; otherwise the loop exits `blocked` with the reason on stderr — plan mode never writes `BLOCKED.md` and never marks a task blocked.

`--runner mock` + `AGENTIC_MOCK_SCRIPT` makes the whole loop testable hermetically and lets users dry-run the machinery without an agent CLI installed.

## Approvals compiler (`agentic approvals compile`)

Reads `approvals.yaml`, writes (all marked with a `GENERATED by agentic approvals compile — edit approvals.yaml instead` header where the format allows):

1. `.claude/settings.json` — **owns `permissions.ask` and `permissions.deny` arrays entirely** (user additions belong in `settings.local.json`); merges non-destructively with the rest of the file (hooks etc. preserved). `force_push: never` → deny entries; `merge_to_main/deploy/release: human` → ask entries; plus `commands.ask/deny` verbatim. Separately, the PreToolUse hook (`scripts/hooks/protect-policy.mjs`) blocks agent edits to `protected_paths`; a human can permit a supervised policy edit by creating the gitignored marker file `.agents/.cache/policy-edit-ok` (remove it afterwards).
2. `scripts/copilot.sh` — executable wrapper: `exec copilot "$@" <generated --deny-tool flags>`; deny beats allow even under `--allow-all`, so the wrapper holds policy in YOLO mode. Copilot has no repo-committed permissions file — this wrapper is the repo-committed policy carrier.
3. `.github/CODEOWNERS` — `* @owner` when `merge_to_main: human`, plus one line per `protected_paths` entry.
4. `.github/rulesets/main-branch.json` — importable GitHub ruleset: require PR + 1 human review + status checks `gates-fast` (and `gates-full` when a merge queue is configured), block force pushes/deletions. Applying it is a one-time manual/API step documented in `.agentic/docs/approvals.md`.
5. `.github/rulesets/integration-branch.json` — **integration mode only**: ruleset for the integration branch requiring `gates-fast` but no human review (green CI is the auto-merge gate). In trunk mode `approvals check` flags this file as stale if present.

`approvals check` = compile-to-temp + diff; wired into CI so policy and enforcement can't drift.

## Quality gates & CI

- Gate stack (self-hosted on this repo): `lint`, `typecheck`, `test` (fast) + `build` (full), plus harness gates `integrity` and `memory` (fast). Presets bind the same names for TS (eslint/tsc/vitest→lcov) and Python (ruff/pyright/pytest→coverage.xml); `coverage` ships as an optional placeholder without a command (skipped with a notice) that you activate by installing diff-cover (multi-format) and binding the command documented in the preset's setup steps.
- **Integrity gate**: against `--base`, fail on deleted test files, on focus markers (`.only(`, `fit(`, `fdescribe(`) added **in files matching `project.testGlobs`** (markers are inert elsewhere, and docs legitimately mention the syntax), on **AI-attribution markers in new commit messages** (bot `Co-Authored-By` trailers, session links, `Agent:` trailers, "Generated with ..." footers — owner policy; human co-authors don't match), and on **append-only history violations** (modifying/deleting another session's `.agents/journal/` file, or removing lines from `decisions.md`); warn (fail with `--strict`) on decreased test-callsite count, on commit subjects over 72 characters, and on diffs that mix implementation with `tests/**` or gate/policy config edits.
- `.github/workflows/ci.yml`: job `gates-fast` on `pull_request` + `push` to main (rejects PR bodies carrying AI-attribution footers, installs root project deps when a package.json exists, bootstraps the harness, `gates --tier fast`, `approvals check`, `integrity --base origin/${{ github.base_ref }}` on PRs); job `gates-full` on `merge_group` and pushes to main, running `gates --tier all` (merge-queue repos: CI *must* listen to `merge_group` or queued PRs never report).
- `claude-review.yml`: advisory Claude code review, `workflow_dispatch` only by default, pinned action version, minimal permissions. Never a required check.
- Git hooks (installed by `bootstrap.sh` via `core.hooksPath`): `pre-push` runs `gates --tier fast`; `prepare-commit-msg` strips AI-attribution lines from commit messages (bot `Co-Authored-By` trailers, session links, `Agent:` trailers, "Generated with ..." footers) per owner policy — best-effort locally, enforced by the integrity gate's commit-message check.

## Memory

`.agents/memory/` is the shared, PR-reviewed memory bank; read at session start (Claude: SessionStart hook prints `memory show --session-start`; Copilot: AGENTS.md protocol), updated before session end (skill + prompt protocol; linted in CI):

- `MEMORY.md` — always-loaded core: project facts, invariants, current phase. **Budget: `coreBudgetLines` (200).** `memory lint` fails over budget (and warns when `AGENTS.md` exceeds ~170 lines, keeping the always-loaded set within Anthropic's ~200-line guidance).
- `decisions.md` — append-only decision log (date, decision, why, alternatives).
- `patterns.md` — codebase conventions agents must follow.
- `activeContext.md` — the handoff file: what's in flight, next steps, open questions. `memory lint` warns when stale (> `staleDays` without edits while commits continued).

Claude Code's machine-local auto memory is the agent's private scratch; this bank is the shared record — the distinction is documented in `.agentic/docs/memory.md`. Opt-in tiers: beads (`scripts/setup-beads.sh`) for long-horizon task graphs; MCP/vector indexes as derived caches only. RuVector/AgentDB assessed and deferred (see `.agentic/docs/memory.md` watch item).

## Skills (`.claude/skills/`, shared SKILL.md format — read by both tools)

| Skill | Invocation | Purpose |
|---|---|---|
| `next-task` | model or `/next-task` | Protocol for picking + completing exactly one task with gates and evidence. |
| `plan-feature` | `/plan-feature` | Effort dial: spec → plan → tasks via `tasks add`; instructs human spec checkpoint for large work. |
| `verify-work` | model or `/verify-work` | Evidence-based verification before claiming done (run the software, cite output). |
| `update-memory` | model or `/update-memory` | Curation protocol for the memory bank within budgets. |
| `handoff` | `/handoff` | Write `activeContext.md` + journal entry for the next session. |
| `ship` | `/ship`, `disable-model-invocation: true` | Open a PR: gates, changelog, PR body, request human review per approvals.yaml. |
| `loop` | `/loop-help` (name `loop-help` to avoid colliding with any built-in) | How to run/resume/diagnose the autonomous loop. |
| `design-feature` | model or `/design-feature` | Owner-reviewable HTML design doc + spec for a new feature; stops at the owner checkpoint. |
| `instantiate-project` | model or `/instantiate-project` (template repo only — `init` removes it from derivatives) | Frame a dual-repo session around `.agentic/INSTANTIATE.md` to create a new project from this template. |

`.claude/agents/reviewer.md`: read-only verifier subagent (tools: Read, Grep, Glob, Bash restricted to test/gate commands) used by `verify-work` and loop verification.

## Cross-tool contract

- Copilot CLI reads `AGENTS.md` natively; whether it *also* reads `CLAUDE.md` when both exist is unverified — therefore **nothing Copilot-relevant may live only in CLAUDE.md** (CI could later add a smoke test).
- Both tools read `.claude/skills/` SKILL.md (Agent Skills standard, Copilot since 2025-12-18). `.claude/skills/` is the ONLY project directory both tools read natively — Copilot also supports `.agents/skills/` and `.github/skills/`, but Claude Code does not (verified 2026-07 against code.claude.com/docs/en/skills; watch anthropics/claude-code#31005 for `.agents/skills/` support, and move there when both tools read it).
- Claude-only enforcement: hooks + settings permissions. Copilot-only enforcement: `scripts/copilot.sh` wrapper. Shared enforcement: git hooks + CI + rulesets — which is why the deterministic layer lives there.
