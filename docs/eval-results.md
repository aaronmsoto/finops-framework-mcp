# Eval results — Phase 5

Suite: `evals/framework/eval.xml` (10 read-only, independent, verifiable
questions requiring multi-step server use). Constraint honored from critique
M6: **tools-only** — the eval agent never reads resources, code, docs, or
data files.

## Method

1. Every expected answer was first solved by the author *through the live
   server* (stdio, via `evals/framework/mcp-call.mjs`) and cross-checked
   against the committed artifact.
2. A **fresh agent session** (subagent with no build context, explicitly
   forbidden from reading the repo) answered all 10 questions using only
   `mcp-call.mjs list-tools` / `call`. Total cost: 10 tool calls +
   `list-tools`, no errors hit.
3. Answers graded against `<expected>`; grader = build session, criteria =
   factual match on the verifiable elements.

## Run 1 — 2026-07-21, artifact v1.0.0, server 0.1.0

| # | Question (short) | Verdict | Notes |
|---|---|---|---|
| 1 | Ownership → capability + 3 Crawl characteristics | **PASS** | allocation + 3 correct characteristics; unofficial-parsing caveat relayed unprompted |
| 2 | Sustainability prerequisites + officialness | **PASS** | allocation @ crawl; correctly labeled unofficial inference with evidence |
| 3 | Anomaly Management's domain + siblings | **PASS** | understand-usage-and-cost; all 3 siblings |
| 4 | Forecasting featured KPIs | **PASS** | all 4 slugs exact |
| 5 | AAI formula + official related capabilities | **PASS** | formula exact; all 3 capabilities |
| 6 | Crawl allocation sample goal | **PASS** | "at least 70% to known owner" (+ Walk/Run context) |
| 7 | Principle enabled by Allocation | **PASS** | "Everyone takes ownership for their technology usage" |
| 8 | Procurement named activities among 3 capabilities | **PASS** | budgeting + rate-optimization, not allocation — one call |
| 9 | KPI library size + 2 unit-economics KPIs | **PASS** | 88; both KPIs with formulas |
| 10 | Pre-Crawl officialness | **PASS** | 3 official levels; extension explained precisely |

**Score: 10/10 (gate requires ≥9/10).**

## Fixes driven by the run's friction notes

The agent passed everything but reported three usability findings; two were
fixed immediately (commit following this file), one recorded as a known
limitation:

1. **Fixed** — `get_kpis` gained a `slug` parameter for single-record lookup
   with nearest-match errors (the agent had tried `slug` and zod silently
   stripped it, forcing a page-1 scan).
2. **Fixed** — `get_kpis(capability, featured_only: true)` now means
   "featured on that capability's page" (was: related-to-X AND
   featured-anywhere, which returned 6 rows for forecasting instead of 4).
3. **Known limitation** — unknown/mistyped tool parameters are silently
   dropped by input validation rather than erroring (SDK zod behavior, e.g.
   `level` instead of `maturity` on `get_actions`). Mitigation: parameter
   names are spelled out in every description; revisit if the SDK exposes
   strict-mode input schemas.

The build the panel of critics receives in Phase 6 includes both fixes; the
regression tests for them live in `src/servers/framework/server.test.ts`.

## Eval design note

Question 6 could not initially be answered tools-only — maturity-model
sample goals existed only in the `finops://framework/maturity-model`
resource. That gap produced the `get_maturity_model` tool *before* the fresh
run, which then used it correctly. The suite thus already caught one
resource/tool parity violation, which is exactly what it is for.

## Run 2 — 2026-07-21 (post critique gate 2), artifact v1.1.0

Same protocol, two hardenings: the agent was restricted to **text content
blocks only** (ignoring structuredContent — the host class critique-2 B1'
was about), and two questions were swapped to probe the fixed surfaces
directly: Q5 → the Effective Savings Rate formula (the record most mangled
by the formula-segmentation blocker), Q10 → full principle text via the new
`get_entity` tool. Q2's expectation follows the corrected inference pass
(zero prerequisite edges is the honest state).

