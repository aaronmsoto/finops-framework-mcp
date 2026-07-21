## Flip repo to integration branching + merge-method enforcement — 2026-07-14

- did: per owner instruction — (1) rulesets now pin merge methods via the
  GitHub `allowed_merge_methods` pull_request parameter (verified against
  the REST rulesets docs): integration ruleset requires a PR with ZERO
  reviews, gates-fast green, and SQUASH-only into dev; main ruleset adds
  MERGE-commit-only for dev → main. Both configurable
  (branching.integration_merge_method / release_merge_method, defaults
  squash/merge). (2) Flipped THIS repo to branching.mode: integration and
  compiled (fifth surface generated, gh-pr-merge ask dropped). (3) Created
  dev from main, squash-merged the pending branch work into it, pushed;
  rolling Release PR set up (release-pr.yml on dev pushes, manual fallback
  if Actions PR-creation is disabled).
- result: 148 tests incl. merge-method coverage; gates green; enforcement
  spot-checked in generated JSON (dev: 0 reviews/squash; main: 1 review/merge).
- next: owner morning checklist — import BOTH rulesets, enable "Allow
  auto-merge" + "Allow GitHub Actions to create PRs" in repo settings, then
  merge the rolling Release PR whenever ready.
