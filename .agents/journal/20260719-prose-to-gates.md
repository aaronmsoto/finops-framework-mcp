## Convert prose-only rules to deterministic checks — 2026-07-19

- did: enforcement sweep against principle #2 found three prose-only rules;
  all converted. Integrity gate now FAILS append-only-history violations
  (modifying/deleting another session's .agents/journal/ file — additions and
  README.md exempt — and removed lines in decisions.md) and WARNS on commit
  subjects over 72 chars (Merge commits exempt). Designs gate WARNS on HTML
  files in documentation trees (docs/**, .agents/**) outside docs/designs/.
  Contract and journal README updated. Structural non-conversions recorded:
  Copilot-side in-session enforcement (no hook surface; CI/rulesets backstop)
  and pre-push-not-pre-commit gating (deliberate).
- result: 175/175 tests (6 new); all gates green; repo's own history clean
  under the new checks.
- next: ship via dev PR; rolling Release PR carries it to main.
