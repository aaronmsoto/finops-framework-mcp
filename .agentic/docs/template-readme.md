# agentic-starter-repo

A starter template for **agentic software projects**: repositories where AI coding agents — Claude Code and GitHub Copilot CLI — do most of the implementation work inside a supervised, capped, iterative loop, while you (the human owner) keep a small set of explicit approval points: merging to main, deploying, releasing, and changing the policy itself.

The template's harness (consumed here as the `@aaronmsoto/agentic-harness` npm package), a policy compiler that turns one `approvals.yaml` into every enforcement surface, quality gates defined as data and run identically everywhere, and a git-native memory bank agents read at the start of every session. Nothing load-bearing needs infrastructure: it is all shell commands and committed files.

## Why this exists

Every existing template covers a slice. GitHub Spec Kit owns spec-driven workflow but its own community calls the ceremony "the illusion of work" for small tasks, and a field test measured roughly 10x slower than lightweight iteration; it ships no runtime quality gates. Anthropic's official ralph-wiggum loop plugin proves the fresh-context loop pattern but **defaults to unlimited iterations** with no gates or budgets. Skill catalogs are Claude-only breadth without QA; methodology layers ship no scaffolding or CI. Nobody combines a supervised loop with deterministic gates, dual Claude/Copilot support from one config source, compiled human approval points, and reviewable git-native memory. That combination is this repo. The evidence is in [.agentic/docs/research/](.agentic/docs/research/), starting with [research-synthesis.md](.agentic/docs/research/research-synthesis.md).

## Quickstart

> **Agent-driven alternative:** an agent session with access to both this
> template and your new (empty) repo can perform every step below itself —
> point it at [.agentic/INSTANTIATE.md](.agentic/INSTANTIATE.md).

1. Click **Use this template** on GitHub to create your repo.

2. Clone it:

   ```sh
   git clone <your-repo> && cd <your-repo>
   ```

3. Build the harness and install git hooks:

   ```sh
   ./scripts/bootstrap.sh
   ```

