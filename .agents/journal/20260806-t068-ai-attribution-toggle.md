# 2026-08-06 — T-068 make the no-AI-attribution policy configurable

## Diagnosis: it was the PR body, not the commits — 2026-08-06T03:00:00Z

The owner reported PR #12 CI-blocked by the attribution rule. Checked before
acting, and the stated cause was not quite right:

- PR #12's nine commits are **clean** — `git log origin/main..` matched none
  of the `AI_ATTRIBUTION_RES` patterns. The prepare-commit-msg hook is
  working.
- `gates-fast` **passed**. The failing check is `governance`, on a step PR #12
  itself introduces:
  `##[error]PR body contains an AI-attribution footer (owner policy).`

So the rule has **four** enforcement points, not one, and only the fourth was
firing: the hook (commit messages), the integrity gate (commit messages),
`.github/workflows/ci.yml`'s PR-body grep (PR #12's branch only), and the
AGENTS.md prose.

The PR-body check is the one that cannot be satisfied by the tooling that
opens the PRs: agent tooling appends the footer on submission and re-appends
it afterwards — ci.yml's own comment says so, which is why it listens to the
`edited` event. That is a permanent, self-inflicted red CI.

## Fix: one owner-policy key, four consumers — 2026-08-06T03:10:00Z

`approvals.yaml` gains `ai_attribution: forbid|allow`, default **forbid** so
every other repo built from this template is byte-unchanged. This repo sets
`allow` (owner: "for this repo, the Claude Code attribution lines are okay").

- `config.ts` — `AiAttributionMode` type, parsed and validated, documented.
- `integrity.ts` — `runIntegrity` takes `opts.aiAttribution` (defaults to the
  strict `forbid`); check 5 iterates an empty pattern list when allowed. The
  subject-length check shares that loop and is deliberately NOT gated, so it
  still runs.
- `cli.ts` — loads approvals once and passes both `base` and `aiAttribution`;
  an unreadable approvals.yaml still falls back to `forbid`.
- `scripts/git-hooks/prepare-commit-msg` — greps approvals.yaml for the key
  and exits early when allowed. Grep, not a parser: the hook must stay
  dependency-free and must never block a commit.
- `AGENTS.md` — the rule is now stated as configurable, naming this repo's
  setting, instead of as an absolute.

## Evidence

- **Hook, both directions**: with `allow`, a message carrying
  `Co-Authored-By: Claude...` + `Claude-Session:` comes back byte-identical;
  against a scratch repo whose approvals.yaml says `forbid`, the same message
  is stripped to subject + body. Default behavior preserved.
- Harness tests: **248 passed (14 files)**, none edited.
- Integrity gate probed both ways against real history (below).

## Not done here: ci.yml

The PR-body check lives in `.github/workflows/ci.yml` **on PR #12's branch**,
not on main — this branch still has the pre-split ci.yml with no body check
at all. Editing ci.yml here would collide head-on with #12's full rewrite of
that file. So the body check does not yet consult `ai_attribution`, and the
sequence has to be:

1. Unblock #12 once by removing the footer from its PR description.
2. Merge #12 (its ci.yml lands on main).
3. Patch that check to read `ai_attribution` from approvals.yaml — a small
   authorized follow-up, no harness needed (the check runs before harness
   acquisition, so it must grep the file directly, exactly like the hook).

Until step 3, PRs opened by agent tooling keep failing `governance`.
