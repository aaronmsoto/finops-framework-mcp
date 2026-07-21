# Memory

Agents forget everything between sessions; this template's answer is **memory as a reviewable git artifact with a budget**. The default tier is a curated markdown memory bank in `.agents/memory/`, read at session start and updated before session end, with size and staleness enforced by a gate. Two opt-in tiers layer on top for problems files handle poorly: beads for long-horizon task graphs, and MCP/vector indexes as derived caches. This doc covers the files and their contracts, the session protocol per tool, the lint gate, how the shared bank relates to Claude Code's private auto memory, the opt-ins, and the RuVector/AgentDB watch item.

## Three memory problems, three tiers

Coding-agent memory decomposes into three distinct problems, and no single mechanism solves all of them well ([research-synthesis.md](research/research-synthesis.md), "Memory system options"):

1. **Durable project knowledge** — what this project is, decisions made, conventions to follow. Solved by **tier 1**, the markdown memory bank. Default, always on.
2. **Cross-session task state** — what is in flight, what depends on what, over weeks. Solved at small scale by `.agents/tasks.json` + `activeContext.md`; at long horizons by **tier 2**, beads. Opt-in.
3. **Recall at scale** — finding the relevant needle in months of accumulated history. Solved by **tier 3**, search indexes built over the files. Opt-in, and never authoritative.

File-first is not a compromise: it is the only approach that works for both tools with zero infrastructure, travels through git to teammates and CI, and is PR-reviewable — and the research found plain-filesystem memory *outperforming* a graph-based memory product on the standard benchmark (Letta 74% vs Mem0 68.5% on LoCoMo).

## Tier 1: the memory bank (`.agents/memory/`)

Four files, each with a contract:

- **`MEMORY.md`** — the always-loaded core: project facts, invariants, current phase. **Budget: `coreBudgetLines` from `agentic.config.json` (default 200 lines); `memory lint` fails over budget.** Everything here costs context in every session of every tool, so it earns its place or gets cut. Written by anyone (human or agent) via considered edits, typically through the `update-memory` skill.
- **`decisions.md`** — append-only decision log: date, decision, why, alternatives considered. Agents append an entry whenever they make a choice that had real alternatives; humans append when they overrule one. Never rewritten, only appended.
- **`patterns.md`** — codebase conventions agents must follow: naming, error handling, test structure, "we do X not Y here." Grows slowly, pruned when conventions change.
- **`activeContext.md`** — the handoff file: what is in flight, next steps, open questions. Rewritten (not appended) at the end of every working session — the `/handoff` skill exists for exactly this. `memory lint` warns when it goes stale: older than `staleDays` (default 45) while commits kept landing, which means sessions are ending without handoffs.

The journal (`.agents/journal/`, one dated file per session so parallel branches never conflict) is adjacent but distinct: an append-only narrative of what happened, useful for archaeology; the memory bank is the distilled current truth.

## The session protocol

Reading memory at session start is enforced differently per tool, same protocol:

- **Claude Code** — a SessionStart hook runs `./scripts/agentic memory show --session-start` and injects the summary automatically. The agent starts oriented without spending turns on file reads.
- **Copilot CLI** — no hook mechanism, so the session protocol in [AGENTS.md](../../AGENTS.md) instructs it: read `MEMORY.md` and `activeContext.md`, then `git log --oneline -10`, before working.

Updating before session end is protocol plus skill (`update-memory`, `/handoff`) — and the lint gate catches the drift when protocol is skipped.

## Memory lint as a gate

`./scripts/agentic memory lint` runs in the fast tier, so it executes on every loop iteration, pre-push, and CI run:

- **Budgets** — `MEMORY.md` over `coreBudgetLines` fails; `AGENTS.md` over ~170 lines warns.
- **Staleness** — `activeContext.md` unedited for more than `staleDays` while commits continued produces a warning. Last-edit time comes from `git log -1 --format=%ct -- <file>`, falling back to mtime.

This is the deterministic twin of "keep memory curated": unbudgeted memory rots into an unread dump, and a gate is the only thing that reliably prevents it.

