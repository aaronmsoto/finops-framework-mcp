# Existing Agentic Starter Repos & Templates — Competitive Landscape (researched 2026-07-13)

Note: the task specified an output path of `undefined/research-templates.md`; since `undefined/` is a template-variable bug, this report was written to the session scratchpad instead.

## Findings

### 1. GitHub Spec Kit (github/spec-kit) — the 800-lb gorilla of spec-driven workflow

- **Scale & status (verified):** ~111–120k stars, MIT, v0.12.11 released 2026-07-10; supports **30+ agents** (Claude Code, Copilot, Cursor, Gemini CLI, Codex, Windsurf, Goose, …) as of v0.11.0 (June 2026). Sources: https://github.com/github/spec-kit, https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/
- **What it ships (verified via repo):** Python `specify` CLI that scaffolds a `.specify/` directory: templates, scripts, and a `memory/constitution.md` governance file; slash commands `/speckit.constitution → specify → plan → tasks → implement` (plus clarify/analyze/checklist); a customization hierarchy (project-local overrides → presets → extensions → core templates) and role-based "bundles" (`bundle.yml`). Pre-commit hooks and GitHub Actions in the repo itself, but **no runtime quality-gate system for the target project**.
- **Praise:** brand trust, agent-agnosticism, structured phases that give agents durable context instead of ad-hoc prompts; the constitution/memory idea is widely copied.
- **Criticism (verified):** repeatedly called heavyweight/greenfield-biased. Scott Logic and others describe "a sea of markdown documents, long agent run-times and unexpected friction" with no "qualitative benefit to justify the overhead"; users say it's "complete overkill" for tasks under ~2 days, and one GitHub discussion is literally titled "SpecKit creates the illusion of work, generating a bunch of text" (https://github.com/github/spec-kit/discussions/1784). Martin Fowler's site and Marmelab ("The Waterfall Strikes Back", Nov 2025) critique the review burden: reviewing generated specs + generated code doubles review time. Sources: https://marmelab.com/blog/2025/11/12/spec-driven-development-waterfall-strikes-back.html, https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html

### 2. davila7/claude-code-templates (aitmpl.com) — the component supermarket

- **What it is (verified):** CLI tool + web catalog for installing Claude Code components: 100+ agents, commands, settings, hooks, MCP configs, skills, plus usage analytics/monitoring dashboards. https://github.com/davila7/claude-code-templates
- **Praise:** breadth, one-command install, live analytics of Claude Code sessions.
- **Criticism (verified):** quality is uneven because it's a crowdsourced catalog. Independent skill reviews (Tessl registry) found skills with "unnecessary conceptual explanations", "no clear end-to-end workflow", and descriptions that "read like documentation titles rather than skill selectors" — i.e., poor trigger design. It's Claude-Code-only; nothing for Copilot CLI; no opinionated project structure, no quality gates, no memory beyond what individual components add.

### 3. BMAD-Method — multi-agent agile roles

