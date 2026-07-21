# Decision log

Append-only. Never rewrite or delete an entry; supersede with a new one that
references the old. Entry format:

```
## YYYY-MM-DD — <decision title>
- **Decision:** what was decided, one or two sentences.
- **Why:** the driving reasons.
- **Alternatives considered:** what was rejected and why.
```

## 2026-07-13 — Markdown memory bank over vector DBs / RuVector

- **Decision:** Shared agent memory is curated, committed markdown
  (`.agents/memory/`: MEMORY.md, decisions.md, patterns.md, activeContext.md)
  with size/staleness budgets enforced by `./scripts/agentic memory lint`.
  No vector store or memory database in the core template.
- **Why:** Memory must be PR-reviewable, diffable, and zero-infrastructure
  (design principle 11). A budgeted markdown bank is inspectable by humans and
  both agent CLIs; a vector index is a derived cache at best.
- **Alternatives considered:** RuVector/AgentDB — assessed and deferred as
  immature (AgentDB at ~76 GitHub stars, no tagged releases). Recorded as a
  watch item in `docs/memory.md`; revisit in 2027. MCP memory servers and
  beads remain opt-in tiers, never load-bearing.

## 2026-07-13 — AGENTS.md canonical, CLAUDE.md as @import shim

- **Decision:** All agent instructions live in `AGENTS.md`. `CLAUDE.md` is a
  3-line shim containing `@AGENTS.md` plus at most a tiny Claude-only section.
- **Why:** Copilot CLI reads AGENTS.md natively and its handling of CLAUDE.md
  is unverified, so nothing Copilot-relevant may live only in CLAUDE.md.
  Claude Code's `@import` syntax is officially sanctioned for exactly this.
  One source of truth prevents drift between tools.
- **Alternatives considered:** duplicated files (guaranteed drift); symlink
  (works but the import shim allows Claude-specific extras); CLAUDE.md
  canonical (breaks Copilot, the less-configurable tool).

## 2026-07-13 — Stop conditions live in the harness, with mandatory caps

- **Decision:** `agentic loop` enforces hard caps from `approvals.yaml`
  (`max_iterations`, `max_wall_minutes`, `max_consecutive_failures`); CLI flags
  may lower caps, never raise them; terminal states are exactly `success`,
  `budget_exhausted`, `blocked` (writes `.agents/BLOCKED.md`).
