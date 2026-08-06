# 2026-08-06 — T-070 ci.yml PR-body check honors ai_attribution

## The last of four enforcement points — 2026-08-06T04:10:00Z

T-072 made `ai_attribution` an owner toggle and wired three of the four
enforcement points (prepare-commit-msg hook, integrity gate, AGENTS.md). The
fourth — `.github/workflows/ci.yml`'s PR-body grep — could not be touched
then: it existed only on PR #12's branch, and editing this branch's pre-split
copy would have collided with #12's full rewrite of the file. #12 has now
merged, so this closes the loop.

**Did** (owner-authorized `.github/workflows/` edit, scope: this one step):
the step now greps `approvals.yaml` for `ai_attribution: allow` and exits 0
when set. Grep rather than the harness CLI is deliberate and load-bearing —
the step runs BEFORE `Acquire harness` and on fork PRs, where the harness is
unavailable; an unreadable approvals.yaml leaves the strict default in place.
The failure message now names the knob instead of only telling the author to
edit the description.

The comment block also records the finding that motivated the toggle: under
`forbid` this check can be **unsatisfiable** for tool-authored PRs, because
the footer is re-appended server-side after submission (observed: a footer
removed via the API was back within minutes, in a different form —
`https://claude.ai/code` where the original carried a session id). The
original comment noted the re-append and added the `edited` trigger to catch
it; the conclusion it did not draw is that no author edit can ever win.

**Evidence.** The step's `run:` block was extracted verbatim from the
committed workflow with a YAML parser (so the shipped script is what was
tested, not a paraphrase) and executed against the real re-appended footer
body under both settings:

```
ai_attribution: allow   -> exit=0  "skipping the PR-body attribution check."
ai_attribution: forbid  -> exit=1  "::error::PR body contains an AI-attribution footer ..."
```

Workflow still parses; jobs `gates-fast` / `gates-full` / `governance` and the
governance step order are unchanged.

## Merge reconciliation

`origin/main` (post-#12) was merged into this branch. Conflicts in
`tasks.json` and `activeContext.md` were resolved by taking main's copy
wholesale and re-adding this branch's tasks through
`tasks add|start|complete`, so the hash chain is harness-computed rather than
hand-patched. Task IDs T-067/T-068 allocated here became **T-071/T-072**;
journal files were renamed to match. Three task records in one PR is a
deliberate deviation from one-task-per-PR — they are one policy thread, and
the owner is merging from mobile.
