# 2026-07-30 — T-041: get_requirements attribution footer + source_url

## Task

T-041 — Attribute get_requirements output: CC BY footer + source_url
(critique gate 4, finding C1-protocol-1, MAJOR).

## What I did

`get_requirements` (`src/servers/focus/tools.ts`) built its bullet-list text
directly with `.join("\n")` and returned a structured payload of just
`spec_version`/`column`/`requirements` — bypassing `render.ts`'s `footer()`
helper that every other content-bearing tool (`get_column`, `get_attribute`,
resources) routes through. Per the gate's evidence, this meant the most
verbatim CC BY 4.0 spec content served by any tool carried no attribution
line and no `source_url` to resolve its own dangling intra-spec anchors
(`[NumericFormat](#numericformat)` etc.).

Fix, minimal per the gate's prescribed fix locus:

- Imported `footer` from `./render.js` alongside the existing
  `attributeMd`/`columnMd` imports (no change to `render.ts` itself — the
  helper already existed and is generic over any `FocusVersionArtifact` +
  source URL).
- `outputSchema` gained `source_url: z.string()` and
  `license: z.literal("CC-BY-4.0")`, mirroring the pair already present in
  `columnRecordSchema`/`attributeRecordSchema` (tools.ts:99-100,112-113).
- The handler now appends `footer(resolved.artifact, c.source_url)` to the
  bullet text (or the "no requirements parsed" fallback text) and includes
  `source_url: c.source_url` / `license: "CC-BY-4.0"` in the structured
  payload.

## Tests

`server.test.ts`'s existing `get_requirements returns the verbatim
MUST/SHOULD bullets` test only asserted on `structuredContent.requirements`
— it wasn't pinning the old footer-less text, so it needed no rewrite.
Added a new case, `get_requirements carries the same CC BY attribution as
get_column`, asserting the text matches the licensed-CC-BY-4.0 substring
and that `structuredContent.source_url`/`license` are present — this is new
coverage of the changed behavior, not a weakening of an existing assertion.

## Evidence

- `./scripts/agentic gates`: PASS (format/lint/typecheck/test/designs/
  integrity/memory all green; test: 365 passed, up from 364).
- `npm run build`: clean (tsc -p tsconfig.build.json).
- Live probe: `node evals/framework/mcp-call.mjs --server=focus call
  get_requirements '{"column":"BilledCost"}'` — text now ends `...Source:
  https://raw.githubusercontent.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/v1.2/specification/columns/billedcost.md
  — © FinOps Foundation, licensed CC BY 4.0
  (https://creativecommons.org/licenses/by/4.0/). Content restructured and
  adapted by focus-spec-mcp (data v1.0.1, crawled 2026-07-30); unofficial
  extensions are always marked.`; structuredContent gained
  `"source_url":"https://raw.githubusercontent.com/.../billedcost.md"` and
  `"license":"CC-BY-4.0"` — matches get_column's attribution verbatim, per
  acceptance criteria.

## Next

T-042..T-047 remain in the gate-4 fix batch (compare_versions unknown-column
status, README "official" phrasing, compare_versions materiality caveat,
calculate_kpi 0/0 guard, KPI mapping version differentiation, cross-version
unknown-column hints, diff artifact official:false marker, package
trademark naming — see activeContext.md for the full list).
