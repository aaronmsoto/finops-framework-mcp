# Watch note — "Routing AI Requests: An Organizational Guide" (draft)

Status: **parked, waiting for a final version.** Owner decision 2026-10-16:
do not ingest into `data/tokenomics/` until the page stops being a draft.
This note holds everything needed to resume without re-reading the page.

## Source

| Field | Value |
|---|---|
| URL | https://www.tokeneconomics.com/sprint-2-draft-organizational-routing-guide/ |
| Page title | Sprint 2 Draft – Organizational Routing Guide – Tokenomics Foundation |
| Heading | Routing AI Requests: An Organizational Guide |
| Eyebrow | Consumption · Model routing (WG Internal - 2026-10-08) |
| Status line | "Mockup for Consumption Working Group review, Sprint 2. Not a working group position." |
| License | CC BY 4.0 (footer) |
| Reviewed | 2026-10-15; raw HTML sha256 `41547837320f0df6404035550f49383bd145a6513abcedd1ca55124ae426a65d` (122,290 bytes) |
| Audience | Engineering + FinOps Practitioner pair; Product and Finance for §08 and §11 |
| Crawl status | Not in the registry (12 docs) and not in `manifest.json` `unregistered` (29 URLs): the crawler never discovered it, so it is probably unlinked from the site nav. |

**When to resume:** re-fetch the URL and diff against the hash above. Signs
that it is final: the "Sprint 2 Draft" slug or "WG Internal" eyebrow is gone,
the "Not a working group position" line is removed, it shows up in `/projects/`
or `/insights/` (it then shows up as an unregistered page on `refresh`), or it
moves to a non-draft URL (check for a redirect).

## Section map (13 sections + references)

01 Why routing · 02 Proxy, router, gateway · 03 Requests are steps of work ·
04 Five routing patterns · 05 Pattern chooser (interactive) · 06 How a dynamic
router decides · 07 Routing and the prompt cache · 08 Two metrics ·
09 Checking quality · 10 Benchmarking · 11 Value trace (fork) · 12 Open
questions · 13 What to do next. References: State of Tokenomics (2026);
Artificial Analysis cost-to-run index; Tokenomics Mind Map (Proxy/Router/
Gateway); Prompt Cache Explainer RC; Quesma blog (RTK benchmark); Classifying
and Measuring Realized Value from AI.

## Comparison with current content (dev @ 1d0c172)

No direct contradictions. Four tensions:

1. **Cost per task vs cost per outcome (naming).** `routing-wars` key takeaway:
   "Cost per completed task, held to a quality bar, is the one metric…".
   L4 key metric (`layers.md`): "Cost per task, quality per dollar". The draft
   splits them: *cost per outcome* = all cost in finished work ÷ work that met
   its quality floor; *cost per task* = same numerator ÷ all finished work.
   Routing Wars' "cost per completed task held to a quality bar" = the draft's
   cost per outcome.
2. **Proxy / router / gateway.** L5 components in `layers.md` include
   "Provider Router (Proxy)", which treats proxy and router as one thing. The
   draft (citing the Tokenomics Mind Map) treats them as three stacked layers: proxy (pass-through,
   metering), router (decision), gateway (org policy: identity, budgets, data
   rules, observability, failover, guardrails).
3. **Router ↔ value causality.** `routing-wars` highlight "Router users are 3x
   likelier to prove value" (the correlation caveat is only in the
   transcript). The draft calls it "an association" and explicitly disclaims
   that a router produces measurement maturity.
4. **Survey figure.** `routing-wars` (early, directional): "8 in 10 … already
   routing". Draft: "86% of respondents were evaluating or already using a
   model router". Likely the final survey number; affects
   `get_numbers_register`.

