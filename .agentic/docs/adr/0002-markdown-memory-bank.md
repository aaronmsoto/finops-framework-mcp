# ADR-0002: Budgeted markdown memory bank as the default memory tier

**Status:** Accepted (2026-07-13)

## Context

Agent memory needs a default that works for both CLIs, unattended, with zero infrastructure. Candidates: repo-local markdown files; beads (task-graph, Go binary); MCP/vector stores; RuVector/AgentDB (owner asked specifically). Verified evidence: file-based memory is the 2025-2026 practitioner standard and matches Claude Code's own markdown-file memory design; a plain-filesystem approach beat Mem0's graph memory on LoCoMo (Letta 74% vs 68.5%). The refuted claim that shaped this decision: AgentDB's maturity — verification found **76 stars, 14 commits, zero GitHub releases, and a self-reported "+36% search quality" benchmark** (as of 2026-07), atop an ecosystem with a rename-and-rework track record. A template cannot pin a dependency with no releases. Hosted memory platforms ($19-$104+/mo) target conversational personalization, not repo knowledge. Unbudgeted memory verifiably rots.

## Decision

Default memory is `.agents/memory/` — `MEMORY.md` (200-line budget), `decisions.md`, `patterns.md`, `activeContext.md` — committed, PR-reviewed, and enforced by `memory lint` as a fast-tier gate (budget + staleness). beads is the recommended opt-in for long-horizon task graphs (`scripts/setup-beads.sh`); MCP/vector indexes are opt-in derived caches, never source of truth. RuVector/AgentDB: not adopted; watch item, revisit in 6-12 months.

## Consequences

- Memory travels through git to teammates, CI, and both tools; it is auditable in review.
- Weak at long-horizon task state and large-scale recall by design — those are the opt-in tiers' jobs.
- Depends on curation discipline, which is why hygiene is a gate rather than advice.
- If AgentDB matures, it slots into the derived-cache tier without redesign.
