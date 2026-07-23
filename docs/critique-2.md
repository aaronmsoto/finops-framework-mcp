# Critique gate 2 — final adversarial panel on the built server

Panel run 2026-07-21 against the BUILT system (server 0.1.0, artifact
v1.0.0 at review time): the same five critics, this time with repo access,
the live server (via the eval bridge), the Phase 5 eval transcript, and a
double-refresh idempotence report. The panel made **~150 live/empirical
checks** across its five members. Gate rule: zero unresolved BLOCKERs, then
re-run evals.

**Result: 4 BLOCKERs, 8 MAJORs, ~18 MINORs — all BLOCKERs and MAJORs fixed
in the same change set as this document (artifact regenerated as v1.1.0);
minors fixed except three explicitly accepted. Eval suite re-run after the
fixes: see docs/eval-results.md Run 2.**

The panel also explicitly verified as clean: all round-1 dispositions
actually landed; action ordinal/parent integrity across all 489 items; KPI
join integrity both directions; manifest sha256 correctness; idempotent
double-refresh; robots/cache behavior matching the architecture; Scopes
served as concept not list; pre-crawl insulation ("exemplary"); the eval's
10/10 result.

Root cause worth recording: both data BLOCKERs came from fixtures covering
only `p-strong`-style pages — the fixture set now includes h3-callout and
"Measure(s)" variant pages.

## Blockers (4) — all fixed

| # | Critic | Finding | Fix (this change set) |
|---|---|---|---|
| B1' | Agent-UX | `get_kpis` text block not functionally equivalent to structuredContent — formulas/descriptions/cursor only in structured; silent 25-of-88 truncation. Text-only hosts (the exact class M6/M8 target) get wrong info. | Text now serializes the full structured result + explicit "Showing X of Y — pass cursor…" note + attribution; `resource_link` added on slug lookups. Regression test added. |
| B2' | Practitioner | KPI formula parser kept only `<p>` text and shunted every `<li>` into `data_sources` — 35/44 detailed KPIs served mangled formulas (ESR's formula was literally `"Data Sources:"`) while claiming `[formula]`. | Modal parser rewritten to walk labeled segments in order, assigning lists to the preceding label; crawl now hard-fails if any formula ends with ":" or contains "Data Sources:". Artifact regenerated; ESR/carbon/anomaly records verified correct. |
| B3' | Data Engineer | Page-top callouts labeled with `<h3>` (8 of 22 pages) were silently skipped — 103 guidance bullets absent from the artifact with no warning. | Headline-group pass rewritten: document-order collection stopped at the first content section, `<h3>` and `<p><strong>` both accepted as labels, persona role-play blocks excluded, zero-group callouts warn. Sustainability fixture + tests added. All 22 capabilities now carry real groups. |
| B4' | Data Engineer | `Measure(s) of Success & KPIs` heading variant defeated normalization — executive-strategy-alignment's 12 bullets lost while the warning claimed the section was absent. | `normalizeHeading` folds "(s)"; the section walk now collects every non-Examples list (multi-subheading sections). ESA fixture + test; ESA now serves 12 bullets. |

## Majors (8) — all fixed

