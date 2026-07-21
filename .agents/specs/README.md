# Specs — when to write one (the effort dial)

Specs are cheap, disposable planning artifacts, not ceremony. Match the effort
to the work; the evidence says heavyweight spec-driven development can be 10x
slower than small iterative changes, while unplanned large work industrializes
the wrong thing.

## The dial

| Size of work | Process |
|---|---|
| Small: bug fix, rename, doc tweak, single-file change with an obvious end state | **No spec.** Just do it: implement, gates, commit. Optionally `tasks add` if you want it tracked. |
| Medium: one feature, a handful of files, fits in 2–5 tasks | **No spec required**, but decompose via `/plan-feature` so each task fits one context window and has acceptance criteria. |
| Large: new subsystem, cross-cutting change, anything with real design choices or unknowns | **Write a spec** from `TEMPLATE.md`, get a **human to validate it**, then `/plan-feature` to generate tasks referencing the spec. |

Rule of thumb: if you can state the acceptance criteria in one breath, skip the
spec. If writing the criteria forces you to make decisions, that is the spec
telling you it needs to exist.

## Mechanics

- Copy `TEMPLATE.md` to `.agents/specs/<kebab-case-name>.md`. Keep it at or
  under one page — a spec that needs more is describing work that needs splitting.
- The human checkpoint for large work is mandatory: a wrong spec turns the
  loop into a machine for building the wrong thing quickly.
- Link tasks to the spec via `./scripts/agentic tasks add ... --spec
  .agents/specs/<name>.md`.
- Specs are disposable. If implementation reveals the spec is wrong, do not
  patch around it — update or rewrite the spec (own commit), note it in
  `decisions.md` if the change reverses a decision, and regenerate the
  remaining tasks.
