## 2026-07-13 — independent review & fix session

- did: adversarial review of the harness, hooks, CI, and cross-file contracts
  (11 verified findings); fixed all of them — plan mode reimplemented (single
  planner iteration judged on task-count increase, never blocks tasks),
  symlink-safe CLI entry, AGENTIC_LOOP=1 now exported to runners so the Stop
  hook engages, blocked tasks restartable via `tasks start`, integrity gate
  handles git-quoted (non-ASCII) paths via NUL-separated diffs, optional gates
  skip on exit 127, presets ship coverage as an inactive placeholder, hermetic
  tests immune to AGENTIC_* env leakage, `--task` on a blocked task reports
  blocked not success, protect-policy hook finds the repo root from
  subdirectories, EPIPE-safe stdout. One reviewer finding overruled with
  evidence: Copilot `--output-format json` IS documented (research verifier
  correction #1); stale dimension report got a correction banner instead.
- result: 98/98 tests; `gates --tier all` green; fresh-project init + gates
  behave correctly (coverage skips instead of hard-failing).
- next: push for owner review.
