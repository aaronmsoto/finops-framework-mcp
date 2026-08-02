# 2026-08-02 — T-053: map-kpi-to-focus-columns prompt (review MCP-4)

## Task

`docs/final-status-review.md` MCP-4: `get_kpi_mapping`/`calculate_kpi` are
the focus server's most caveat-laden tools (UNOFFICIAL derived mapping,
partial formula coverage, bundled-sample-only computation) yet had no
guided prompt — `src/servers/focus/prompts.ts` registered only
`explain-focus` and `map-column-across-versions`. Fix: add a third prompt
mirroring the existing pattern.

## What I did

Added `map-kpi-to-focus-columns` to `src/servers/focus/prompts.ts`:

- Args: `kpi` (optional, completable — KPI slugs from
  `store.kpiMapping.kpis`), `capability` (optional, completable — dedup'd
  `related_capability_slugs` across the mapping), `version` (optional,
  completable, default `DEFAULT_VERSION`).
- `kpi` given + found: embeds the mapped FOCUS `version` columns as
  resource content (reusing `columnMd`, same helper `map-column-across-versions`
  uses), then an UNOFFICIAL-framed instruction telling the model to call
  `get_kpi_mapping(kpi: ...)` for the formula and `calculate_kpi(kpi: ...,
  version: ...)` for a computed value over bundled sample data, and to cite
  the caveat if one exists.
- `kpi` given + not found: guidance-only response (no throw), mirroring how
  the framework server's `assess-capability-maturity` handles an unknown
  capability slug.
- `capability` given (no `kpi`): tool-call guidance pointing at
  `get_kpi_mapping(capability: ..., version: ...)`, listing the currently
  mapped KPI titles for immediate feedback, then telling the model to
  re-invoke this prompt per-KPI. No resource embedded here — there's no
  per-capability-of-KPIs renderer, and tool-call guidance is the
  spec-sanctioned alternative to embedding (acceptance criterion said
  "embedded resource OR tool-call guidance").
- Neither arg: bare tool-call guidance (call `get_kpi_mapping` with no
  args, then re-invoke this prompt with a slug).

## Bug found and fixed along the way

Wiring up completion for `kpi`/`capability` surfaced that
`completable(schema, fn).optional()` silently returns no completions. The
SDK's `completable()` (`@modelcontextprotocol/sdk/server/completable.js`)
attaches a non-enumerable symbol property directly to the schema object
passed in; zod v4's `.optional()` doesn't mutate in place, it returns a new
`ZodOptional` wrapper object, so the property — and with it the completion
callback — never survives being chained after `completable()`. Confirmed
with a standalone repro:

```js
import { z } from "zod";
import { completable, isCompletable } from "@modelcontextprotocol/sdk/server/completable.js";
const s = completable(z.string(), (v) => ["a", "b"]);
isCompletable(s);            // true
isCompletable(s.optional()); // false
```

This is exactly the shape of the critique-2 M1' `.describe()` bug already
documented in `framework/prompts.ts` ("`.describe()` must be applied INSIDE
completable(): zod v4 clones on describe and would drop the SDK's
completable marker"), just for `.optional()` instead. It was already
latent in `focus/prompts.ts`'s existing `versionArg(...).optional()` call
sites (`explain-focus`, and now my new prompt) — untested before because
no test exercised prompt-argument completion in this file.

Fixed by moving `.optional()` inside the `completable()` call (i.e.
`completable(z.string().optional().describe(desc), ...)`, with
`completable()` staying the outermost/last call as the existing
`.describe()`-inside convention requires) for `versionArg`, and building
`kpiArg`/`kpiCapabilityArg` the same way from the start. Dropped the
now-redundant trailing `.optional()` at all three call sites. This
incidentally fixes `explain-focus`'s `version` argument completion too,
which was equally broken before — no test asserted the old (broken)
behavior, so nothing regressed.

## Verification

- `vitest run src/servers/focus/server.test.ts`: 59/59 passed, including
  new tests — prompt list (`lists the three workflows`), `getPrompt` with
  `kpi` (embeds columns, UNOFFICIAL + `calculate_kpi` in the instruction
  text), the capability/no-arg tool-call-guidance fallbacks, and a
  `client.complete()` call for the `kpi` argument.
- `./scripts/agentic gates --tier all`: PASS (format, lint, typecheck, 389
  tests, designs, integrity, memory, build).
- Live probe against the built `dist/` via an in-memory MCP client
  (`InMemoryTransport`), loading the real `data/focus` artifact:
  - `prompts/list` → `["explain-focus", "map-column-across-versions",
    "map-kpi-to-focus-columns"]`.
  - `getPrompt({kpi: "effective-savings-rate-percentage"})` → 4 embedded
    `focus://spec/1.2/columns/...` resources (billingperiodstart,
    billingperiodend, listcost, effectivecost) + one UNOFFICIAL-framed
    instruction message naming `get_kpi_mapping`/`calculate_kpi`.
  - `complete` on `kpi="effective"` → `["effective-savings-rate-percentage",
    "effective-average-compute-cost-per-core"]`; on `capability="rate"` →
    `["rate-optimization"]`; on `version="1"` → `["1.0", "1.2"]`.
  - `getPrompt({capability: "rate-optimization"})` and `getPrompt({})` both
    return the expected tool-call-guidance text.

## Next

T-054..T-059 queued (see git log for backlog order). Rest of the
19-MINOR list in `docs/final-status-review.md` still open.
