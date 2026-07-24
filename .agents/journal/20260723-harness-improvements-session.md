# 2026-07-23 — Loop-harness improvements built here, proven, ready for port-back

Supervised session (owner asleep, overnight autonomy granted: "Go"). Scope
owner-picked earlier via question round: retro items 9–14 + 16b, supervised
build, mock + real-run validation. Full contract and results:
`.agents/specs/loop-harness-improvements.md`.

## What happened

- Branch restarted from origin/dev (PR #4 squash-merged; remote session
  branch auto-deleted by delete_branch_on_merge — pruned and re-pushed).
- T-010..T-016 implemented one commit per task, hash chain intact; harness
  suite 211 → 245 tests, `npm run test|lint|typecheck` green after every
  task (correction: T-012's summary says 228 tests, true count was 227).
- Validation: mock scenarios A–D all PASS against the built dist in scratch
  fixtures; real run E on T-018/T-019 (claude runner, headless container
  profile) — success, 2/2 first-try verified, 1101s, 10,175,911 total
  tokens (98% cache reads), heartbeat observed live via `agentic status`
  mid-run, verifier transcripts persisted, harness committed its own run
  journal leaving a clean tree. Evidence quotes in the spec's validation
  log.
- The v1.1 mini-batch the loop built is real product work: cheerio now
  lazy-loaded and dev-only (`59792f8`), `--version` flag on the bin
  (`8494941`) — both hand-verified post-run.

## Dogfooding note

The improved harness supervised the run that validated it: the derived
iteration budget, per-iteration cap flag, live status line, token journal
lines, and terminal journal auto-commit all appeared in one production run
before being declared portable.

## Stop-hook interaction worth recording

Mid-run, the supervising session's stop hook flagged "uncommitted changes"
while the loop's runner legitimately held `.agents/tasks.json` dirty
between `tasks start` and its own commit. Correct call: do NOT commit the
loop's in-flight state from outside — it would break the iteration's
one-commit/one-task checks. A supervising session should treat a live
loop's workspace as off-limits (candidate template-docs note for the
port-back).

## For the template port

All seven items verdict **port** (one "review deviation": fractional
max_iteration_minutes). Deviations list + changed-file surface in the spec.
Port session should also consider harness-CI (this repo's gates never run
the harness's own suite — gap noted during planning).
