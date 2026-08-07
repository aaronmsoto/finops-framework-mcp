## What & why

<!-- 2-5 sentences: what changed and why it was needed. Link the spec in .agents/specs/ if one exists. -->

## Task ID(s)

<!-- Maintainers: e.g. T-014 (from .agents/tasks.json). One task per PR.
     External contributors: leave as "n/a" — task tracking is maintainer
     tooling. -->

## Evidence

<!-- Maintainers: paste the relevant tail of `./scripts/agentic gates --tier full`.
     External contributors: paste the output of the CONTRIBUTING.md quick-start
     commands (format:check / lint / typecheck / test / build) instead.
     For behavior changes: what did you run, and what did you observe?
     Claims without evidence will be sent back. -->

```
(gate output here)
```

## Approval points touched

<!-- None expected. If this PR touches approvals.yaml, .github/workflows/,
     .claude/settings.json, agentic.config.json gate definitions, or generated
     surfaces (CODEOWNERS, scripts/copilot.sh, rulesets), say so explicitly and
     explain why — these paths require owner review by policy. -->

None.

## Checklist

- [ ] Checks green locally — maintainers: `./scripts/agentic gates --tier full`;
      external contributors: the CONTRIBUTING.md quick-start commands (CI runs
      the same set)
- [ ] Behavior changes were exercised, not just compiled — evidence pasted above
- [ ] No tests deleted or weakened; no `.only`/`fit`/`fdescribe` left behind
- [ ] Maintainers only: memory bank updated and journal appended; exactly one
      task in this PR, completed via `./scripts/agentic tasks complete <id>`
      (hash chain intact)