## Shared bank vs. Claude Code's auto memory

Claude Code also maintains machine-local automatic memory under `~/.claude/projects/<project>/memory/`. The two coexist and serve different purposes:

- **Auto memory** is the agent's **private scratch** — local to one machine, invisible to git, CI, teammates, and Copilot. Useful, but unaccountable.
- **The memory bank** is the **shared, reviewed record** — committed, diffed in PRs, read by both tools, linted.

The rule: anything that should influence *other* sessions, tools, or people belongs in the bank, moved there deliberately. Nothing load-bearing may live only in auto memory.

## Opt-in tier 2: beads (task-graph memory)

[steveyegge/beads](https://github.com/steveyegge/beads) — v1.1.0, ~25k stars, Dolt-backed (version-controlled SQL with cell-level merge; the `.beads/issues.jsonl` file is interchange format, not the source of truth) — is a dependency-aware issue graph synced via git remotes, with first-party `bd setup claude` and `bd setup copilot` integrations for exactly this template's two tools.

Set it up with `./scripts/setup-beads.sh`. It earns its keep on **long-horizon, multi-session task graphs**: dozens of interdependent tasks over weeks, where `tasks.json` (a flat list sized for loop runs) and `activeContext.md` (one handoff) start dropping dependencies on the floor — the task-amnesia failure mode files genuinely don't cover. The cost is a real dependency (a Go binary), which is why it is opt-in rather than default: the zero-infrastructure core must keep working without it.

## Opt-in tier 3: MCP and vector indexes (derived caches)

For recall at scale, two escalation steps — both governed by one iron rule: **the index is always a rebuildable derived cache over the markdown files, never a source of truth.** If the index vanished, you would lose seconds, not knowledge.

- **Simplest:** `@modelcontextprotocol/server-memory` via `npx` — both CLIs are MCP clients.
- **At scale:** a local hybrid index (sqlite-vec or LanceDB) built over the memory bank and journal, rebuilt on demand.

Caveats: this tier earns its keep only on large, long-lived projects; the official memory server's flat JSON diffs poorly in git (another reason it must not hold truth); and enterprise environments may disable MCP or enforce registry allowlists — nothing in the template depends on this tier, by design.

## Watch item: RuVector / AgentDB

The owner asked specifically about RuVector, so the assessment is recorded here (verified in [research-synthesis.md](research/research-synthesis.md), option 4, as of 2026-07):

- **RuVector, the engine, is promising** — ~4.3k stars, actively released (ruvector-core 2.3.0 on 2026-07-12), Rust HNSW/SIMD vector search.
- **AgentDB, the agent-memory product on top, is immature** — 76 stars, 14 commits, zero GitHub releases, and its headline "+36% search quality" benchmark is self-reported. The surrounding ecosystem also churns hard (the claude-flow → Ruflo rename-and-rework inside a year).

A template meant to run unattended cannot pin a dependency with no releases. **Decision: not adopted; watch item.** Revisit in 6-12 months; if AgentDB stabilizes (releases, external benchmarks, adoption), its single-file `.rvf` + npm-install architecture would slot cleanly into tier 3 as another derived-cache backend — the tiered design means adopting it later costs nothing now. See also [ADR-0002](adr/0002-markdown-memory-bank.md).

## Memory hygiene

- **Curation over accumulation.** Memory quality is what you remove. If `MEMORY.md` is near budget, the fix is pruning, not a budget raise.
- **Prune in PRs.** Memory files are code: stale facts and superseded decisions get deleted in the same PR that obsoletes them, where the reviewer sees both sides.
- **Distill upward.** Journal entries are raw; when a pattern recurs, promote the distilled version to `patterns.md` or `MEMORY.md` and let the journal be history.
- **Handoff every session.** A stale `activeContext.md` is the lint warning you will actually hit; `/handoff` takes a minute and saves the next session ten.

Related: [operations.md](operations.md) for the session protocol in daily flow, [quality-gates.md](quality-gates.md) for how the lint gate runs, [ADR-0002](adr/0002-markdown-memory-bank.md) for why markdown won.
