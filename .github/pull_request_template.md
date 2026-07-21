## What & why

<!-- 2-5 sentences: what changed and why it was needed. Link the spec in .agents/specs/ if one exists. -->

## Task ID(s)

<!-- e.g. T-014 (from .agents/tasks.json). One task per PR. -->

## Evidence

<!-- Paste the relevant tail of `./scripts/agentic gates --tier full` output.
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

- [ ] Gates green locally, including `./scripts/agentic gates --tier full`
- [ ] Memory bank updated (`.agents/memory/activeContext.md`, `decisions.md` if a decision was made) and journal appended
- [ ] Exactly one task in this PR; task completed via `./scripts/agentic tasks complete <id>` (hash chain intact)
- [ ] Behavior changes were exercised, not just compiled — evidence pasted above
- [ ] No tests deleted or weakened; no `.only`/`fit`/`fdescribe` left behind