| # | Probe | Verdict | Notes |
|---|---|---|---|
| 1 | Ownership → allocation + Crawl characteristics | **PASS** | identical quality to Run 1, from text blocks |
| 2 | Sustainability prerequisites (now honestly empty) | **PASS** | "0 official, 0 inferred" + no-official-graph caveat relayed |
| 3 | Anomaly Management domain + siblings | **PASS** | |
| 4 | Forecasting featured KPIs | **PASS** | exactly 4 (B1'/featured-filter fix verified) |
| 5 | **ESR formula** + featured page | **PASS** | both formula options exact; rate-optimization (B2' fix verified) |
| 6 | Crawl allocation sample goal | **PASS** | |
| 7 | Principle enabled by Allocation | **PASS** | |
| 8 | Procurement across 3 capabilities | **PASS** | |
| 9 | KPI count + unit-economics KPIs | **PASS** | |
| 10 | **Full data-principle text** via get_entity | **PASS** | exact title + bullet (M3' fix verified) |

**Score: 10/10 (gate requires ≥9/10).** Friction notes: `get_entity`'s
required field name was recovered from the validation error rather than the
description (description now names it); Q8's singular "which" was ambiguous
(question wording, not server); crawled typos ("Cost ALlocation") preserved
verbatim — faithful crawling. The agent explicitly praised the
provenance/license footers and official-vs-unofficial flags.

## Run 3 — 2026-07-23 (v1 surface, post-loop), artifact v2.1.1, server 1.0.0

Context: the v1 descope build (loop tasks T-005..T-009) deleted the
relationship graph, hid Actions/Pre-Crawl behind `FINOPS_MCP_EXPERIMENTAL`,
and introduced `get_maturity_assessment` serving verbatim official prose.
Same fresh-agent, text-blocks-only protocol; Q2/Q10 revised for the v1
surface (verbatim official quotes; official-levels-only check).

| # | Probe | Verdict | Notes |
|---|---|---|---|
| 1 | Ownership → allocation + Crawl characteristics | **PASS** | answered via the new get_maturity_assessment |
| 2 | **Verbatim Walk-level Sustainability quotes** | **PASS** | both quotes byte-exact against maturity_raw |
| 3 | Anomaly Management domain + siblings | **PASS** | |
| 4 | Forecasting featured KPIs | **PASS** | exactly 4 |
| 5 | AAI formula + related capabilities | **PASS** | used get_kpis slug lookup |
| 6 | Crawl allocation sample goal | **PASS** | |
| 7 | Principle enabled by Allocation | **PASS** | |
| 8 | Procurement across 3 capabilities | **PASS** | |
| 9 | KPI count + unit-economics KPIs | **PASS** | formulas included |
| 10 | **Official levels only** | **PASS** | exactly Crawl/Walk/Run; no pre-crawl volunteered |

**Score: 10/10 (gate requires ≥9/10).** Friction notes: source typos
preserved verbatim (fidelity, not a bug); `get_capability` text block is
serialized JSON rather than prose (by design — the markdown path is the
resource/get_maturity_assessment/get_entity surface); map_personas conveys
"no activities" by absence. No errors; every slug resolved first try.

## Run 4 — 2026-07-24 (post critique gate 3), artifact v2.1.1, server 1.0.0

Context: critique-3 (docs/critique-3-publish-gate.md, verdict SHIP-after-fixes)
required five fixes before publish: the npm bin guard BLOCKER, cursor
context binding, full capability summaries, map_personas attribution, and
the get_kpis outputSchema declaration. All landed as T-020..T-024. Same
fresh-agent, tools-only, text-blocks-only protocol as Runs 1-3. Grading
note: graded by the supervising session against the pre-registered
`<expected>` answers (all objective factual matches); an independent
re-grade pass is queued in the template's review backlog.

| # | Probe | Verdict | Notes |
|---|---|---|---|
| 1 | Ownership → allocation + Crawl characteristics | **PASS** | routed by search on first try |
| 2 | Verbatim Walk-level Sustainability quotes | **PASS** | both quotes exact |
| 3 | Anomaly Management domain + siblings | **PASS** | |
| 4 | Forecasting featured KPIs | **PASS** | exactly 4 |
| 5 | AAI formula + related capabilities | **PASS** | slug guessed correctly first try |
| 6 | Crawl allocation sample goal | **PASS** | "at least 70% to known owner" |
| 7 | Principle enabled by Allocation | **PASS** | verbatim |
| 8 | Procurement across 3 capabilities | **PASS** | one map_personas call |
| 9 | KPI count + unit-economics KPIs | **PASS** | 88; both KPIs |
| 10 | Official levels only | **PASS** | exactly Crawl/Walk/Run |

**Score: 10/10 (gate requires ≥9/10).** Friction: only KPI slug guessing
(worked first try; a miss costs one search round-trip — the critique-3
MINOR queue covers slug discoverability). Zero errors, zero wrong-tool
detours, zero pagination problems on the fixed surfaces.

# Focus suite (`evals/focus/eval.xml`)

Same protocol as the framework suite: fresh-agent, tools-only,
text-blocks-only, graded by the supervising session against the
pre-registered `<expected>` answers via
`node evals/framework/mcp-call.mjs --server=focus`.

## Focus Run 1 — 2026-07-28 (post loop T-027..T-038), data 1.0/1.2, server 1.0.0

| # | Probe | Verdict | Notes |
|---|---|---|---|
| 1 | Versions served + counts | **PASS** | 1.0/1.2, latest 1.2; 43+9 / 57+9 |
| 2 | BilledCost 1.0 type/level/nulls | **PASS** | Metric; Mandatory; Decimal; non-null |
| 3 | Mandatory columns in 1.2 | **PASS** | 21 via feature_level filter |
| 4 | "commitment discount" search hits (1.0) | **PASS** | 9 hits; titles named |
| 5 | Currency Format attribute + ISO 4217 | **PASS** | verbatim MUST clause |
| 6 | BilledCost 1.2 InvoiceId reconciliation | **PASS** | verbatim requirement bullet |
| 7 | Full 1.0→1.2 diff counts | **PASS** | 14 added / 0 removed / 43 changed |
| 8 | CommitmentDiscountQuantity provenance | **PASS** | added in 1.2 |
| 9 | rate-optimization KPI mapping (1.2) | **PASS** | 4 KPIs; UNOFFICIAL banner present |
| 10 | ESR columns + formula (1.0) | **PASS** | 4 columns; formula in substance; unofficial |

**Score: 10/10 (gate requires ≥9/10).** Friction: `get_attribute`'s
parameter is `slug`, which the agent had to discover from the schema
(description gap — queued as a MINOR alongside the critique-4 queue); no
errors, no wrong-version answers, cursor pagination unused (limits
sufficed).

## Combined two-server scenario — 2026-07-28 (`evals/focus/combined-scenario.xml`)

Fresh agent drove both servers through the eval bridge: framework
`get_capability` (rate-optimization) → featured KPIs → focus
`get_kpi_mapping` per version → `compare_versions` → `calculate_kpi`.
**PASS end-to-end**: slugs flowed framework→focus first try; 6 distinct
FOCUS columns cover all 4 featured KPIs across both versions; ESR over the
official 1.0 sample = 26.552972346576816%; the three commitment KPIs
returned 0%/100%/0 on a sample with no commitment-purchase rows — flagged
in the practitioner summary as a data limitation, which critique gate #4
subsequently confirmed as a MAJOR defect (C3-version-1/C4-community-2:
must error/not-computable instead of definite numbers); unofficial
flagging consistent on every derived answer. Friction: framework
`assess_maturity_path` parameter names required a schema look;
`compare_versions` per-column output is field-level, not value-level.
