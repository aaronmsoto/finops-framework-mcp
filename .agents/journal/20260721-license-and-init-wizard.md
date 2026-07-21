# 2026-07-21 — License handling + init wizard

## Give derivatives their own LICENSE and init an interactive wizard — 2026-07-21

- did: two-license structure (`.agentic/LICENSE` carries the template's MIT
  notice into every derivative; root LICENSE is the project's); `init
  --license mit|apache-2.0|proprietary|keep` + `--license-holder` with texts
  as data in `.agentic/licenses/` (Apache verbatim from apache.org, NOTICE
  file per convention; proprietary deletes LICENSE + package.json
  UNLICENSED; keep = default, reminder only). New TTY-only wizard
  (`src/wizard.ts`, injectable IO): missing init flags prompt with defaults
  (name←dirname, preset←typescript, branching←trunk, runner←claude,
  license←keep, holder←git user.name); non-TTY keeps the strict usage
  error so agents/CI can never hang. Docs: architecture CLI table,
  getting-started (flags, wizard, Licensing section), INSTANTIATE.md
  step-0 params + init command, skill, README license section.
- result: 12 new tests (8 license via CLI incl. headless-no-wizard guard,
  4 wizard via injected IO), full suite 191/191; live smoke: init --license
  mit/proprietary behave as specified in a scratch repo. Gates: all pass
  EXCEPT integrity, which correctly flagged a Co-authored-by trailer in
  origin/dev commit 835092c — GitHub's default squash message (API merge of
  PR #10 passed commit_title without commit_message) planted it; not this
  diff (integrity --base origin/dev is clean). Prevention encoded:
  MEMORY.md invariant 8, getting-started squash-message trap, INSTANTIATE
  owner checklist. Cleanup of dev history is owner-only (force-push).
- next: owner cleans dev (rewrite or one-time admin release); dev PR for
  this change goes green after that; rolling Release PR carries it to main.
