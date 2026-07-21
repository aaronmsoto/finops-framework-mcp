# AGENTS.md

Canonical instructions for AI coding agents (Claude Code, GitHub Copilot CLI, and any AGENTS.md-aware tool) working in this repository. `CLAUDE.md` imports this file — do not duplicate content there.

## What this project is

<!-- init: replace this section with 3-6 lines about YOUR project after running `./scripts/agentic init` -->
This is the **agentic-starter-repo template itself**: a starter for new agentic software projects. The "product" is the harness (`.agentic/harness/`), the policy compiler, the skills, and the docs. Treat the harness like production code.

## Session protocol (every session, both tools)

1. **Orient:** read `.agents/memory/MEMORY.md` and `.agents/memory/activeContext.md`, then `git log --oneline -10`. (Claude Code does this automatically via the SessionStart hook — don't re-read if already injected.)
2. **Work:** one task at a time. For tracked work, use `./scripts/agentic tasks next` and `./scripts/agentic tasks start <id>`. Never work two tasks in one session.
3. **Verify:** run `./scripts/agentic gates` before every commit. A change is not done because the code looks right — it is done when gates pass and you have run the affected behavior.
4. **Record:** update `.agents/memory/activeContext.md` (and `decisions.md` for any decision with alternatives), write your session file in `.agents/journal/` (see its README), then commit — one commit per task, imperative subject.
5. **Complete:** `./scripts/agentic tasks complete <id> --summary "..."` — this re-runs gates and extends the task hash chain (add `--commit` to auto-commit the task record). Editing `tasks.json` status by hand breaks validation and will be rejected by CI.

## Commands

| Purpose | Command |
|---|---|
| Bootstrap (once per clone) | `./scripts/bootstrap.sh` |
| Run quality gates | `./scripts/agentic gates` (`--tier full` before shipping) |
| Task list / next / complete | `./scripts/agentic tasks list \| next \| complete <id>` |
| Autonomous loop | `./scripts/agentic loop --max-iterations N` |
| Verify everything | `./scripts/agentic verify` |
| Memory hygiene | `./scripts/agentic memory lint` |
| Status overview | `./scripts/agentic status` |

Harness development: `cd .agentic/harness && npm run test | lint | typecheck | build`.

## Hard rules (each has a deterministic enforcement twin — see .agentic/docs/architecture.md)

- **Never merge to main, deploy, release, or force-push.** These are human approval points defined in `approvals.yaml`. Open a PR and stop. (Enforced: settings ask/deny rules, copilot.sh deny flags, CODEOWNERS, rulesets.)
- **Never edit `approvals.yaml`, `.claude/settings.json`, `agentic.config.json` gate definitions, or `.github/workflows/`** unless the task explicitly says so. (Enforced: PreToolUse hook + protected_paths + integrity gate.)
- **Never delete or weaken tests to make gates pass.** No `.only`/`fit`/`fdescribe`. If a test is wrong, say so in the journal and fix it as its own change. (Enforced: integrity gate.)
- **Do not claim completion without evidence.** Cite gate output; for behavior changes, run the software and cite what you observed. (Enforced: hash chain + independent verifier.)
- If blocked after honest attempts, write the blocker to your `.agents/journal/` session file and mark the task blocked — do not thrash. (Enforced: loop `max_consecutive_failures`.)

## Where things live

- Memory bank (shared, committed): `.agents/memory/` — budgets enforced by `memory lint`.
- Roadmap (owner intent): `.agents/roadmap.md`. Design docs (rich, self-contained HTML, owner-reviewed): `docs/designs/` — created via the `design-feature` skill, validated by the `designs` gate, viewed via `./scripts/agentic serve` (localhost only). Markdown is for machine contracts; HTML only for design docs.
- Specs & plans: `.agents/specs/` (template inside). Big work: use the `plan-feature` skill (novel architecture/interfaces: `design-feature` first); small fixes don't need a spec.
- Task state: `.agents/tasks.json` (harness-managed, hash-chained).
- Progress journal: `.agents/journal/` — one dated file per session/loop run (conflict-free for parallel work; convention in its README).
- Skills: `.claude/skills/` (shared SKILL.md format — Copilot reads these too).
- Policy: `approvals.yaml` (owner-edited) → compiled by `./scripts/agentic approvals compile`.
- Full design: `.agentic/docs/architecture.md`. Operations: `.agentic/docs/operations.md`.
- Creating a NEW project from this template (agent-driven, dual-repo session): follow `.agentic/INSTANTIATE.md`.

## Conventions

- Commit messages: imperative subject ≤ 72 chars; body explains why. **No AI attribution anywhere in git artifacts** — no `Co-Authored-By` bot trailers, session links, `Agent:` trailers, or "Generated with ..." footers in commits, PR titles/bodies, or code comments. (Enforced: the `prepare-commit-msg` hook strips them; the integrity gate fails new commits carrying them.)
- Match surrounding code style; comments only for non-obvious constraints.
- Keep this file ~150 lines (`memory lint` warns past 170) and `MEMORY.md` under 200 (hard fail).
