# 2026-08-02 — T-055: docs coherence (MEMORY.md, combined-scenario step 4, architecture/AGENTS framing, Worker posture)

## Task

`docs/final-status-review.md` DOC-1/DOC-3/DOC-4/L5 fixes: MEMORY.md was
frozen at v0.1 phrasing, `evals/focus/combined-scenario.xml` step 4 still
claimed the T-045 fix disproved, `docs/architecture.md`/`AGENTS.md` still
framed FOCUS/Worker/demo as future work, and `docs/deploy-worker.md` never
explained the Worker's no-auth/no-rate-limit posture.

## What I did

- **MEMORY.md** (`update-memory` skill): rewrote Project/Invariants/Current
  focus for v1 reality — two servers (framework + `finops-focus-mcp`), the
  Worker + demo, four critique gates + the five-lens final review passed,
  publish owner-gated. Dropped "inferred edges" (deleted in v0.1→v1, was
  still listed as a live invariant). Added the Worker no-auth-by-design and
  `docs/mcp-surface.md` drift-guard invariants (both load-bearing for a
  fresh session). 50 lines (was 32), well under the 200-line hard budget.
- **`evals/focus/combined-scenario.xml` step 4**: live-probed
  `get_kpi_mapping(capability: "rate-optimization", version: "1.2")` and
  `compare_versions(column: "CommitmentDiscountQuantity")` against the
  built server to get the actual T-045 shape (columns for all three
  commitment KPIs now include CommitmentDiscountQuantity/
  CommitmentDiscountUnit at 1.2; caveat is the single version-neutral
  string T-045 wrote, not per-version prose). Rewrote `<expected>` to match
  — no longer claims "identical column sets," instead describes the grown
  1.2 column list and the version-neutral caveat's nuance (formula
  unchanged, quantity columns are a flagged unused opportunity).
- **`docs/architecture.md`**: three short "**Now built:**" pointers (no
  rewrite of historical rationale, per the acceptance criteria) — after the
  "Future FOCUS sibling" line (§2, now points at `packages/finops-focus-mcp`),
  after §5.4 Transport's "Streamable HTTP later" line (now points at
  `src/workers/index.ts` + `demo/` + `docs/deploy-worker.md`), and after
  §10's "two critique gates" line (now points at critique-3/4 +
  `docs/final-status-review.md`).
- **AGENTS.md**: rewrote "What this project is" to name both servers, the
  FOCUS pipeline, and the Worker+demo as now-built. 66 lines total (was
  64), still well under the ~150-line convention.
- **`docs/deploy-worker.md`** Notes/limits: added a bullet stating the
  no-auth/no-rate-limit posture is deliberate (public, read-only,
  stateless data — nothing to protect), pointing at Cloudflare Rate
  Limiting rules for anyone who later wants edge-level throttling.

## Verified

- `./scripts/agentic gates` (default tier): format/lint/typecheck/test (392
  tests)/designs/integrity/memory all PASS.
- `./scripts/agentic memory lint`: ok, 0 warnings (MEMORY.md 50 lines).
- Live probes cited above (`node evals/framework/mcp-call.mjs --server=focus
  call get_kpi_mapping ...` and `... call compare_versions ...`) against a
  fresh `npm run build`, confirming the new step-4 prose matches shipped
  behavior exactly.
- Nothing in `src/`, `scripts/`, or `.agentic/` programmatically parses
  `combined-scenario.xml` (grepped) — it's read by humans/fresh agents
  only, so the step-4 rewrite doesn't need a test update.
- No prompt/resource/tool changed, so `docs/mcp-surface.md` needed no
  regeneration (confirmed `mcp-surface.test.ts` still passes unchanged as
  part of the gate run).

## Next

T-056..T-059 remain (dual-launch hygiene, architecture periphery items,
derive-pipeline integration test, demo format-gate — see
`docs/final-status-review.md` post-launch backlog and
`.agents/memory/activeContext.md`).