4. Adapt the template for your project (applies the preset's gate commands, sets you as owner in `approvals.yaml`, resets memory/tasks/journal, compiles the policy):

   ```sh
   ./scripts/agentic init --name my-project --preset typescript --owner @you
   ```

5. Edit the "What this project is" section of `AGENTS.md` — 3-6 lines about *your* project. This is the one section agents read in every single session.

6. Apply the GitHub repo settings (they don't transfer with the template): `./scripts/github-setup.sh` with an authenticated `gh`, or follow the manual checklist in [getting-started](.agentic/docs/getting-started.md#wire-up-github). This makes "a human merges" enforced, not aspirational.

7. Write your first spec in `.agents/specs/` (copy `TEMPLATE.md`). A few paragraphs of what and why is enough; small fixes don't need a spec at all.

8. Open Claude Code (or Copilot CLI via `./scripts/copilot.sh`) and run `/plan-feature` to turn the spec into hash-chained tasks with acceptance criteria.

9. Run the supervised loop, capped low while you build trust:

   ```sh
   ./scripts/agentic loop --max-iterations 3
   ```

10. Review the resulting work and merge the PR yourself — the agent cannot.

Full walkthrough with prerequisites and troubleshooting: [.agentic/docs/getting-started.md](.agentic/docs/getting-started.md).

## How it works

`agentic loop` is a refined Ralph loop with the supervision the original lacks. Each iteration spawns a **fresh agent process** (never a resumed session) that does exactly one task; the harness — not the agent — decides what counts as done.

```
   agentic loop  (caps from approvals.yaml — hard, flags can only lower them:
                  10 iterations / 120 wall-clock minutes / 3 consecutive failures)

  +--> fresh agent process
  |      reads memory + journal + git log, picks ONE task
  |      (.agents/prompts/build.md preamble)
  |          |
  |          v
  |    harness verifies independently -- agent claims are ignored:
  |      gates (fast tier) green?  hash chain valid?  new commit?
  |          |
  |          v
  |    fresh VERIFIER process (.agents/prompts/verify.md)
  |      must print VERDICT: pass | fail
  |      fail -> task reverts to pending, counts as a failed iteration
  |          |
  |          v
  |    commit stands, journal entry appended
  |          |
  +----------+   while pending tasks remain and no cap is hit

  terminal states:
    success           (exit 0)  no pending tasks, gates green, chain valid
    budget_exhausted  (exit 1)  iteration or wall-clock cap hit
    blocked           (exit 1)  3 consecutive failures -> .agents/BLOCKED.md
```

Task state lives in `.agents/tasks.json`, a hash-chained list only the harness can legitimately extend: `agentic tasks complete` runs the gates first, then chains the evidence. An agent flipping a status by hand breaks validation, which CI recomputes.

The loop is one mode of working, not the only one. For everyday work you sit in an interactive Claude Code or Copilot CLI session and the same machinery — gates before commit, memory protocol, protected paths — applies through hooks, the wrapper, and git hooks. There is an effort dial: small fixes skip ceremony entirely; large features get spec → plan → tasks with a human checkpoint on the spec. See [.agentic/docs/operations.md](.agentic/docs/operations.md).

## Two tools, one source of truth

`AGENTS.md` is the canonical instruction file; `CLAUDE.md` is a tiny `@AGENTS.md` import shim. Both tools read the shared skills in `.claude/skills/` (the Agent Skills SKILL.md standard). Enforcement differs by tool — Claude Code gets hooks and permission rules in `.claude/settings.json`; Copilot CLI gets the generated `scripts/copilot.sh` wrapper with deny flags baked in — but both are compiled from the same `approvals.yaml`, and the shared layer (git hooks, CI, GitHub rulesets) backstops both.

## The safety model

- **One policy file, compiled everywhere.** `approvals.yaml` generates Claude Code ask/deny permission rules, the guarded Copilot wrapper, CODEOWNERS, and the GitHub branch ruleset. `agentic approvals check` fails CI if any surface drifts.
- **Deny and ask survive YOLO modes.** Claude Code `ask` rules apply even under `bypassPermissions`; Copilot `--deny-tool` beats `--allow-all`. Approval points hold even when the agent runs "fully autonomous."
- **Tamper-evident task state.** The hash chain in `.agents/tasks.json` makes silent status-flipping detectable; `tasks validate`, `verify`, and CI all recompute it.
- **An integrity gate hunts gaming.** Deleted test files and focus markers (`.only(`, `fit(`, `fdescribe(`) fail the diff outright; weakened tests and mixed implementation/test-config changes are flagged for human review.
- **Caps live in the harness, not the prompt.** Iteration, wall-clock, and consecutive-failure caps are mandatory; CLI flags may lower them, never raise them.
- **A human merges.** `merge_to_main: human` means CODEOWNERS plus the branch ruleset require your review — the agent proposes, you approve.

## GitHub Copilot CLI benefits

This repo gives Copilot CLI the supervision it lacks natively — same instructions, skills, memory, and gates as Claude Code, driven by one harness.

- **Policy holds:** the generated `scripts/copilot.sh` wrapper carries your approval rules as deny flags that beat `--allow-all`.
- **Real loops:** capped, verified, multi-iteration autonomous runs (`agentic loop --runner copilot`) from a single-session tool.
- **Enterprise-safe:** plain files and shell only — nothing org admins commonly block (no MCP, hosted services, or Pages dependencies).

## Claude Code benefits

This repo turns Claude Code's native machinery into an enforced workflow — every advisory rule gets a deterministic twin wired into hooks and permissions.

- **Deeper enforcement:** hooks inject memory at session start, block edits to policy files, and hold the turn open while gates are red in loop mode; `ask` rules survive `bypassPermissions`.
- **Verified loops:** fresh `claude -p` sessions per iteration with structured output, plus a committed reviewer subagent so the writer never grades its own work.
- **Zero-drift instructions:** `CLAUDE.md` is a tiny `@AGENTS.md` import — one instruction source shared with Copilot CLI, no duplicate-file rot.

## The `agentic` CLI at a glance

Everything is `./scripts/agentic <command>` (exit `0` success, `1` failure, `2` usage error; `--json` anywhere for machine-readable output):

```sh
./scripts/agentic init --name X --preset typescript --owner @you   # adapt template
./scripts/agentic gates [--tier fast|full|all] [name ...]          # run quality gates
./scripts/agentic loop [--max-iterations N] [--max-minutes M]      # supervised autonomous loop
./scripts/agentic tasks list|next|add|start|complete|block|validate
./scripts/agentic verify [--task <id>]      # gates + chain + acceptance + clean tree
./scripts/agentic approvals compile         # regenerate enforcement from approvals.yaml
./scripts/agentic approvals check           # fail if enforcement drifted (CI runs this)
./scripts/agentic memory lint               # memory budgets + staleness
./scripts/agentic integrity [--base <ref>]  # anti-gaming diff checks
./scripts/agentic design new|check|publish  # owner-facing HTML design docs
./scripts/agentic serve                     # private review server (127.0.0.1 only)
./scripts/agentic status                    # one-screen summary
```

## Repository map

```
AGENTS.md              Canonical agent instructions (CLAUDE.md is an @AGENTS.md shim)
agentic.config.json    Gates-as-data + project mechanics
approvals.yaml         Owner policy: approval points, protected paths, loop caps
.agentic/              Template machinery: harness/ (the agentic CLI), presets/, docs/, INSTANTIATE.md
.agents/               Agent state: memory/, roadmap.md, prompts/, specs/, tasks.json, journal/
.claude/               Hooks + permissions (compiler-owned), reviewer subagent, 9 skills
.github/               Two-tier CI, advisory LLM review, generated CODEOWNERS + ruleset
scripts/               agentic shim, bootstrap.sh, generated copilot.sh, hooks
docs/                  YOURS: README, adr/ (INDEX.md), designs/ (self-contained HTML design docs)
```

## Documentation

- [.agentic/docs/getting-started.md](.agentic/docs/getting-started.md) — prerequisites through your first autonomous loop
- [.agentic/docs/operations.md](.agentic/docs/operations.md) — the operator's manual: daily flows, the loop, autonomy presets
- [.agentic/docs/approvals.md](.agentic/docs/approvals.md) — the policy system and what the compiler generates
- [.agentic/docs/quality-gates.md](.agentic/docs/quality-gates.md) — gates-as-data, tiers, coverage, the integrity gate
- [.agentic/docs/memory.md](.agentic/docs/memory.md) — the memory bank, session protocol, and opt-in tiers
- [.agentic/docs/architecture.md](.agentic/docs/architecture.md) — the normative contract for every component
- [.agentic/docs/adr/](.agentic/docs/adr/) — the six load-bearing decisions and their evidence
- [.agentic/docs/research/](.agentic/docs/research/) — the verified research behind the design

This repo dogfoods itself: its own gates (`lint`, `typecheck`, `test`, `integrity`, `memory`, `designs`, `build`) run against the harness on every push, PR, and loop iteration.

## License

MIT — see [LICENSE](LICENSE). In a derivative project the root LICENSE is *yours*: `agentic init --license mit|apache-2.0|proprietary` sets it (default `keep` leaves it untouched with a reminder), while the template machinery's MIT notice persists at [.agentic/LICENSE](.agentic/LICENSE).
