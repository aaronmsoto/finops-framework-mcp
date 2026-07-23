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

- [x] T-010..T-016 implemented, each with new harness vitest coverage;
      `npm run test|lint|typecheck` green in `.agentic/harness` after each.
- [x] Repo gates PASS before every commit; task hash chain valid through
      T-017.
- [x] Mock scenarios A–D (below) executed with outputs captured; real mini
      loop run (scenario E) executed on the improved harness.
- [x] Tracker table below filled with per-item status, evidence, and port
      verdict.

## Port-back tracker

| Item | Task / commit | Status | Evidence | Port verdict |
|---|---|---|---|---|
| 9 preflight output + hint | T-010 `4ca3317` | done | scenario A (verbatim stderr tail + IS_SANDBOX hint); 4 tests | **port** |
| 11 token accounting + cap | T-011 `cd1add0` | done | scenarios C/D/E; real run revealed 10.18M tokens (98% cache reads); 8 tests | **port** |
| 10 verifier evidence | T-012 `ce1d5dc` | done | scenarios C/E; evidence files + journal excerpts for real verifier transcripts; 3 tests | **port** |
| 12 per-iteration timeout | T-013 `89f0119` | done | scenario B (blocked in 6s vs 600s wall); 5 tests | **port** (review fractional-minutes deviation) |
| 16b cap ergonomics | T-014 `31bf982` | done | scenarios A/B/E logs show derived budget; flag lowered cap in B; 4 tests | **port** |
| 13 heartbeat + status | T-015 `10ab095` | done | scenario E live: `status` showed preflight→build phases mid-run, terminal after; 6 tests | **port** |
| 14 journal auto-commit | T-016 `249f444` | done | scenarios B/C/D/E all ended with clean trees and a pathspec-scoped journal commit | **port** |

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

Mock scenarios ran against the real built dist (`node
.agentic/harness/dist/cli.js`) in scratch fixture repos mirroring
`tests/helpers.ts` (single fast noop gate; caps 10/10/3; mock runner).

- **A — preflight surfacing: PASS.** Root-refusal line on stderr + exit 1
  produced: `runner output (last 2 line(s)):` with the verbatim refusal,
  then the `IS_SANDBOX=1` hint pointing at operations.md;
  `loop-state.json` stamped `terminal:error` with the error text. The
  derived-budget log ("defaulted to 3 (pending 1 + 2, policy cap 10)")
  appeared as designed.
- **B — per-iteration timeout: PASS.** `sleep 60` build with
  `--max-iteration-minutes 0.05 --max-consecutive-failures 2`: two
  iterations killed at "per-iteration cap, 0.05 minute(s)", blocked in
  **6s total** against a 600s wall budget; BLOCKED.md written; HEAD =
  "Record loop run journal (blocked)"; heartbeat `terminal:blocked`.
- **C — verifier fail → revert → blocked: PASS.** Evidence file carried
  verdict, usage JSON, and the verbatim transcript; journal carried
  `verifyEvidence` path + flattened excerpt + `tokens: ... total=1300`;
  task reverted then blocked; journal committed alone; CLI summary
  appended "1300 tokens".
- **D — token cap: PASS.** Fixture policy `max_total_tokens: 1200`, honest
  1300-token iterations → `budget_exhausted` "token cap reached (1300 >
  1200 total tokens) with 1 task(s) remaining"; statuses done/pending
  (resumable); `--json` carried `totalTokens`.
- **E — real mini run: PASS.** `IS_SANDBOX=1
  AGENTIC_CLAUDE_ARGS="--dangerously-skip-permissions" ./scripts/agentic
  loop --max-iteration-minutes 20` over T-018/T-019 (claude runner):
  preflight passed; derived budget 5 (3 open + 2); `agentic status`
  showed `RUNNING starting (preflight, 5s ago)` then `RUNNING iteration
  1/5 on T-018 (build, 11s ago)` live mid-run; **2/2 iterations
  first-try verified in 1101s**; per-iteration journal tokens
  `total=6364513` (T-018) and `total=3811398` (T-019), run total
  **10,175,911** — 98% cache reads, confirming the all-fields `total`
  design; verifier transcripts persisted for both tasks; run ended with
  the harness committing its own journal ("Record loop run journal
  (success)") and a clean tree; `status` now reports `loop: last run
  success at 2026-07-23T07:33:16Z`. Products verified by hand:
  `finops-framework-mcp --version` → "v1.0.0 (data v2.1.1)" exit 0;
  cheerio in devDependencies with `derive` still byte-stable.

Harness suite grew 211 → 245 tests; `npm run test|lint|typecheck` green
after every task (T-012's completion summary says "228 tests" — the true
count was 227; corrected here). Repo gates PASS before every commit.

## Open questions

- None blocking — scope, method, and validation depth owner-approved
  2026-07-23 (AskUserQuestion round; "Go" with overnight autonomy).
