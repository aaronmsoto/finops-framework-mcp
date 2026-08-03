# 2026-08-02 — v1 close-out session (supervised)

Supervising session for the final stretch: gate-4 fix verification, the
rename, the pre-launch review, and ship prep.

## What happened

- Confirmed the T-039..T-047 fix loop (started 2026-07-30) finished 9/9
  with green gates; a stale `pgrep -f "agentic loop"` self-match had made
  the supervisor believe it was still running for two days (lesson below).
- Re-authored all unpushed commits (committer noreply@anthropic.com) via
  `git rebase --exec` per the stop hook, verified the task chain is
  content-based (evidence commit SHAs are display-only), pushed.
- **T-048**: renamed the FOCUS package `focus-spec-mcp` → `finops-focus-mcp`
  per owner decision (family consistency with finops-framework-mcp; LF
  trademark policy quote + accepted-risk rationale in decisions.md).
  Historical records keep the old name. Tarball re-packed (241KB),
  temp-install bin banner verified, gates --tier all green.
- Hand-verified all nine gate-4 fixes live (nested EffectiveCost MUSTs with
  scoping prefixes; CORS preflight 204 + ACAO echo, POST ACAO with real
  stores; get_requirements footer + source_url; compare_versions
  did-you-mean on unknown columns; changelog resource (20,654 chars, has
  the materiality caveat) + official:false; calculate_kpi not-computable
  guidance at 1.0 with ESR unchanged 26.552972346576816%; 1.2 mapping cites
  CommitmentDiscountQuantity; README phrasing; cross-version hints +
  datetime_format example).
- **Focus eval Run 2: 10/10** (fresh agent, tools-only, regenerated
  artifact) — recorded in docs/eval-results.md. Run-1 friction
  (get_attribute slug discovery) confirmed gone.
- **Final pre-launch review** (5 read-only lenses, MAJOR+ findings
  adversarially verified, 12 agents): verdict **GO-after-listed-fixes**,
  grades A- (MCP conformance), A- (tool naming), A- (architecture), B+
  (launch readiness), B- (docs coherence); 0 BLOCKERs, 2 MAJORs, 19 MINORs
  → docs/final-status-review.md.
- **T-049**: fixed both MAJORs — root README now presents the shipped
  FOCUS server/Worker/demo (was still "roadmap") and links all four
  critique docs + the review; root NOTICE.md gained the FOCUS spec-text
  CC BY 4.0 section for data/focus/** and the widened scope line.
- Updated the published Artifact walkthrough (private) with the rename and
  the new not-computable finale + real 1.2 commitment values.

## Lessons / template feedback

- **Watcher self-match**: `until ! pgrep -f "agentic loop"` matches its own
  shell's command line — the watcher never fires and status checks lie.
  Match on the harness PID or a distinct marker instead.
- Rebasing under a live loop is unsafe; queue history rewrites until the
  loop exits (did so here).

## State for the next session

See .agents/memory/activeContext.md — owner checklist (PR #9 merge, npm
publishes, registry submits, wrangler deploys) + the 19-MINOR backlog in
docs/final-status-review.md.
