<!--
  Core memory: always loaded at session start (SessionStart hook / AGENTS.md protocol).
  Budget: 200 lines (agentic.config.json memory.coreBudgetLines). `./scripts/agentic
  memory lint` fails the memory gate when this file exceeds the budget — cut before
  you add. Include only facts an agent would get wrong without; everything inferable
  from code stays out. HTML comments like this one are free (stripped on injection).
-->
# Core memory — agentic-starter-repo

## What this project is

The **agentic-starter-repo template itself** (self-hosting): a starter for new
agentic software projects where AI agents implement in supervised loops and
humans hold explicit approval points. The product is the harness (`.agentic/harness/`),
the approvals compiler, the skills, the hooks, and the docs.

## Layout facts agents need

- `.agentic/harness/` — self-contained Node >= 20 TS/ESM harness; own package.json; only
  runtime dep is `yaml`. Built to `.agentic/harness/dist/`, invoked via `./scripts/agentic`.
- `.agents/` — committed agent state: memory/ (this bank), roadmap.md (owner
  feature backlog), prompts/ (loop preambles), specs/, tasks.json (hash-chained),
  journal/ (one dated file per session — never edit another session's file),
  .cache/ (gitignored).
- `docs/designs/*.html` — owner-facing design docs: rich, strictly self-contained
  HTML (the `designs` gate fails external refs/network calls); viewed via
  `./scripts/agentic serve` (127.0.0.1 only). Rule: markdown = machine contracts,
  HTML = design docs only.
- `approvals.yaml` — owner policy. THIS repo runs branching.mode: integration:
  task branches (`task/<date>-<slug>`) PR into dev and auto-merge on green
  (squash-only, ruleset-pinned); humans merge the rolling "Release: dev → main"
  PR (merge-commit-only). Compiled by `./scripts/agentic approvals compile`
  into settings permissions, copilot.sh, CODEOWNERS, rulesets. Never hand-edit
  the generated surfaces.
- `agentic.config.json` — gates as data. Gate stack here: lint, typecheck, test,
  integrity, memory, designs (fast) + build (full).
- `.agentic/docs/architecture.md` is the normative contract; code and doc must agree.
- `.agentic/INSTANTIATE.md` — agent runbook for creating a NEW project from this
  template into a separate connected repo (dual-repo session; `git archive` copy).

## Invariants (violating any of these fails a gate or a hook)

1. One task per session/iteration; one commit per task; imperative subject.
2. `./scripts/agentic gates` green before every commit; `tasks complete <id>`
   re-runs gates and extends the hash chain — never edit tasks.json status by hand.
3. Never weaken/delete tests or add `.only`/`fit`/`fdescribe` (integrity gate).
4. Human approval points: merge to MAIN, deploy, release, force-push. In this
   repo's integration mode, ship = PR to dev + `gh pr merge --auto --squash`,
   then stop — never touch the rolling Release PR. Protected paths
   (approvals.yaml `protected_paths`) need explicit task authorization.
5. Loop stop conditions live in the harness (caps in approvals.yaml), never in prose.
6. AGENTS.md is canonical; CLAUDE.md is only an `@AGENTS.md` shim.
7. New features flow roadmap → design (owner checkpoint) → spec → tasks → loop;
   design docs never start implementation unapproved.
8. No AI attribution in git artifacts — no bot Co-Authored-By/session links/
   "Generated with" footers in commits or PRs (hook strips; integrity gate fails).
   Squash-merging via API/gh: ALWAYS pass an explicit commit body — GitHub's
   default squash message appends Co-authored-by trailers for agent-authored
   commits (repo setting "Default to PR title and description" fixes auto-merge).

## Current phase

Template v0.1 merged to main (2026-07-14): harness green, loop + tamper
detection proven end-to-end, design pipeline included, attribution-free
history enforced. Seeded tasks in tasks.json are onboarding tasks for a NEW
project adopting the template — not work on the template itself.
