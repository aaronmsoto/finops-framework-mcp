# Spec: <feature name>

<!-- Copy to .agents/specs/<kebab-case-name>.md. Keep the whole spec to one
     page or less. Every section required; write "None" rather than deleting.
     For large work, a human must validate this spec BEFORE tasks are
     generated from it. -->

## Problem

What is wrong or missing today, and for whom. 2–4 sentences of observable
reality, not solution language.

## Outcome

What is true when this ships. Concrete and testable: name the commands,
behaviors, or artifacts that will exist. This is the target the acceptance
criteria decompose.

## Non-goals

What this deliberately does NOT cover, especially adjacent things an agent
might be tempted to build "while in there." Scope fences here prevent
overbaking during the loop.

## Acceptance criteria

Checkable statements — each one verifiable by running a command, reading a
diff, or observing behavior. These become task acceptance criteria via
`./scripts/agentic tasks add --acceptance "..."`.

- [ ] ...
- [ ] ...

## Open questions

Decisions not yet made, with the options if known. The human validating the
spec resolves these (or explicitly defers them) before implementation starts.

- ...