| # | Critic | Finding | Fix |
|---|---|---|---|
| M1' | Purist | Prompt argument completion silently dead: `.describe()` after `completable()` drops the SDK's completable marker under zod v4 (verified live: empty completions). | `.describe()` moved inside `completable()`; persona arg made completable; `target` completer restricted to official levels. Live `completion/complete` test added. |
| M2' | Purist | Concrete-resource typos returned `-32602` with no `data.uri`/suggestions — the promised `-32002` contract only covered templates. | Capability & persona docs re-registered as templates with `list` callbacks (still enumerated in `resources/list`) whose handlers route misses through the `-32002` + nearest-match helper. Tests cover concrete typos. |
| M3' | Agent-UX | No tools-only path to full principles/phases/domains/technology-categories/scopes text (search snippets cap at 220 chars) — M6 parity unmet for five entity types. | New `get_entity(entity_type, slug?)` tool serves the full rendered markdown via the same renderers (personas included). |
| M4' | Agent-UX | Inconsistent parameter names (`entity_types` vs `types`, `maturity` vs `level`/`*_level`) turn zod's silent unknown-key stripping into live traps. | `get_actions` accepts `level` as a documented alias; descriptions spell out parameter names; strict schemas remain a known limitation (below). |
| M5' | Practitioner | Inferred edges: bare-mention `informs` edges asserted direction the evidence contradicts; false positives from persona lists and lowercase common-noun usage. | Inference rewritten: bare mentions → undirected `related` (canonical order); single-word titles require title case; parenthetical-list matches skipped; direction only with dependency language. Result: 38 → 19 edges, zero prerequisite edges — the honest state; all four cited bad edges gone. eval Q2 expectation updated to match. |
| M6' | Maintainer | Proposed refresh workflow targeted the deleted `dev` branch (DOA), missing repo-setting and token-cascade caveats. | Workflow now recreates `dev` from main when absent, runs gates before opening the PR, and the owner checklist documents the Actions setting, PAT/CI limitation, and drift caveat. |
| M7' | Maintainer | Tools — the declared canonical path — served CC BY 4.0 prose with zero attribution (footer only rode on resources). | Attribution/modification footer appended to every leaf tool text (`get_capability`, `get_kpis`, `get_actions`, `assess_maturity_path`, `get_maturity_model`, `get_entity`); `source_url`/`license` added to structured capability/KPI records. Test asserts it. |
| M8' | Maintainer | README's primary quickstart broken: artifact dir defaulted to cwd-relative `data/framework`, so absolute-path launches from another project exit at startup. | Default now resolves relative to the module location (`import.meta.url`); env/argv overrides unchanged. |

## Minors — fixed (15)

Purist: KPI slug completion no longer truncates at 20 (total/hasMore now
honest); `get_changelog` documents its provably-complete 20-entry rolling
window; capability-declaration docs corrected to state the SDK advertises
`listChanged` (never emitted). Agent-UX: `get_capability` description now
carries per-section token costs; snippet builder no longer strips intra-word
hyphens; `plan-maturity-roadmap` gained the slug/level guard and embedded
context; `list_capabilities` with an allied persona prepends the group-level
disclaimer. Practitioner: `assess_maturity_path`'s prerequisites hint is
conditional (points to `get_related` when no prerequisite edges exist);
`get_related` text output opens with the provenance line; `map_personas`
tags allied-group bullets addressed to a different named persona
(`[addressed to itam] …`). Data Engineer: nested-list markdown indent now
matches parent marker width; h4 titles collapse whitespace (NBSP gone).
Maintainer: `.cache/` untracked + ignored; doc drift fixed (changelog path,
eval date); `scanForInjection` and robots parsing gained direct unit tests.

## Minors — accepted with rationale (3)

1. **Silent unknown-parameter stripping** (Purist/Agent-UX; also eval
   known-limitation #3): SDK-level zod behavior; mitigated by aliases,
   spelled-out parameter names, and outputs labeled clearly enough that
   misses are visible. Revisit when the SDK exposes strict input schemas.
2. **`listChanged: true` advertised by the SDK** despite never firing:
   harmless (no notification is ever owed for static lists); documented in
   architecture §5.5 rather than dropping to the low-level Server API.
3. **~19 MB of crawl-cache blobs in branch history**: resolved structurally
   — this repo squash-merges task branches into `dev`, so the blobs never
   reach mainline history.

Held for owner (from round 1, still open): M11 rename `Action` →
`MaturityCharacteristic` (semantics already rubric-framed everywhere);
template-repo issue: `gates --tier full` runs only full-tier gates — use
`--tier all` before shipping (flowed back to agentic-starter-repo notes).

## Gate verdict

Zero unresolved BLOCKERs; all MAJORs fixed and covered by tests
(87 passing). Artifact v1.1.0. Eval re-run follows this commit.
