# 2026-08-06 — Pages live; T-067 solo-maintainer ruleset fix

## GitHub Pages is live — 2026-08-06T02:35:00Z

PR #11 merged (`899a2d4`). The first `pages` run fired on the merge and
**failed** — a pure timing race, not a config error:

```
##[error]Get Pages site failed. Please verify that the repository has Pages
enabled and configured to build using GitHub Actions. Error: Not Found
```

The run started 02:27:17, before the owner set Settings → Pages → Source =
GitHub Actions. The guard step had already passed (all seven files present).
Re-dispatched via `workflow_dispatch`; run #2 succeeded.

Verified against the real site, not the workflow's say-so:

- `/` and all five other guide pages → **200 (6/6)**; `/no-such-page` → 404.
- **Leak check**: `/critique-1.md`, `/final-status-review.md`,
  `/eval-results.md`, `/mcp-surface.md`, `/README.md` → **404 each**. The
  guide-only upload holds in production, which is what keeps the internal
  review docs off the web while the repo is private.
- **Byte-identity**: sha256 of all seven deployed files == the committed
  `docs/guide/*` files. What is served is exactly what is in the repo.
- `<title>`, `canonical` and "Page 1 of 6" all correct on the live root.

Chromium could not render the live URL (`ERR_CONNECTION_RESET` — this
sandbox's Chromium cannot traverse the agent proxy, with or without the
`proxy:` option). Not chased: curl already proves status, content and
byte-identity, and the identical bytes were rendered headlessly earlier.

## T-067: fix the solo-maintainer ruleset deadlock — 2026-08-06T02:40:00Z

**The bug.** `compileRuleset` emitted `required_approving_review_count: 1` +
`require_code_owner_review: true` whenever `merge_to_main: human`, and
CODEOWNERS names only the owner. GitHub forbids approving your own PR, so on
any solo-maintained repo every owner-authored PR is permanently unmergeable —
"Request Review" is the only button GitHub can offer. Hit for real on PR #11.

**The fix** (owner explicitly authorized the `approvals.yaml` edit):

- New top-level `solo_maintainer: boolean` in approvals.yaml, defaulting to
  **false** (`config.ts`: typed, validated, documented).
- `compileRuleset`: when set, `required_approving_review_count: 0` and
  `require_code_owner_review: false`. Requiring a PR, green `gates-fast`,
  deletion and non-fast-forward protection all still apply.
- `derivedPermissions`: when set, `Bash(gh pr merge*)` returns to the ask
  list **even in integration mode**. That rule was deliberately dropped in
  integration mode *because* main was gated server-side by the code-owner
  review — remove that gate and the client-side prompt has to come back, or
  merges to main end up ungated on both sides. This is the part that keeps
  the fix from being a straight weakening.

**Rejected alternative:** emitting a `bypass_actors` entry for the Repository
admin role. It preserves the review requirement for non-admins, but requires
hardcoding GitHub's numeric `RepositoryRole` id into a generated file. I
could not verify that id from here (the rulesets API is read-only through
this proxy, and the live ruleset has no bypass entry to read it from), and
guessing wrong would silently grant bypass to the wrong role. On a repo with
exactly one write account the two designs are equivalent in effect, so the
id-free one wins.

**Evidence.**

- Both branches probed directly against the built compiler:
  `solo=false → reviews=1, codeowner=true, gh-pr-merge-ask=false`;
  `solo=true → reviews=0, codeowner=false, gh-pr-merge-ask=true`.
  Default-false output is unchanged, so no existing repo is affected.
- Harness tests: **248 passed (14 files)**, none edited
  (`.agentic/harness/tests/**` is a protected path).
- `./scripts/agentic approvals compile` → regenerated 5 surfaces;
  `approvals check` → "no drift". Diff is exactly the intended three lines:
  ruleset counts, `Bash(gh pr merge*)` into settings ask, matching
  copilot.sh deny. CODEOWNERS unchanged; settings.json hooks intact.
- `./scripts/agentic gates --tier all` → **PASS** on every gate.

**Owner action still required.** This only fixes the *generated* file. The
live ruleset on GitHub still has `required_approving_review_count: 1` and
`require_code_owner_review: true` (confirmed via API after the merge —
`bypass_actors` is still null, so however PR #11 got merged, it was not via a
bypass actor). Settings → Rules → Rulesets → main-branch has to be updated to
match, or the next PR deadlocks again.