Consistent with: `cache-explainer` §tcmodelswitching (switching models
re-reads the prompt; compare effective cost) — the cache explainer's "Coming
next: a dedicated section on routing and caching together" is partly answered
by draft §07; Big-T lever `bigt-model-routing` ("cheapest model that clears
the quality floor"); L5 "only layer that can decide whether a request needs no
model at all"; `value-classification` (value is realized at outcomes).

## New material worth extracting (when final)

- **Metrics** (→ `metrics.md`, `get_metric`, possible `calculate_routing_metrics` tool):
  - Cost per outcome = all cost in finished pieces of work ÷ pieces of work
    whose outcome met its quality floor. "All cost" = every request in the
    trace incl. retries and abandoned paths, plus classifier, grading and
    replay cost. Compare against a single-model baseline.
  - Cost per task = same numerator ÷ every finished piece of work.
  - Misroute rate = under-routed ÷ graded requests + over-routed ÷ replayed
    requests. Under-routed: chosen tier failed the check and was not the top
    tier. Over-routed: chosen tier passed and a replay on the next cheaper tier
    also passed. Report the two parts separately before adding them.
  - Notes: count per piece of work, not per request (a retry otherwise looks
    like two cheap successes); failed work stays in the numerator; in agentic
    work under-routing often shows as retries, which cost per outcome
    catches and misroute rate may not; the demo baseline is an estimate.
- **Five routing patterns** (who decides / when / best fit / watch for):
  answer without a model (app rules, before any call); static assignment
  (engineering, design time); harness sub-agents (harness, sub-agent
  boundaries; usage may bypass the gateway); dynamic router in a gateway
  (classifier, request time; classifier cost/latency, cache loss on
  mid-session switches); provider auto mode (provider, inside one provider;
  low visibility).
- **Pattern chooser inputs** (§05): what calls the model (chat/app feature,
  agent/coding harness, batch/pipeline); one provider vs several or
  self-hosted; must some requests stay on your own network; session length
  (few turns vs many turns over a large context). The page's recommendation
  logic is client-side JS — capture it from `page.html` scripts at ingest
  time if we build a chooser tool/prompt.
- **Dynamic router flow:** request → classify → map tier (simple, medium,
  complex, reasoning) to model → serve and record (tier, model, classifier
  cost, answer cost) → grade a sample off the request path. Fallback required:
  classifier failure must keep traffic flowing on local rules and log it.
- **Three classifiers:** heuristic rules / general model / typed-schema
  classifier, compared on latency, cost, repeatability, tuning, failure.
  "Tier criteria are a cost policy and need the same review as a rate card."
- **Units of work** table: chat answer vs agentic task vs organizational
  workflow (unit, where success is known, cost of a cheap wrong step, natural
  routing point, what the gateway sees). Requirement: one **trace identifier**
  per piece of work set by the harness/workflow engine.
- **Routing + cache rules (§07):** route at session start or sub-agent
  boundaries; a mid-session switch must earn its cost (needs a remaining-
  session-length estimate); watch quality loss on switches.
- **Seven quality-check methods (§09):** outcome evidence, human review sample,
  automated grader sample, validation sample (e.g. 1%), shadow replay, live
  dual-run, user signals. Grader rules: keep price/tier/model identity out of
  grader input; strip self-assessment rather than instructing the grader to
  ignore it; calibrate on a labeled set; log grading cost.
- **Benchmarking (§10):** compare configurations not models; complete tasks
  with acceptance criteria; repeat and compare medians; report cost per
  outcome, success rate, time to finish; budget for the benchmark itself.
- **Value trace (§11):** Option A (value per request) vs Option B (record per
  request, value at outcome — the demo's current choice, aligned with the
  Value WG).
- **Open questions (§12):** metric status of cost per outcome / cost per task;
  where cache-aware routing belongs; harness sub-agents vs third-party
  routers; whether providers route trivial requests to their cheapest model;
  how providers route internally; whether forking should estimate value.

**Do not treat as reference metrics:** the demo figures ($0.0026 cost per
outcome vs $0.0084 estimated baseline, $0.0006 overhead ≈12%, 0/4
under-routed, 3/3 over-routed, grader probabilities 0.53/0.91/0.96/0.97/
0.74/0.71) are labeled "Illustrative, not a case study". If ingested, flag them
like that, unlike the cache explainer's reference metrics.

## Ingest plan (when final)

Follow the pipeline rule: content fixes go in the parser, never hand edits to
markdown (a `refresh` overwrites them).

1. Register the final URL in the tokenomics source registry as document 13,
   status taken from the page.
2. Parser: add metrics (cost per outcome, cost per task, misroute rate),
   glossary terms (proxy, router, gateway, trace identifier), and a
   routing-patterns entity (new schema, or levers with `kind: routing-pattern`).
3. Record tensions 1–2 as stated mismatch notes instead of silently
   overwriting either source; update the survey figure (tension 4) in the
   numbers register with provenance.
4. Cross-links, each backed by a verbatim quote: trace identifier → FOCUS
   allocation/tags; cost per outcome → framework Unit Economics capability.
5. Optional: `calculate_routing_metrics` tool (mirrors
   `calculate_cache_metrics`) and a pattern-chooser prompt.
6. One PR against `dev`; no protected paths needed.
