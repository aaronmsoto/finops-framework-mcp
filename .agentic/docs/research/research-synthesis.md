# Agentic Starter Repo — Research Synthesis

Synthesis date: 2026-07-13. Consolidates seven independently verified dimension reports (claude-code, copilot-cli, memory, loops, gates, templates, quality). Where verification refuted or corrected a dimension claim, this synthesis uses the corrected fact and flags it in "Corrections & uncertainties." Note: the assigned output path contained a literal `undefined`; this file lives in the session scratchpad alongside the dimension reports.

## Executive summary

The research converges on a clear thesis: **the individual pieces of a world-class agentic starter repo are all proven and documented, but nobody ships them together.** The wedge is the combination — dual first-class Claude Code + Copilot CLI support from a single config source, a supervised autonomous loop with deterministic quality gates, declared human approval points compiled into every enforcement surface, and a git-native memory system — with an effort dial to avoid the "heavyweight ceremony" criticism that dogs every existing template (Spec Kit, BMAD, superpowers).

The cross-tool story is now officially sanctioned by both vendors: **AGENTS.md is the single source of truth** (Linux Foundation-stewarded, 60k+ repos, read natively by Copilot CLI), and Anthropic's own docs prescribe a CLAUDE.md shim containing `@AGENTS.md`. Both CLIs speak the same SKILL.md skills format (Copilot since Dec 2025 — corrected from "April 2026"), both are MCP clients, and — correcting a refuted assumption — **both offer structured JSON output and session resume in headless mode**, so one Node/TS runner interface can drive either with parsed results.

