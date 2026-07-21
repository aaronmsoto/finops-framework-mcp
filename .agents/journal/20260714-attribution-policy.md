## 2026-07-14 — owner rejection: remove AI attribution from git artifacts

- did: owner rejected AI-attributed commits/PRs. Inverted the policy end to
  end — prepare-commit-msg hook now STRIPS attribution lines instead of
  adding them; integrity gate gained a hard failure for AI-attribution
  markers in new commit messages (bot Co-Authored-By, session links, Agent:
  trailers, "Generated with" footers; human co-authors unaffected);
  AGENTS.md/patterns.md/MEMORY.md/architecture/getting-started updated;
  decision recorded in decisions.md. Branch history rewritten to strip the
  trailers from all prior commits; PR #1 description corrected.
- result: tests green incl. new attribution regression test; integrity gate
  verified failing on an attributed commit and passing on human co-authors.
- next: confirm CI green on the rewritten branch.