- **Why:** Prompt-level stop conditions are advisory and empirically fail (loop
  engineering research: the kill switch must live outside the loop, not in the
  model's judgment). Caps in owner policy make budget a human decision.
- **Alternatives considered:** prompt-only stop instructions (not enforceable);
  completion-promise strings alone (agent can emit them falsely — kept only as
  a signal, never the sole check); unlimited loops with human watching (defeats
  autonomy and fails unattended).

## 2026-07-14 — No AI attribution in git artifacts

- **Decision:** Commit messages, PR titles/bodies, and code comments carry no
  AI attribution: no bot `Co-Authored-By` trailers, no session links, no
  `Agent:` trailers, no "Generated with ..." footers. The branch history was
  rewritten to remove existing trailers.
- **Why:** Owner rejection (2026-07-14) of agent-attributed commits — the git
  history should read as the project's history, not the tooling's.
- **Alternatives considered:** attribution trailers as an audit trail (the
  original v0.1 design, supported by practitioner research) — rejected by the
  owner; auditability is preserved by `.agents/journal/`, the hash-chained
  task evidence, and PR review itself.
- **Enforcement:** `prepare-commit-msg` hook strips attribution lines
  (best-effort); the integrity gate fails new commits containing them (CI +
  loop + pre-push); AGENTS.md Conventions states the rule.

## 2026-07-14 — Skills stay in .claude/skills/ (owner proposal declined on facts)

- **Decision:** Keep the shared skills directory at `.claude/skills/`.
- **Why:** Verified against official docs: Claude Code loads project skills
  ONLY from `.claude/skills/`; `.agents/skills/` is supported by Copilot CLI
  but NOT Claude Code (open request, anthropics/claude-code#31005). Moving
  would silently break every skill for Claude Code sessions.
- **Alternatives:** `.agents/skills/` (owner-preferred neutrality; Copilot-only
  today); dual directories (drift risk — rejected); symlink (undocumented,
  Windows-hostile — rejected).
- **Watch item:** if Claude Code ships `.agents/skills/` support, move then —
  one `git mv` + reference updates.

## 2026-07-14 — Branching modes: trunk (default) and integration

- **Decision:** `approvals.yaml` gains a `branching:` section. `trunk` =
  feature -> main via human-reviewed PR (unchanged default). `integration` =
  task branches auto-merge into `dev` on green gates-fast (generated
  integration-branch ruleset requires the check, no human review); a
  release-pr.yml workflow maintains one rolling "Release: dev -> main" PR;
  merging THAT stays human.
- **Why:** proven convention from the owner's dli-skills project — autonomous
  integration velocity with a single continuous human review surface; humans
  approve releases at their own pace instead of gating every task.
- **Alternatives:** trunk-only (slows agent-heavy work); merge queue on main
  (heavier setup, no staging surface).

## 2026-07-14 — Journal is a directory of per-session files

- **Decision:** `.agents/journal.md` (single shared append file) replaced by
  `.agents/journal/YYYYMMDD-<slug>.md` — one file per session/loop run; a
  session only writes its own file.
- **Why:** dli-skills finding: a shared journal file is the top merge-conflict
  source when parallel branches integrate; per-file ownership makes journal
  merges trivially conflict-free (prerequisite for integration mode).
- **Alternatives:** single file (conflicts); no journal (loses the audit
  narrative that replaced commit attribution).

## 2026-07-19 — Template machinery lives in .agentic/

- **Decision:** `harness/`, `presets/`, and all template documentation moved
  into a hidden `.agentic/` directory; `docs/` now belongs to the derivative
  project (README stub + adr/INDEX.md + designs/). `init` archives the
  template README and writes a project stub. `scripts/` shims stay put as the
  stable command interface, so every documented `./scripts/agentic` command
  is unchanged.
- **Why:** owner request — a derivative's root should foreground its own
  files, not template machinery. Doing it before project #1 means no
  derivative ever migrates.
- **Alternatives:** `.starter/` name (rejected — the machinery runs for the
  project's life, not just at start); keeping `harness/` visible (rejected —
  the decluttering was the point); hiding `scripts/` too (rejected — would
  churn every documented command for marginal gain).

## 2026-07-21 — Agent-driven instantiation is a committed runbook

- **Decision:** cross-repo instantiation (a session with the template and an
  empty target repo side by side creates the project itself) is specified by
  `.agentic/INSTANTIATE.md` — a step-by-step agent runbook using
  `git archive HEAD | tar -x` for the copy — plus a thin
  `instantiate-project` skill and README/getting-started pointers.
- **Why:** the machinery was already history-independent (integrity gate
  skips without origin/main, task chain starts at genesis), but every doc
  assumed the GitHub "Use this template" button; an agent improvising the
  copy risks dragging `.git/`, stale `dist/`, `node_modules/` into the
  derivative. `git archive` copies exactly the tracked tree.
- **Alternatives:** skill-only (invisible to Copilot CLI sessions and to
  agents whose cwd is the target repo); a harness `instantiate` command
  (needs the CLI built in the template first — a doc has no prerequisites);
  root-level INSTANTIATE.md (root belongs to the derivative post-init).

## 2026-07-21 — Derivatives own the root LICENSE; the template's notice moves down

- **Decision:** the template's MIT notice is duplicated at `.agentic/LICENSE`
  (covering the machinery shipped inside every derivative); the root LICENSE
  belongs to the derivative and is handled by `init --license
  mit|apache-2.0|proprietary|keep` (+ `--license-holder`), default `keep` —
  never silently rewritten or deleted. License texts ship as data in
  `.agentic/licenses/` (Apache text verbatim from apache.org; copyright goes
  in NOTICE per Apache convention). `init` gains a TTY-only wizard that
  prompts for missing flags with defaults; headless runs still hard-error.
- **Why:** every derivative inherited "MIT (c) Aaron Soto" verbatim — wrong
  holder, possibly wrong license; MIT requires the template notice to survive
  somewhere even when the derivative relicenses. TTY-gating the wizard keeps
  agents/CI/loop deadlock-free (agents are the primary operators).
- **Alternatives:** embedding license texts in init.ts (11 KB constant,
  unreviewable); prompting for approvals.yaml policy values too (rejected —
  trains owners to Enter past their own safety policy; the file is short and
  owner-reviewed); defaulting to proprietary (rejected — destructive guess).

## 2026-07-21 — Non-transferring GitHub settings get a script; residue gets init resets

- **Decision:** repo-level GitHub settings (auto-merge, squash-message
  default, Actions-create-PRs, rulesets, merge-method allowances, dev
  branch) are applied by `scripts/github-setup.sh` (gh api, idempotent,
  admin-checked, mode-aware, with solo-owner/private-plan/CODEOWNERS
  warnings) — docs keep the manual checklist as fallback. A three-agent
  adversarial audit drove companion fixes: init now also resets roadmap.md,
  the AGENTS.md identity section, package.json description/test script,
  removes the template-only instantiate-project skill, and seeds a license
  onboarding task; ci.yml listens to pull_request `edited` (kills the
  empty-commit body-scrub dance); release-pr.yml gained a concurrency
  group; bootstrap warns on missing/AI-sounding git identity; hooks resolve
  the repo root from subdirectories.
- **Why:** two live incidents (squash-trailer attribution, Actions PR-create
  denial) proved settings-as-content is a false assumption; the audit found
  the same class elsewhere plus template residue leaking into derivatives.
- **Alternatives:** documenting settings only (proven insufficient — the
  checklist existed and was still missed); a GitHub App applying settings
  (heavier, needs hosting); making --fresh implicit (deferred — changes
  documented semantics).

## 2026-07-21 — Configurable default branch, policy-derived integrity base, loop preflight

- **Decision:** three audit-deferred items shipped together. (1) `default_branch`
  is a `branching`-block field in approvals.yaml (default "main"); the main-branch
  ruleset ref and the default-branch push-ask rules derive from it, and the two
  push-ask rules are now DERIVED (removed from the shipped commands.ask) so a
  non-main repo can't get stale `main` globs. The ruleset file keeps the stable
  name main-branch.json. (2) The integrity base is derived by
  `resolveDefaultBase` (integration_branch in integration mode, else
  default_branch, then origin/HEAD, then origin/main) instead of the constant
  origin/main; `agentic status` surfaces the base and whether it resolves. (3)
  The loop runs a one-time preflight probe (writes a gitignored sentinel via the
  agent, AGENTIC_LOOP_PHASE=preflight) before iterating; failure throws a
  symptom-specific CliError (missing CLI / timeout / can't-edit) instead of
  burning max_consecutive_failures. Default on; `--skip-preflight` bypasses.
- **Why:** a non-main/non-origin derivative silently got zero branch protection,
  the wrong integrity base (or a silent skip of the whole anti-gaming layer),
  and three identical "no new commit" failures before surfacing a dead runner.
- **Alternatives:** rename the ruleset file to track the branch (rejected —
  cascades into github-setup.sh/docs for no gain); a new `preflight_failed`
  LoopState (rejected — throwing a CliError is lighter, no union/JSON change);
  keeping default_branch in agentic.config.json (rejected — branch policy lives
  with the branching block); merge-queue flag (deferred by owner until a real
  Team-plan queue exists — the required-check-without-a-queue deadlock makes it
  a footgun to ship speculatively). ci.yml/release-pr.yml keep literal branch
  names (owner-owned workflows; documented hand-edit for non-main defaults).

## 2026-07-21 — Agent commit identity is auto-set to the owner (deterministic)

- **Decision:** bootstrap.sh and init now SET git user.name/user.email to the
  repo owner (from approvals.yaml / --owner; name=handle,
  email=handle@users.noreply.github.com) when the current identity is unset,
  AI-looking (claude/copilot/anthropic/openai/gemini/cursor/aider/devin/bot),
  or a value this tooling set earlier that no longer matches the owner —
  tracked by a `agentic.identityAutoset` git-config marker so a human-chosen
  identity is never clobbered and the fresh-derivative case (bootstrap ran with
  the template's stale owner, then init sets the real one) self-corrects. The
  previous behavior was a non-blocking warning only.
- **Why:** owner review — the no-AI-attribution rule should be deterministic at
  the SOURCE (who authors the commit), not just prose. The environment's own
  stop-hook sets a `Claude <noreply@anthropic.com>` identity for a Verified
  badge; that conflicts with this repo's policy on the identity axis, and the
  repo can't edit an environment hook — so the repo instead fixes the identity
  it controls, at bootstrap/init.
- **Scope decision (owner):** the integrity gate was deliberately NOT extended
  to scan commit AUTHOR identity — GitHub squash-merge already re-attributes the
  squashed commit to the merging owner, so protected-branch history stays clean;
  the message/body attribution scan (existing) plus this source fix are enough.
- **Alternatives:** integrity gate fails on AI author identity (rejected by
  owner — redundant with squash relabeling, and would fight the env stop-hook on
  every branch commit); guessing a real email (rejected — handle-noreply is a
  safe, linkable-enough default the owner can override); prompting for identity
  (rejected — bootstrap/init stay non-interactive).