- **What it is (verified):** ~49k stars, MIT. Agents mapped to agile roles (PM, Architect, Dev, QA); heavy upfront planning produces PRD + architecture docs, then a Scrum-master step shards work into self-contained "story files" carrying context to a dev agent. https://www.augmentcode.com/guides/bmad-method-ai-development
- **Praise:** story files are a genuinely good context-engineering pattern (each unit of work carries everything an agent needs); strong for greenfield products.
- **Criticism (verified):** highly prescriptive, document-forward; error propagation — "if the Architect agent hallucinates a flawed API structure, downstream agents build a broken system"; its quality gate is agents-reviewing-agents, exactly where error propagation bites; scored lower on developer experience than OpenSpec in independent comparisons (https://adsantos.medium.com/you-should-bmad-part-2-a007d28a084b).

### 4. obra/superpowers (Jesse Vincent) — the methodology-as-skills framework

- **What it is (verified):** composable skills enforcing a workflow: brainstorm → written design → TDD RED-GREEN-REFACTOR → two-stage adversarial code review with severity-blocking; distributed via its own plugin marketplace; accepted into the official Anthropic plugin marketplace Jan 2026; Superpowers 6 (June 2026) reworked dispatch and reportedly cut token costs ~60%. https://github.com/obra/superpowers, https://blog.fsck.com/2026/06/15/Superpowers-6/
- **Praise:** actually changes agent behavior (skills fire automatically); language-agnostic; TDD enforcement stops "spaghetti"; best-regarded methodology layer in the Claude ecosystem.
- **Criticism (verified):** token-hungry by design; measurably *more* tokens on simple tasks; "unsuitable for quick bug fixes, single-file scripts, throwaway prototypes"; community flags cognitive overhead of managing structured workflows + subagents (https://www.mejba.me/blog/superpowers-plugin-claude-code-review). Also: it's a plugin, not a repo template — no CI, no branch protection, no per-repo quality gates.

### 5. claude-flow → Ruflo (ruvnet) — swarm orchestration

- **What it is (verified):** the leading "agent meta-harness"; ~500k downloads, ~100k MAU claimed; rebuilt in Rust/WASM as Ruflo in early 2026; swarm coordination, adaptive memory, SPARC methodology, consensus algorithms (Raft/Byzantine/Gossip). https://github.com/ruvnet/ruflo
- **Criticism (verified/inference):** widely seen as enterprise-grade overkill — "brilliant for five agents on different files… for one agent fixing a bug it's massive overkill" (https://dev.to/stevengonsalvez/claude-flow-the-multi-agent-swarm-orchestrator-before-it-got-a-new-name-4kd4). Historically also dogged by skepticism about self-reported benchmark claims (inference from community threads; treat as unverified).

### 6. The loop-harness lineage: Ralph Wiggum → official Anthropic plugin

- **Verified:** Geoffrey Huntley's Ralph technique (July 2025) — a stateless bash loop re-feeding one prompt; progress persists in files/git, not context. **Anthropic shipped an official `ralph-wiggum` plugin (Dec 2025)** implemented as a Stop-hook that blocks exit and re-injects the prompt: https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum and `ralph-loop` in https://github.com/anthropics/claude-plugins-official. 2026 commentary ("Every AI coding harness is just a Ralph loop") converges on the need for a deterministic supervisor — a "Principal Skinner" control plane with back-pressure/quality gates around the loop (https://blog.sondera.ai/p/ralph-wiggum-principal-skinner-agent-reliability).
- **Gap:** the official plugin is the loop only — no gate system, no budget/stop conditions beyond max iterations, no cross-tool support.

### 7. Smaller/adjacent players (one-line each)

- **hesreallyhim/awesome-claude-code** (~37k stars): canonical curated list; a discovery layer, not a template. https://github.com/hesreallyhim/awesome-claude-code
- **steipete/agent-rules**: popular rules collection, **archived read-only 2025-12-31** — evidence that static rule dumps go stale fast. https://github.com/steipete/agent-rules
- **steveyegge/beads** (~18.7k stars, v0.59 Mar 2026): git-backed graph issue tracker as agent memory; solves the "50 First Dates" problem; hash-based IDs for multi-agent merge safety. The strongest memory-layer competitor/complement. https://github.com/steveyegge/beads
- **htekdev/copilot-ci-pipeline + copilot-instructions-starter**: rare Copilot-side templates with pre-commit gates, merge-blocking CI, and agent-dispatch auto-fix loops. https://github.com/htekdev/copilot-ci-pipeline
- **KbWen/agentic-os**: AGENTS.md-based plan/build/review/test/ship gates with "evidence required" semantics across Claude/Codex/Cursor/Copilot. https://github.com/KbWen/agentic-os
- **zbruhnke/claude-code-starter, scotthavird/claude-code-template**: solid single-tool starters (stack presets, security hooks, subagents, devcontainer w/ egress firewall) but Claude-only and no loop harness.
- **AGENTS.md convention (verified):** read natively by 30+ tools, 60k+ repos, now under the Agentic AI Foundation (Linux Foundation). GitHub's own study of 2,500+ repos: files over ~150 lines give diminishing returns and can raise inference cost 20–23%. https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/
- **Copilot CLI convergence (verified, April 2026):** Copilot now reads AGENTS.md, `.agent.md` custom agents, and **SKILL.md skills from `.github/skills`, `.claude/skills`, or `.agents/skills`** — the same SKILL.md format as Claude Code. https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills

## Best practices observed

1. **Single source of truth, multi-tool projection.** The winners are agent-agnostic (Spec Kit's 30+ agents; AGENTS.md's 30+ tools). Duplicate-file drift (CLAUDE.md vs copilot-instructions.md) is the top failure mode of smaller starters.
2. **Progress lives in files and git, not context.** Ralph loop, Beads, BMAD story files, Spec Kit's `.specify/memory` all converge here.
3. **Skills > rule dumps.** steipete/agent-rules (static markdown) is archived; superpowers (behavior-triggering skills) got into the official marketplace. Trigger-quality of skill descriptions matters (davila7 criticism).
4. **Right-size the ceremony.** The #1 recurring criticism across Spec Kit, BMAD, and superpowers is fixed heavyweight process applied to small tasks. Nobody ships a good "effort dial."
5. **Deterministic gates around a stochastic loop.** The 2026 consensus (Sondera, codecentric, LinearB): the loop is trivial; the value is the harness — back-pressure, budgets, stop conditions, and gates the agent cannot self-certify.
6. **Keep root instruction files under ~150 lines** and link out (GitHub's 2,500-repo study).

## Implications for the starter repo

**What no one ships together — our wedge (inference, from verified gaps above):**

1. **Dual-first-class support for Claude Code AND Copilot CLI** from one config source. Now technically easy: shared AGENTS.md + shared `.agents/skills/` SKILL.md folder + thin per-tool shims (CLAUDE.md pointer, `.agent.md` files). Almost every competitor is single-ecosystem; htekdev's Copilot templates and the Claude starters don't overlap.
2. **A supervised loop harness, not just a loop.** Anthropic's ralph-wiggum proves demand but is gate-free and Claude-only. Ship the Node/TS "Principal Skinner": iteration budget, cost/time caps, gate-check between iterations, structured stop conditions, resumable state file — and make it drive either CLI.
3. **Deterministic, language-agnostic quality gates with adapter presets.** Spec Kit/BMAD/superpowers all rely on agents judging agents (the exact error-propagation criticism). A `gates.yaml` mapping abstract gates (lint/typecheck/test/coverage/security) to per-stack commands, enforced by the harness and mirrored in CI, is genuinely differentiated. htekdev/copilot-ci-pipeline is the closest prior art — study its merge-blocking + agent auto-fix loop.
4. **An effort dial.** Explicit small/medium/large task modes (skip spec phase for small; full spec→plan→implement for large) directly answers the universal "overkill" criticism of Spec Kit/BMAD/superpowers.
5. **Memory that is git-native and merge-safe.** Don't reinvent Beads; either integrate it optionally or ship a lighter journal + decisions log in-repo, with hash-safe IDs if multi-session. Spec Kit's constitution.md pattern (persistent principles file the agent must consult) is worth adopting wholesale.
6. **Configurable human approval points** (merge-to-main, deploy) are absent from every template surveyed except as implicit branch protection; making them a declared, harness-enforced config is novel.
7. **Ship curated few, not catalog many.** davila7's breadth-without-QA criticism argues for ~6-10 excellent skills/commands with sharp trigger descriptions, not 100.

## Sources

- https://github.com/github/spec-kit
- https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/
- https://github.com/github/spec-kit/discussions/1784
- https://marmelab.com/blog/2025/11/12/spec-driven-development-waterfall-strikes-back.html
- https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html
- https://codemyspec.com/blog/openspec-vs-spec-kit
- https://github.com/davila7/claude-code-templates
- https://tessl.io/registry/skills/github/davila7/claude-code-templates/remotion/review
- https://www.augmentcode.com/guides/bmad-method-ai-development
- https://adsantos.medium.com/you-should-bmad-part-2-a007d28a084b
- https://github.com/obra/superpowers
- https://blog.fsck.com/2025/10/09/superpowers/
- https://blog.fsck.com/2026/06/15/Superpowers-6/
- https://www.mejba.me/blog/superpowers-plugin-claude-code-review
- https://github.com/ruvnet/ruflo
- https://dev.to/stevengonsalvez/claude-flow-the-multi-agent-swarm-orchestrator-before-it-got-a-new-name-4kd4
- https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum
- https://github.com/anthropics/claude-plugins-official
- https://blog.sondera.ai/p/ralph-wiggum-principal-skinner-agent-reliability
- https://www.codecentric.de/en/knowledge-hub/blog/the-ralph-wiggum-loop-autonomous-code-generation-with-a-fresh-context
- https://github.com/hesreallyhim/awesome-claude-code
- https://github.com/steipete/agent-rules
- https://github.com/steveyegge/beads
- https://steve-yegge.medium.com/introducing-beads-a-coding-agent-memory-system-637d7d92514a
- https://github.com/htekdev/copilot-ci-pipeline
- https://github.com/htekdev/copilot-instructions-starter
- https://github.com/KbWen/agentic-os
- https://github.com/zbruhnke/claude-code-starter
- https://github.com/scotthavird/claude-code-template
- https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/
- https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills
- https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli
- https://github.com/agentsmd/agents.md