The loop design is the refined Ralph pattern: fresh agent process per iteration, deterministic file preamble, one task per iteration sized to one context window, one commit per task, state in git plus a tamper-resistant JSON task list. All stop conditions live in the harness (Anthropic's official ralph-wiggum plugin defaults to **unlimited** iterations — corrected — so the harness must enforce its own caps). Quality gates are named commands in one config, executed identically by the agent's inner loop, hooks, and CI; diff coverage via diff-cover makes the coverage gate language-agnostic. Reward hacking (test tampering, verifier gaming) is a confirmed phenomenon — though the widely-cited "36–75%" rate did not survive verification — countered by an integrity gate, CODEOWNERS on tests and workflows, and an independent fresh-context verifier.

Human approval points get a single `approvals.yaml` compiled into `.claude/settings.json` ask/deny rules (ask rules survive bypassPermissions — load-bearing verified fact), Copilot CLI `--deny-tool` flags (Copilot has no repo-committed permissions file), GitHub ruleset JSON, CODEOWNERS, and Environment config. On memory: **RuVector/AgentDB is not a safe dependency** (76 stars, 14 commits, no releases, self-reported benchmarks, ecosystem churn); the recommendation is a repo-local budgeted markdown memory bank as the default, with beads as the recommended opt-in for task-graph state and vector/MCP indexes strictly as derived, off-by-default caches.

## The landscape (what exists, what's missing — why this repo is worth building)

Five camps exist, and each covers a slice:

1. **GitHub Spec Kit** (~120k stars) owns spec-driven workflow across 30+ agents, but the best field test (Scott Logic, Nov 2025) measured ~4 hours and one shipped bug via Spec Kit versus ~32 minutes and zero bugs with lightweight iteration ("ten times faster without SDD" — corrected from "~23 minutes," substance intact). Its own community calls it "the illusion of work" for small tasks (discussion #1784). No runtime quality gates.
2. **davila7/claude-code-templates** is a broad catalog with uneven, poorly-triggered skills — breadth without QA — and is Claude-only.
3. **BMAD** (~50.5k stars) contributes the "story file" context pattern but suffers error propagation and agents-reviewing-agents QA.
4. **obra/superpowers** is the best methodology layer (TDD + adversarial review skills; in the official Anthropic marketplace since Jan 2026) but ships no repo scaffolding, CI, gates, or memory. (The "measurably higher token use on simple tasks" criticism did not verify — treat as plausible, not measured.)
5. **The loop lineage** culminated in Anthropic's official ralph-wiggum plugin: a bare Stop-hook loop with a crude completion-promise exit and an iteration cap that **defaults to unlimited** — no gates, budgets, or supervision.

Adjacent: beads (25.3k stars, Dolt-backed, dual-tool) solves task memory; htekdev/copilot-ci-pipeline is the closest prior art for merge-blocking gates + agent auto-fix on the Copilot side; steipete/agent-rules (archived May 2026) is the cautionary tale that static rule dumps die.

**Nobody combines**: a supervised loop harness with deterministic gates; dual Claude/Copilot support from one config source; an effort dial; declared, harness-enforced human approval points; and merge-safe git-native memory. That combination — with each piece individually verified as best practice — is the repo's reason to exist.

## Cross-tool architecture (one repo serving Claude Code + Copilot CLI)

**Instruction files — the settled answer:**

- `AGENTS.md` at repo root is the canonical instruction file: project layout, build/test/lint commands, quality-gate invocation, approval-point conventions, memory-file locations. Keep it short (~150 lines) and link out — the "short root file" guidance is real, but note the oft-cited "GitHub 2,500-repo study found 150 lines / 20–23% cost" attribution is wrong: the cost/benefit numbers come from the ETH Zurich study (Gloaguen et al., Feb 2026); GitHub's blog analyzed the 2,500 files but published neither number.
- `CLAUDE.md` is a 3-line shim: `@AGENTS.md` plus a short "## Claude Code" section. Use the import, never a symlink (Windows symlinks need admin/Developer Mode — Anthropic's docs say so explicitly). Note imports organize but do not save tokens; the imported file still loads at launch, so the combined always-loaded budget (~200 lines per Anthropic guidance) covers AGENTS.md + shim.
- **One unresolved wrinkle (verification downgraded this to uncertain):** GitHub's docs introduce CLAUDE.md support with "Alternatively," and do not specify behavior when AGENTS.md and CLAUDE.md coexist at root. Design defensively: keep the Claude-specific shim section tiny and harmless if Copilot reads it, and add an empirical smoke test to the repo's own CI checklist. Do not put Copilot-relevant content only in CLAUDE.md.
- Do **not** duplicate content into `.github/copilot-instructions.md` (Copilot loads it additively with AGENTS.md); reserve it for genuinely Copilot-only guidance, or omit it.
- Path-scoped rules split by format: Copilot uses `.github/instructions/*.instructions.md` with `applyTo` globs; Claude Code uses `.claude/rules/*.md` with `paths:` frontmatter. Keep these minimal and ship a drift-lint (CI check that the two stay in sync) rather than a generator.

**Skills:** one shared skills directory. Copilot CLI reads SKILL.md from `.github/skills`, `.claude/skills`, or `.agents/skills` (Agent Skills open standard, shared with Claude Code — supported since **Dec 18, 2025**, corrected from April 2026). Use `.claude/skills/` as the physical location since both tools read it, or `.agents/skills/` for neutrality. Ship ~6–10 excellently-triggered skills, not a catalog: side-effectful ones (`/ship`, `/deploy`) with `disable-model-invocation: true`; a `/verify` skill requiring evidence (test output, screenshots) before completion; background-knowledge skills as `user-invocable: false`.

**Runner interface (corrected upward):** abstract an "agent runner" in the Node/TS harness. Claude Code: `claude -p --output-format stream-json --allowedTools ... --max-turns N`. Copilot CLI: `copilot -p "..." --output-format json -s --no-ask-user --allow-tool=<list> --deny-tool=<protected>` — the earlier assumption that Copilot lacks structured output and session resume was **refuted**: it documents `--output-format json` (JSONL) plus `--continue`/`-r`/`--session-id`. Both runners can therefore parse structured events and resume sessions; git diff/exit state remains the fallback truth signal.

**Trust and enterprise realities:** a cloned template cannot pre-approve itself — Claude Code's workspace-trust dialog gates project hooks, permissions, skill `allowed-tools`, and `.mcp.json` approvals (deny/ask rules apply even without trust; allow rules don't). Copilot CLI may be enterprise-gated (enablement policy, model restrictions, registry-based MCP allowlists since April 2026). Therefore: quality gates and memory must be plain shell commands and committed files; MCP servers are optional enhancements, never load-bearing; document the one-time trust-onboarding step instead of fighting it — it's a security selling point.

## The development loop (recommended loop design, stop conditions, anti-drift, anti-reward-hacking)

**Shape:** the refined Ralph pattern, supervised ("Principal Skinner" around the Wiggum loop). Fresh agent process per iteration — never a long-lived session — with a deterministic file preamble: per-mode prompt (`prompts/plan.md` / `prompts/build.md`), `specs/`, `AGENTS.md`. Every serious 2025–2026 implementation (Huntley's original, snarktank/ralph, Anthropic's harness research, HumanLayer ACE-FCA) converged here; durable file artifacts beat compaction.

**State:** a **JSON task/feature list with per-item pass/fail** (Anthropic verified verbatim: models tamper with JSON less than Markdown), an append-only progress journal, and one git commit per completed task. Load-bearing rules: one task per iteration, sized to one context window; plans are disposable — regenerate rather than patch a drifting plan.

**Two-phase agents (Anthropic pattern):** an initializer agent (scaffold env, generate the JSON task list from specs, write `init.sh`) and iterating agents that must read progress + git log, run baseline verification, select ONE task, and **verify by running the software** — not code inspection — before flipping an item to passing (Anthropic found agents declare victory from inspection alone otherwise).

**Stop conditions live in the harness, not the prompt.** This is where a correction bites twice: (a) the official ralph-wiggum plugin's `--max-iterations` **defaults to unlimited** — it is recommended, not enforced — so our harness must make iteration/cost/wall-clock caps mandatory defaults; (b) the "June 2026 loop-engineering consensus" (kill-switch-outside-the-loop, exit-code stop conditions, the 43-commit PR-babysitter failure) was **misattributed to Addy Osmani's essay**, which contains none of those specifics. The design advice still stands — it is independently supported by Anthropic's harness article and the ralph-wiggum README's own caveats — but we present it as our synthesis, not as cited consensus. Three terminal states: success (all task items passing AND gates green, checked by exit codes), budget-exhausted, and **blocked** (agent writes a blocker report after N failed iterations — the escape hatch the ralph-wiggum README recommends, since its completion-promise can only encode self-certified success).

**Anti-reward-hacking:** the phenomenon is confirmed (SpecBench documents verifier gaming, with validation-vs-held-out gaps growing ~27–28pp per 10x LOC and worst cases like a fake compiler scoring 97% visible / 0% held-out), but the "36–75% initial hack rates" figure did not verify against its citation — we drop the number and keep the defenses: prompt prohibitions twinned with deterministic checks; the harness diffs each iteration for deleted/weakened tests and routes those to a human approval point; an independent fresh-context verifier (committed read-only reviewer subagent, `.claude/agents/reviewer.md`) so the writer never grades its own work. Default to single agent + independent verifier; planner/implementer/reviewer multi-agent splits stay optional presets — even Anthropic lists specialist multi-agent as an open question.

**Effort dial:** spec→plan→tasks as lightweight optional templates with a human spec-validation checkpoint (HumanLayer lesson: bad specs industrialize bad code), skippable for small tasks. This directly answers the universal "overkill" criticism, backed by the Scott Logic ~10x measurement.

**Stop-hook nuance for in-session gating:** Claude Code force-overrides a Stop hook after 8 consecutive blocks without progress — the harness must treat "gave up" as a loop outcome, not assume the gate held.

## Quality & verification harness (gate stack, adapter design)

**Gates as data, executed identically in three places.** One quality config defines named gates — `gate:format`, `gate:lint`, `gate:typecheck`, `gate:test`, `gate:coverage`, `gate:integrity`, `gate:security` — and language presets (TS: eslint + tsc + vitest/c8 → LCOV; Python: ruff + pyright + pytest/coverage.py → Cobertura) only bind names to invocations and declare their coverage output format. The agent inner loop (backpressure: no commit until green), local pre-push hooks, and CI all call the same gate names, so "green locally" predicts "green in CI." Claude Code gets an additive deterministic layer: a Stop hook that exits 2 until gates pass, a PostToolUse formatter, and PreToolUse deny hooks for protected actions; Copilot CLI and CI share the plain scripts.

**Coverage:** diff coverage plus a ratchet, not a fixed global number. diff-cover consumes Cobertura/Clover/JaCoCo/LCOV (verified), so one tool enforces the gate across languages; a ~30-line generic ratchet stores the high-water mark in-repo and fails CI on decrease.

**CI structure:** two tiers behind a GitHub merge queue. Tier 1 (<5 min, every push): format/lint/typecheck/unit/diff-coverage/gitleaks/Semgrep/dependency audit. Tier 2 (`merge_group` event, tests the tentative merge commit): integration/E2E/build, with batching for agent-PR volume. CI must trigger on `merge_group` or required checks never report in the queue — a documented setup trap.

**Mutation testing (conflict resolved):** the quality report recommended nightly-only; verification showed its own source argues the opposite — nightly results get ignored, and the guidance favors **diff-scoped mutation on PRs** plus scheduled full-scope runs. Opinionated resolution: ship mutation testing (Stryker/mutmut per preset) as an opt-in gate configured diff-scoped for PRs where the toolchain supports incremental analysis, with a full-scope scheduled run and score threshold; it remains off by default because it's the most expensive gate, but when enabled it runs where the feedback is actionable. It is the gate that measures assertion quality (complementary to, not a substitute for, coverage).

**`gate:integrity` (anti-gaming):** fail or flag deleted test files, decreased test counts, `.only`/`.skip`-style focus markers, and implementation PRs that also edit `tests/**` or the gate config (label-overridable — flag-for-review beats hard-forbid, which breaks TDD); CODEOWNERS template covering `tests/**`, `.github/workflows/**`, and the quality config. Pair every advisory AGENTS.md rule with a deterministic twin.

**LLM review:** an advisory layer, never a sole required check — Anthropic's own Claude Code Review completes neutral by design, exposing a parseable `bughunter-severity` JSON your CI may optionally gate on. Ship off-by-default workflows (claude-code-action, Copilot review) with pinned versions and minimal token permissions: these actions are prompt-injection attack surface (claude-code-action repo-hijack flaw fixed v1.0.94; Microsoft-reported secret exposure mitigated in Claude Code 2.1.128 — both verified against primary sources).

**Releases:** changesets (TS preset) / changelog-fragment convention (others) + commitlint; releases always behind a human-approved version-bump bot PR. Avoid semantic-release — it hands agents direct release authority, contradicting the approval-points design.

## Human approval gates (default-on gates, single-source owner policy config)

The industry default is unambiguous: **agent proposes, human merges.** GitHub hard-codes it for its own agent (Copilot cannot approve/merge its own PRs; the initiating user's approval doesn't count; Actions on agent pushes need a human "Approve and run workflows" click by default).

**The differentiating deliverable: one `approvals.yaml`** declaring all approval points — `merge_to_main: human`, `deploy_production: human`, `force_push: never`, `protected_paths`, forbidden actions, `agent_max_iterations` — plus a `gates:apply` script that compiles it into every enforcement surface. No cross-tool standard exists (verified absence), so this generator is genuinely novel:

- **Claude Code:** `.claude/settings.json` `ask` rules for `git push`/`gh pr merge`/deploy commands (verified load-bearing fact: **explicit ask rules survive bypassPermissions mode**), `deny` rules for secrets reads and destructive commands (deny/ask apply even before workspace trust), plus a PreToolUse hook (exit 2 blocks before permission evaluation).
- **Copilot CLI:** a wrapper emitting `--allow-tool`/`--deny-tool` flags (deny always beats allow, even under `--allow-all`) — necessary because Copilot has **no repo-committed permissions file**; team policy flows through the wrapper.
- **GitHub:** ruleset JSON (rulesets export/import as JSON — the machine-readable, versionable artifact; note exported JSON excludes the bypass list) requiring PRs to main with 1 human review + status checks, blocking force-push/deletion; commented CODEOWNERS; a `production` Environment template with required-reviewer placeholder and prevent-self-review (secrets withheld until approval — the only GitHub-native gate that keeps agent workflows away from production credentials). Document the plan caveat: required reviewers on private repos need Enterprise.

**Audit trail:** a `prepare-commit-msg` git hook injecting agent-attribution trailers so attribution holds even when the agent forgets, enabling policies keyed on agent-authored commits.

**Progressive autonomy:** three named harness presets — `supervised` (plan/default mode), `guarded` (allowlist + hooks, human merge), `autonomous-contained` (bypass/`--yolo` permitted only when a container/sandbox is detected) — with per-session denial/override counts logged to memory as promotion evidence, and loop halt after N denials (mirroring Anthropic's auto-mode counters).

**Scaffolded but default-off:** merge queue config, 2-reviewer rule for agent PRs, and an auto-merge helper that polls until all PR requirements are met before enabling auto-merge — required since GitHub's 2026-03-25 behavior change, but (correction) that change is an **acknowledged, unfixed bug**, not policy; the helper should tolerate GitHub restoring arm-in-advance behavior.

## Memory system options

Coding-agent memory decomposes into three problems: (1) durable project knowledge, (2) cross-session task state, (3) recall over large histories. The options below map to that decomposition. The owner asked specifically about RuVector — assessed as option 4.

### Option 1 — Repo-local markdown memory bank (RECOMMENDED)

`.agents/memory/` with a budgeted `MEMORY.md` (~200 lines), `decisions.md`, `patterns.md`, `activeContext.md`; referenced from AGENTS.md; read-at-session-start and update-before-finish enforced via Claude Code hooks (SessionStart/Stop) and prompt protocol for Copilot CLI. Memory hygiene becomes a quality gate: the harness lints memory-file size and staleness.

**Why recommended:** it is the only option that works for both tools with zero infrastructure, travels through git to teammates/CI/other machines, and is PR-reviewable — memory as a first-class auditable artifact. It matches the platform's own direction (Claude Code's native memory is entirely markdown-file-based, with the same ~200-line budget) and the 2025–2026 practitioner evidence: file-based memory is the standard, and Letta's plain-filesystem approach beat Mem0's graph on LoCoMo (74% vs 68.5%). (Correction absorbed: the voxos.ai source supports the file-first thesis but does not mention Manus/OpenClaw — those examples are dropped.) Coexistence with Claude Code's machine-local auto memory (`~/.claude/projects/<project>/memory/`) must be documented explicitly: auto memory is the agent's private scratch; the committed bank is the shared, reviewed record.

**Tradeoffs:** solves knowledge memory only — weak for long-horizon task state (that's option 2) and for recall at large scale (option 3); depends on enforced curation discipline, which is why the hygiene gate exists.

### Option 2 — beads task-graph memory (recommended opt-in, off by default)

steveyegge/beads v1.1.0 (2026-07-04), 25.3k stars, 93 releases; a dependency-aware issue graph, now **Dolt-backed** (version-controlled SQL with cell-level merge; `.beads/issues.jsonl` is interchange, not source of truth — corrected from "git-backed JSONL"), synced via git remotes, with `bd setup claude` and `bd setup copilot` shipping first-party integrations for exactly our two tools.

**Tradeoffs:** the most mature solution to the one failure mode files don't cover (task amnesia across long horizons), but it requires a Go binary and adds a real dependency — gate behind an opt-in setup script. "De facto agent memory layer" is popularity, not proof; still comfortably the strongest option in its category.

### Option 3 — MCP / embedded vector index as a derived cache (off-by-default preset)

Simplest: `@modelcontextprotocol/server-memory` via npx (both tools are MCP clients). At scale: a local hybrid index (sqlite-vec or LanceDB) built **over** the markdown memory files — always a rebuildable derived cache, never source of truth (the emerging hybrid pattern, e.g. zilliztech/memsearch).

**Tradeoffs:** earns its keep only on large/long-lived projects; MCP may be disabled or allowlist-blocked in enterprise environments, so nothing can depend on it; the official memory server's flat JSON diffs poorly in git. Hosted platforms (Mem0/Zep/Letta, $19–$104+/mo entry tiers) are optimized for conversational personalization, not repo knowledge — excluded.

### Option 4 — RuVector / AgentDB (NOT recommended now; watch item)

The owner asked. RuVector-the-engine is real and fast-moving (~4.3k stars, ruvector-core 2.3.0 released 2026-07-12, Rust HNSW/SIMD). But the agent-memory product **AgentDB is immature: 76 stars, 14 commits, zero GitHub releases, and its headline "+36% search quality" is self-reported** (all verified exactly). The surrounding ecosystem churns hard — claude-flow renamed to Ruflo with a Rust-core rework within a year (correction: Rust powers the core engine; the codebase is still ~84% TypeScript, not a full rewrite) — and production evidence is anecdotal.

**Tradeoffs:** a template meant to work unattended cannot pin a dependency with no releases and a rename-and-rewrite track record. Its single-file `.rvf` + npm-install architecture would slot cleanly into option 3's tier if it stabilizes. Revisit in 6–12 months; document as a watch item in the repo.

## Design principles for the starter repo

1. **One source of truth, per-tool shims.** AGENTS.md is canonical with a 3-line `@AGENTS.md` CLAUDE.md shim, because duplicate-file drift is the top failure mode of existing dual-tool starters and both vendors officially sanction this exact bridge.
2. **Advisory prose gets a deterministic twin.** Every rule that matters ships as instruction text plus a hook, permission rule, or CI check, because instruction files are delivered as advisory context with no compliance guarantee — Anthropic says so verbatim.
3. **Stop conditions live in the harness, never the prompt.** Iteration, cost, and wall-clock caps are mandatory harness defaults with a third "blocked" terminal state, because even Anthropic's official loop plugin defaults to unlimited iterations and completion-promises can only encode self-certified success.
4. **Fresh context per iteration; state in files and git.** One task per iteration sized to one context window, one commit per task, a tamper-resistant JSON task list, because every credible 2025–2026 loop implementation independently converged on exactly this and compaction alone verifiably fails.
5. **The writer never grades its own work.** An independent fresh-context verifier (subagent or CI) must say yes before any done-flag flips, because agents demonstrably declare victory from code inspection and game visible verifiers.
6. **Gates are data, run identically everywhere.** Named gate commands in one config, called by the agent loop, pre-push hooks, and CI alike, so "green locally" predicts "green in CI" and language support is one preset file (diff-cover's multi-format input makes coverage language-agnostic).
7. **Approval points are compiled, not documented.** A single approvals.yaml generates Claude ask/deny rules, Copilot deny-flags, ruleset JSON, CODEOWNERS, and Environment config, because no cross-tool enforcement standard exists and Copilot has no repo-committed permissions file.
8. **Deny and ask beat allow everywhere.** Policy is narrow denies/asks over broad allows — Claude ask rules survive bypassPermissions and Copilot deny beats --allow-all — so human approval points hold even in YOLO modes.
9. **Ship an effort dial.** Small tasks skip spec/plan ceremony; large ones get the artifact chain with a human spec checkpoint, because "heavyweight process on small tasks" is the universal, measured (~10x) criticism of every incumbent template.
10. **Memory is a reviewable git artifact with a budget.** Curated markdown (~200 lines always-loaded) committed and diffed in PRs, with size/staleness linted as a gate, because file-first memory beats vector stores for project knowledge and unbudgeted memory rots.
11. **Zero-infrastructure core; everything else optional.** Gates, memory, and the loop must work as plain shell commands and committed files, because enterprise policy can disable MCP, restrict models, and gate CLI enablement — and a template cannot pre-approve its own trust.
12. **Few, sharp, curated components.** ~6–10 excellently-triggered skills and a handful of gates rather than a catalog, because breadth-without-QA (davila7) and static rule dumps (agent-rules, archived) demonstrably fail.

## Corrections & uncertainties

Refuted or corrected claims and their design impact:

1. **Copilot CLI has structured output and session resume** (refuted the "no JSON/no resume" claim): `--output-format json` (JSONL) and `--continue`/`-r`/`--session-id` are documented. Impact: the runner interface parses structured events from both CLIs instead of relying solely on git/filesystem effects — a strictly better harness design.
2. **Copilot's handling of a root CLAUDE.md alongside AGENTS.md is unverified** (downgraded to uncertain): the docs say "Alternatively," and don't define coexistence behavior. Impact: never put Copilot-relevant content only in CLAUDE.md; keep the shim's Claude section tiny; add an empirical smoke test.
3. **The Osmani "loop engineering consensus" was partly fabricated in the dimension report** (refuted): no kill-switch/exit-code/43-commit content in that essay. Impact: harness-level stop conditions remain the design (independently supported by Anthropic's harness article and ralph-wiggum's own docs) but are presented as our synthesis, not cited consensus.
4. **ralph-wiggum's --max-iterations is not mandatory** (refuted): default is unlimited. Impact: our harness enforces its own mandatory caps and never assumes upstream loop tooling is safe.
5. **The "36–75% reward-hacking rate" is unsupported by its citation** (refuted): SpecBench measures validation-vs-held-out gaps (~27–28pp per 10x LOC), not incidence rates. Impact: keep all mitigations (phenomenon confirmed), drop the number unless re-sourced.
6. **Copilot Agent Skills support shipped Dec 18, 2025**, not April 2026 (refuted date); April 2026 was the `gh skill` command. Impact: none architectural; cite correctly. The `.agent.md` custom-agent filename detail remains unverified — confirm before shipping generated agent shims.
7. **The 150-line/20–23% AGENTS.md numbers come from the ETH Zurich study, not GitHub's 2,500-repo analysis** (refuted attribution). Impact: guidance stands; citation fixed. The ETH finding that LLM-generated context files can reduce task success also argues for a human-curated, minimal AGENTS.md over auto-generation.
8. **beads is Dolt-backed, 25.3k stars** (corrected from git-backed-JSONL, 18.7k): merge-safety claim holds via Dolt cell-level merge; JSONL is interchange only. agent-rules archived May 2026, not Dec 2025.
9. **superpowers "higher token use on simple tasks" is unverified**; its v6 release claims the opposite direction. Impact: don't cite it as measured; the "no scaffolding/CI/gates" gap analysis stands.
10. **Mutation-testing cadence conflict resolved against the dimension report**: the cited source recommends diff-scoped per-PR mutation plus scheduled full runs, criticizing nightly-only. Impact: preset configured diff-scoped, opt-in.
11. **The auto-merge 2026-03-25 change is an acknowledged unfixed GitHub bug**, not intentional (still reproducing as of May 2026). Impact: the auto-merge helper polls-then-enables but tolerates a reversion.
12. **Scott Logic comparison: ~32 minutes, not ~23** for the iterative baseline. Impact: the ~10x conclusion stands.
13. **Ruflo is not a full Rust rewrite** (~84% TypeScript; Rust core engine). Impact: none — churn assessment unchanged.
14. **Minor source corrections:** the voxos.ai article doesn't mention Manus/OpenClaw (dropped); Copilot AGENTS.md/CLAUDE.md support mis-cited to a Jan 2026 changelog (docs page is the source); Qdrant-in-OpenMemory detail from its repo, not the blog; Huntley's file is AGENT.md singular; his $50k/$297 figure is third-hand testimony.
15. **Unverified, flagged:** the June 2026 report that `claude -p`/Agent SDK draws from subscription limits (billing) — verify before the harness documentation depends on it.

## Sources (consolidated)

**Official Anthropic / Claude Code:** code.claude.com/docs/en/{memory, hooks, hooks-guide, skills, mcp, settings, permissions, best-practices, cli-reference, github-actions, plugins-reference, sub-agents, checkpointing, headless, code-review}; anthropic.com/engineering/{effective-harnesses-for-long-running-agents, building-agents-with-the-claude-agent-sdk, claude-code-auto-mode, claude-code-sandboxing}; github.com/anthropics/{claude-code-action, claude-plugins-official, claude-code (ralph-wiggum plugin, issues #23084/#15047), claude-code-security-review, claude-plugins-official PR #148}.

**Official GitHub / Copilot:** docs.github.com — Copilot CLI custom-instructions, add-skills, programmatic reference, command reference, allowing-tools, configure, autopilot, administer-for-enterprise, MCP allowlist enforcement; coding-agent reviewing-PRs and risks-and-mitigations; rulesets (about/creating/managing), merge queue, deployments-and-environments; github.blog changelogs (Copilot CLI GA 2026-02-25, gh-copilot deprecation 2025-09-25, gh forwarding 2026-01-21, Agent Skills 2025-12-18, gh skill 2026-04-16, MCP allowlists 2026-04-16, coding-agent Actions opt-out 2026-03-13, AGENTS.md for coding agent 2025-08-28, ruleset import/export 2023-10-12); github.blog AGENTS.md 2,500-repo analysis; 60M Copilot reviews (2026-03-05); community discussions #190610 (auto-merge 422), #151100 (merge_group); github.com/github/{spec-kit + discussion #1784, copilot-cli, copilot-cli-for-beginners, safe-settings}; htekdev/copilot-ci-pipeline.

**Standards & ecosystem:** agents.md; linuxfoundation.org (Agentic AI Foundation); openai.com/index/agentic-ai-foundation; agentskills.io; Gloaguen et al. (ETH Zurich), "Evaluating AGENTS.md," Feb 2026; infoq.com coverage.

**Loops & harnesses:** ghuntley.com/ralph; humanlayer.dev (Brief History of Ralph; Advanced Context Engineering + ace-fca repo); claytonfarr.github.io/ralph-playbook; snarktank/ralph; addyosmani.com/blog/loop-engineering (with correction); simonwillison.net red/green TDD; arxiv 2605.21384 (SpecBench), 2606.26300 (Verification Horizon); blog.scottlogic.com Spec Kit field test (2025-11-26); marmelab.com, martinfowler.com SDD critiques; blog.sondera.ai (Principal Skinner); zylos.ai harness patterns; codecentric.de; paddo.dev; awesomeclaude.ai.

**Memory:** github.com/ruvnet/{ruvector, agentdb, ruflo (+ wiki, issues #1102/#945, claude-flow)}; rywalker.com; dev.to/stevengonsalvez; docs.cline.bot memory-bank; steveyegge/beads (+ INSTALLING.md, Yegge Medium); modelcontextprotocol/servers (memory); sqliteai/{sqlite-vector, sqlite-memory}; lancedb.com; voxos.ai; extency.com; towardsdatascience.com (memweave); matrixorigin.io; zilliztech/memsearch; mem0.ai (OpenMemory, pricing); getzep.com/pricing; particula.tech; zenn.dev/kesin11; ssw.com.au symlink rules.

**Gates & governance:** ancuta.org; blog.exceeds.ai; tenthirtyam.org CODEOWNERS; best.openssf.org AI-assistant guide; mergify.com; crashoverride.com and fabiorehm.com (commit trailers); mindstudio.ai and microsoft.com (progressive autonomy, defense-in-depth 2026-05-14); github/copilot-cli issue #307.

**Quality:** Bachmann1234/diff_cover; Koleok/jest-coverage-ratchet; forestwalk.ai; augmentcode.com mutation-testing guide (with cadence correction); qaskills.sh; alexop.dev; devassure.io; codescene.com; travis.media; danger.systems no-test-shortcuts; humanwhocodes.com merge-queue (2026-04); veracode.com GenAI report; sanj.dev; ap7i.com and shipyard.build (Playwright MCP); changesets.org; pkgpulse.com; xnok.github.io; flatt.tech (claude-code-action vulnerability research); microsoft.com security blog (2026-06-05); bitsfrombytes.com.

**Templates landscape:** davila7/claude-code-templates; tessl.io skill reviews; augmentcode.com BMAD guide; adsantos.medium.com; obra/superpowers + blog.fsck.com (Superpowers 6); mejba.me; hesreallyhim/awesome-claude-code; steipete/agent-rules; KbWen/agentic-os; zbruhnke/claude-code-starter; scotthavird/claude-code-template; devleader.ca Copilot CLI guide (2026-07-09).
