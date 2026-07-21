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
