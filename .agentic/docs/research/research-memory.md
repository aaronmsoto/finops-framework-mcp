# Agentic Memory Systems for Coding Agents — Research Report

Research date: 2026-07-13. Note: the task prompt specified an output path of `undefined/research-memory.md` (unresolved variable); this report was written to the session scratchpad instead.

## Findings

### 1. RuVector and the ruvnet ecosystem

**RuVector** (github.com/ruvnet/ruvector) is a "high-performance, real-time, self-learning AI vector GNN memory DB" written in Rust (78%), with Node/NAPI, WASM, and Python bindings. Verified signals as of mid-2026: ~4.3k stars, 575 forks, 2,837 commits, 38 releases, latest release `ruvector-core 2.3.0` on **2026-07-12** — very actively developed. It claims HNSW + SIMD sub-millisecond search, quantization, COW branching, and "self-learning" ranking. (Source: https://github.com/ruvnet/ruvector)

**AgentDB** (github.com/ruvnet/agentdb) is the agent-memory layer on top of RuVector: a "self-learning vector memory" packaged as a single `.rvf` file, installed via `npm install agentdb`, using Thompson-Sampling bandits over 9 RL algorithms and claiming "+36% search quality from feedback alone." Maturity signals are weak: **76 stars, 8 forks, 14 commits, no GitHub releases** at fetch time. All performance claims are self-reported. (Source: https://github.com/ruvnet/agentdb)

**claude-flow / Ruflo** (renamed early 2026, reportedly for trademark reasons; npm package still `claude-flow`) is ruvnet's multi-agent orchestrator. Its memory system is SQLite-based (`.swarm/memory.db`) plus AgentDB/HNSW, with a proposed "AutoMemoryBridge" (ADR-048, issue #1102) bidirectionally syncing Claude Code's auto-memory markdown with AgentDB. Ruflo v3.6 (2026-04-29) claims 314 MCP tools, 19 AgentDB controllers, and 21 plugins. (Sources: https://github.com/ruvnet/ruflo/wiki/Memory-System, https://github.com/ruvnet/ruflo/issues/1102, https://github.com/ruvnet/ruflo/issues/945)

**Production-readiness assessment (my inference, but grounded):** community reception mixes enthusiasm with persistent skepticism — "production case studies remain anecdotal" and "most performance claims remain self-reported" (https://rywalker.com/research/claude-flow; https://dev.to/stevengonsalvez/claude-flow-is-dead-long-live-ruflo-5coi). RuVector-the-engine is plausible and fast-moving; AgentDB-the-memory-product is early (14 commits, no releases). The ecosystem churns hard (rename, Rust/WASM rewrite, v2→v3 rebuild in under a year). **Verdict: not a safe default dependency for a template repo in mid-2026.** Anything pinned today may be renamed or rearchitected within months. This assessment may age — RuVector's release cadence is high.

### 2. The alternatives spectrum

- **File-based memory bank (Cline pattern).** Structured markdown in-repo: `projectbrief.md`, `productContext.md`, `activeContext.md`, `systemPatterns.md`, `techContext.md`, `progress.md`, read at session start and updated on command ("update memory bank"). It is official Cline documentation and the most widely copied pattern. Zero infrastructure, git-versioned, human-auditable. (https://docs.cline.bot/features/memory-bank)
- **Claude Code native memory.** Two layers: CLAUDE.md (user-authored instructions, loaded every session) and **auto memory** (Claude writes its own notes; `MEMORY.md` first 200 lines load into the system prompt, topic files read on demand; on by default since v2.1.59). This is markdown-file-based, confirming the file-first direction of the platform itself. (https://code.claude.com/docs/en/memory)
- **Beads** (Steve Yegge, now github.com/steveyegge/beads under the gastownhall org): issue-tracker-as-agent-memory. v1.1.0 released **2026-07-04**, ~25.3k stars, 93 releases. Default backend is now embedded **Dolt** (version-controlled SQL) with a `.beads/issues.jsonl` interchange file; CLI (`bd ready`, `bd create`) plus MCP; **explicit setup integrations for both Claude Code and Copilot CLI** via `bd setup`. Yegge's core claim: agents' long-horizon failure mode is task amnesia, and a dependency-aware task graph beats "hundreds of useless markdown plan files." (https://github.com/steveyegge/beads, https://steve-yegge.medium.com/introducing-beads-a-coding-agent-memory-system-637d7d92514a)
- **Embedded vector stores:** sqlite-vec / sqlite-vector (SQLite extension, vectors as BLOBs, SIMD, ~30MB footprint), **sqlite-memory** (markdown-aware chunking + FTS5 hybrid + local llama.cpp embeddings, "offline-first sync between agents"), and **LanceDB** (embedded TypeScript-native, filesystem storage; used by Continue for local code search and marketed for OpenClaw memory). All are zero-server and Node-compatible. (https://github.com/sqliteai/sqlite-vector, https://github.com/sqliteai/sqlite-memory, https://www.lancedb.com/blog/openclaw-memory-from-zero-to-lancedb-pro)
- **Hosted/heavy memory platforms:** Mem0 (~47k stars, vector-first, easiest bolt-on), Zep/Graphiti (temporal knowledge graph; leads LongMemEval at 63.8% vs Mem0's 49.0% with GPT-4o), Letta/MemGPT (OS-style self-managed memory runtime). All are optimized for *conversational/personalization* memory of long-running products, priced $19–$104+/mo for managed tiers — a poor fit for a portable starter repo. (https://particula.tech/blog/agent-memory-frameworks-tested-mem0-zep-letta-cognee-2026, https://medium.com/@wasowski.jarek/i-compared-5-ai-agent-memory-systems-across-6-dimensions-none-wins-6a658335ed0a)
- **Official MCP memory server:** `@modelcontextprotocol/server-memory` — a reference knowledge-graph (entities/relations/observations) persisted to a local JSON file, `npx`-runnable, MIT. Works with any MCP client. Useful as an optional preset, but its flat JSON store doesn't diff well in git. (https://github.com/modelcontextprotocol/servers/tree/main/src/memory)

### 3. What actually works for coding agents (practitioner evidence)

The 2025–2026 practitioner consensus is strikingly file-first:

- Multiple independent analyses note that the most successful agent products (Claude Code, Manus, OpenClaw) use **plain markdown as primary memory**, not vector DBs (https://voxos.ai/blog/how-to-give-ai-coding-agents-long-term-m/index.html; https://www.producthunt.com/p/general/are-we-over-engineering-ai-memory-markdown-vs-vector-dbs-for-small-datasets).
- The recurring argument: similarity search "misses the forest for the trees," while a curated markdown map forces the agent to maintain a coherent model of the project; and git-versioned markdown is inspectable, attributable, and revertible — memory as a first-class project artifact rather than a side-effect in an opaque service (https://extency.com/blog/markdown-versioned-folders-agent-brain-2026; https://towardsdatascience.com/memweave-zero-infra-ai-agent-memory-with-markdown-and-sqlite-no-vector-database-required/).
- Practitioners converge on **capping curated memory (~30 items / a few hundred lines) with regular pruning** — mirroring Claude Code's 200-line MEMORY.md budget.
- The main *counter*-evidence: pure markdown fails at (a) long-horizon **task state** — Yegge's beads argument, validated by 25k stars and real multi-tool adoption — and (b) **scale**: once history exceeds what fits in a curated file, hybrid search (FTS5 + vectors) earns its keep (https://www.matrixorigin.io/blog/markdown-agent-memoria).

My synthesis: coding-agent memory decomposes into three distinct problems — (1) durable project knowledge (conventions, architecture, gotchas) → curated markdown wins; (2) task/plan state across sessions → a structured, dependency-aware tracker (beads or even GitHub Issues) wins; (3) recall over large histories → optional embedded vector search, only at scale.

### 4. Cross-agent shared memory (Claude Code + Copilot CLI)

- **Instruction files:** Copilot CLI reads AGENTS.md **and CLAUDE.md** natively (Jan 2026 changelog: https://github.blog/changelog/2026-01-14-github-copilot-cli-enhanced-agents-context-management-and-new-ways-to-install/). Claude Code reads CLAUDE.md. The standard bridge: `CLAUDE.md` containing `@AGENTS.md` on line 1 (import) — preferred over symlinks because symlinks need admin rights on Windows (https://zenn.dev/kesin11/articles/20251210_ai_agent_symlink?locale=en; https://www.ssw.com.au/rules/symlink-agents-to-claude).
- **File-based shared memory** works for both tools with zero extra config: any directory of markdown in the repo is readable/writable by both agents via ordinary file tools; instruction files just need to tell each agent the protocol (read on start, update on stop). This is the lowest-friction cross-agent mechanism and the only one that also travels through git to teammates and CI.
- **MCP-based shared memory** also works — both Claude Code and Copilot CLI are full MCP clients — and is the right channel for *queryable* memory (official memory server, beads MCP, OpenMemory). Mem0's OpenMemory MCP is explicitly built for cross-tool local memory (Qdrant + SSE, localhost dashboard) but adds a running server + Docker — real friction for a starter repo (https://mem0.ai/blog/introducing-openmemory-mcp). zilliztech/memsearch ("unified memory layer for Claude Code, Codex, backed by Markdown and Milvus") shows the emerging hybrid: markdown as source of truth, index as derived cache (https://github.com/zilliztech/memsearch).
- Beads deserves special mention: it ships `bd setup` for **both Claude Code (hooks) and Copilot CLI**, with git as the sync/merge substrate — i.e., cross-agent *and* cross-machine sharing without a server.

## Best practices observed

1. **Markdown-in-git as source of truth; databases as derived indexes.** Every credible 2026 system (Claude Code auto-memory, memsearch, sqlite-memory, memweave) treats files as canonical and vectors as a rebuildable cache.
2. **Hard budgets + pruning discipline.** ~200 lines / ~30 items of always-loaded memory; overflow goes to topic files read on demand.
3. **Separate knowledge memory from task memory.** Conventions/architecture in curated docs; work-in-progress state in a structured tracker with dependencies (beads / issues), not in plan-markdown sprawl.
4. **Single instruction source across tools:** AGENTS.md canonical, `@AGENTS.md` import in CLAUDE.md; avoid symlinks for Windows portability.
5. **Explicit read/write protocol in instructions** ("at session start read X; before finishing update Y") — memory only works if the harness/hooks enforce the discipline, not just suggest it.

## Implications for the starter repo

- **Default (tier 0, always on):** a file-based memory bank — e.g. `.agents/memory/` with `MEMORY.md` (budgeted summary, ~200 lines), `decisions.md`, `patterns.md`, `activeContext.md` — canonical AGENTS.md with `@AGENTS.md` imported by CLAUDE.md, and the Node harness enforcing read-at-start / update-at-end (Claude Code hooks; prompt protocol for Copilot CLI). Zero dependencies, fully portable, both tools share it natively, diffs are reviewable in PRs.
- **Tier 1 (recommended optional):** beads for task-graph memory. It is the most mature (v1.1.0, 25k stars, 93 releases), explicitly dual-tool, git-synced, and solves the failure mode files don't. Gate it behind an opt-in setup script since it requires a Go binary.
- **Tier 2 (optional preset, off by default):** an MCP memory preset — either `@modelcontextprotocol/server-memory` (simplest) or a local hybrid-search index (sqlite-vec/LanceDB) over the markdown memory, exposed via one MCP config consumed by both tools. Only worth enabling on large/long-lived projects.
- **Do not build on RuVector/AgentDB/claude-flow now.** Engine is promising but the memory product is immature (76 stars, 14 commits, no releases) and the ecosystem's churn (rename to Ruflo, full rewrite) makes it a risky pin for a template meant to work unattended. Revisit in 6–12 months; the architecture (single-file `.rvf`, npm install) would slot into Tier 2 cleanly if it stabilizes.
- Ship the memory directory with templates + a `memory` section in the harness config (path, budget, update policy) so the quality-gate loop can lint memory-file size and staleness as a gate.

## Sources

- https://github.com/ruvnet/ruvector
- https://github.com/ruvnet/agentdb
- https://github.com/ruvnet/ruflo/wiki/Memory-System
- https://github.com/ruvnet/ruflo/issues/1102
- https://github.com/ruvnet/ruflo/issues/945
- https://rywalker.com/research/claude-flow
- https://dev.to/stevengonsalvez/claude-flow-is-dead-long-live-ruflo-5coi
- https://docs.cline.bot/features/memory-bank
- https://code.claude.com/docs/en/memory
- https://github.com/steveyegge/beads
- https://steve-yegge.medium.com/introducing-beads-a-coding-agent-memory-system-637d7d92514a
- https://particula.tech/blog/agent-memory-frameworks-tested-mem0-zep-letta-cognee-2026
- https://medium.com/@wasowski.jarek/i-compared-5-ai-agent-memory-systems-across-6-dimensions-none-wins-6a658335ed0a
- https://github.com/modelcontextprotocol/servers/tree/main/src/memory
- https://github.com/sqliteai/sqlite-vector
- https://github.com/sqliteai/sqlite-memory
- https://www.lancedb.com/blog/openclaw-memory-from-zero-to-lancedb-pro
- https://voxos.ai/blog/how-to-give-ai-coding-agents-long-term-m/index.html
- https://extency.com/blog/markdown-versioned-folders-agent-brain-2026
- https://towardsdatascience.com/memweave-zero-infra-ai-agent-memory-with-markdown-and-sqlite-no-vector-database-required/
- https://www.matrixorigin.io/blog/markdown-agent-memoria
- https://github.blog/changelog/2026-01-14-github-copilot-cli-enhanced-agents-context-management-and-new-ways-to-install/
- https://zenn.dev/kesin11/articles/20251210_ai_agent_symlink?locale=en
- https://www.ssw.com.au/rules/symlink-agents-to-claude
- https://mem0.ai/blog/introducing-openmemory-mcp
- https://github.com/zilliztech/memsearch
