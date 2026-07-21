# Roadmap — product intent

<!--
  The owner's prioritized feature backlog: the tier ABOVE specs and tasks.
  One entry per feature, newest thinking wins, ordered by priority.

  Entry format:
    ## <feature title>  —  <status>
    One paragraph: what and why. Links to design/spec once they exist.

  Statuses: idea → designing → specced → building → done (or dropped).
  Flow: idea lands here → /design-feature produces docs/designs/<slug>.html
  + .agents/specs/<slug>.md and sets "designing" → owner approves the design
  (the human checkpoint) → /plan-feature decomposes the spec into tasks.json
  and sets "building" → loop completes the tasks → "done".
  Small fixes skip this file entirely — the effort dial applies.
-->

## Feature design pipeline — done

Owner-defined path from intent to supervised execution: this file, rich
self-contained HTML design docs ([docs/designs/](../docs/designs/)), the
`design new|check|publish` and `serve` harness commands, the `designs` privacy
gate, and the `/design-feature` skill.
Design: [docs/designs/design-pipeline.html](../docs/designs/design-pipeline.html) ·
Spec: [specs/design-pipeline.md](specs/design-pipeline.md)

## Integration branching mode — done

Configurable `branching:` in approvals.yaml: task branches auto-merge to dev
on green CI (generated integration ruleset), humans merge one rolling
"Release: dev → main" PR (release-pr.yml). Convention adopted from dli-skills.

## Conflict-free journal directory — done

`.agents/journal/` — one dated file per session/loop run, never edit another
session's file; enables parallel auto-merges without journal conflicts.
Convention adopted from dli-skills.
