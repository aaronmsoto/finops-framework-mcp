# Spec: loop-harness improvements (retro items 9–14, 16b) + port-back tracker

## Problem

The first production loop run (T-005..T-009, 2026-07-23) succeeded 5/5 but
exposed harness gaps recorded in the template's retro backlog
(agentic-starter-repo activeContext items 9–16, journal
20260723-loop-retro-field-notes.md). Owner direction: implement the usable
subset HERE, where the loop builds real work, harden them through mock and
real loop runs, and document what works to inform the template port-back.

## Outcome

The harness copy in `.agentic/harness/` gains: preflight failures that show
the runner's own output with a root/IS_SANDBOX hint (item 9); persisted
verifier evidence with a durable journal excerpt (10); token accounting with
an optional `loop.max_total_tokens` cap (11); a per-iteration timeout
`loop.max_iteration_minutes` with lower-only CLI flag (12); a live heartbeat
file surfaced by `agentic status` (13); the run journal auto-committed at
terminal state (14); a `--max-consecutive-failures` flag and a
pending-based iteration budget default (16b). All proven by harness vitest
suites plus mock failure-path scenarios and one real mini loop run.

## Non-goals

- Items 1–8 (template/GitHub side), 15 (per-task runner hints), 16's CI job,
  17 (loop-driven per-task PRs — needs gh, unavailable in this environment).
- No edits to approvals.yaml, .claude/settings.json, agentic.config.json gate
  definitions, or .github/workflows/ — new policy keys ship as code defaults
  and activate only if the owner later adds them to approvals.yaml.
- No template repo changes in this batch — the port-back is a later session
  driven by this tracker.

## Acceptance criteria

- [ ] T-010..T-016 implemented, each with new harness vitest coverage;
      `npm run test|lint|typecheck` green in `.agentic/harness` after each.
- [ ] Repo gates PASS before every commit; task hash chain valid through
      T-017.
- [ ] Mock scenarios A–D (below) executed with outputs captured; real mini
      loop run (scenario E) executed on the improved harness.
- [ ] Tracker table below filled with per-item status, evidence, and port
      verdict.

## Port-back tracker

| Item | Task | Status | Evidence | Port verdict |
|---|---|---|---|---|
| 9 preflight output + hint | T-010 | pending | — | — |
| 11 token accounting + cap | T-011 | pending | — | — |
| 10 verifier evidence | T-012 | pending | — | — |
| 12 per-iteration timeout | T-013 | pending | — | — |
| 16b cap ergonomics | T-014 | pending | — | — |
| 13 heartbeat + status | T-015 | pending | — | — |
| 14 journal auto-commit | T-016 | pending | — | — |

Port verdicts: **port** (copy as-is), **adjust** (port with noted changes),
**drop** (didn't earn its keep — explain).

### Deviations to review at port time

- `max_iteration_minutes` accepts positive **fractions** (0.05 = 3s) so tests
  fit vitest's 60s budget — differs from the other integer caps.
- `RunnerResult` gains `stderr?: string` (type-additive; all three runners).
- Mock runner gains the `AGENTIC_MOCK_USAGE: {json}` stdout contract for
  token tests — document in the template's mock-runner docs when porting.
- This repo's gates/CI do not run the harness's own vitest/eslint/tsc; the
  template port should consider a harness-CI job (relates to retro item 16).

## Validation scenarios

- **A — preflight surfacing:** mock script prints the root-refusal error to
  stderr and exits 1 → failure message shows output tail + IS_SANDBOX hint;
  loop-state.json ends `terminal:error`.
- **B — iteration timeout:** compliant preflight then `sleep 60` build with
  `--max-iteration-minutes 0.05 --max-consecutive-failures 2` → two
  timeout-failed iterations → blocked + BLOCKED.md.
- **C — verifier fail:** honest build (commit + complete + usage marker),
  verify prints `VERDICT: fail` → revert → BLOCKED.md; evidence file written;
  journal has excerpt + tokens; final commit "Record loop run journal
  (blocked)" touches only the journal; heartbeat `terminal:blocked`.
- **D — token cap:** fixture approvals `max_total_tokens` low → honest tasks
  → `budget_exhausted` with token-cap reason; `--json` totalTokens.
- **E — real mini run:** 1–2 genuine v1.1 tasks under
  `./scripts/agentic loop --max-iteration-minutes 20` (claude runner,
  headless container profile) — observe live `status`, real token journal
  lines, terminal journal auto-commit.

A–D run in a scratch fixture repo (approvals.yaml here is protected); E runs
in this repo.

## Validation log

(filled by T-017)

## Open questions

- None blocking — scope, method, and validation depth owner-approved
  2026-07-23 (AskUserQuestion round; "Go" with overnight autonomy).
