# Critique gate 1 — adversarial panel on the architecture proposal

Panel run 2026-07-21 against `docs/architecture.md` (rev `2cdee53`) and
`docs/research.md`, per the owner build brief: five independent critic
subagents run in parallel, each returning BLOCKER/MAJOR/MINOR findings.
Gate rule: zero unresolved BLOCKERs before implementation.

**Result: 5 unique BLOCKERs, 16 MAJORs, 13 MINORs — all dispositioned below;
every BLOCKER fixed in the revised architecture (same commit as this file).
One MAJOR accepted-with-rationale and flagged for owner review; everything
else fixed.** Verbatim critic outputs preserved in the session workspace;
this document is the synthesis.

Disposition key: **F** = fixed in revised `docs/architecture.md` /
`docs/research.md` (section cited); **A** = accepted with rationale.

## Blockers (5)

| # | Critic(s) | Finding | Disposition |
|---|---|---|---|
| B1 | Data Engineer + FinOps Practitioner (independently) | **Maturity parse spec is empirically wrong.** research.md §2.5 claimed `<p><b>group</b></p><ul>` inside each Crawl/Walk/Run block, "verified" on the allocation page. Actual DOM (allocation + 2 live pages): `<h4>` + flat `<ul>` with occasional nested `<ul>`, zero bold group labels — the bolded-group pattern belongs to the page-top callout. As specced, every capability would fall to `raw_fallback`, gutting the maturity tools. | **F** — research.md §2.5 corrected; arch §3/§6: flat+nested list parsing, no group_label, explicit nested-item rule (child records carry `parent_ordinal`), callout parsed as separate `headline_groups` field on Capability; ≥3 cross-domain fixture pages. |
| B2 | Data Engineer | **No single page skeleton — silent zero-KPI extraction.** Forecasting puts all featured KPI cards under a separate `<h2>KPIs</h2>`; "Inputs and Outputs" vs "Inputs & Outputs"; `success-kpis` vs `success_kpis` anchor ids (on wrapper divs, not h2s); Examples block optional; some capabilities have zero featured KPIs. Section-scoped parsing extracts nothing with no structural surprise fired. | **F** — arch §6: modals/cards parsed page-wide (`div.c-modal` with numeric id in main content); sections anchored on normalized heading text (fold `&`/`and`, hyphen/underscore); per-capability completeness assertions (non-empty definition, 3 maturity levels, ≥1 persona mapping); absent sections are reported warnings, never silent empties; fixtures = allocation + forecasting + finops-practice-operations. |
| B3 | FinOps Practitioner | **Scope wrongly modeled as an enumerable entity.** The current Scopes page is conceptual guidance; the `/wp/v2/scope` CPT and stale JSON-LD termset hold five *legacy* scopes that are one-for-one today's Technology Categories (2025 renaming). Crawling it would duplicate TechnologyCategory under a second name and misstate that the Foundation publishes a fixed scope list. | **F** — arch §3: Scope is a single conceptual guidance document (`finops://framework/scopes`), illustrative examples labeled as examples; `/wp/v2/scope` never crawled; TechnologyCategory remains the only enumerable five; research.md notes the renaming so future crawls don't re-conflate. |
| B4 | Agent-UX (Purist/DE/Maintainer converged at lower severity) | **`diff_framework_versions` structurally errors in every normal deployment** — the artifact directory holds exactly one version and the diff report was never shipped, so the tool's happy path is unreachable. | **F** — tool cut. Crawler persists rolling diff summaries into `data/framework/changelog/`; new `get_changelog` tool + `finops://framework/meta/changelog` resource serve them. Git remains the deep version store. |
| B5 | Maintainer/Skeptic | **License mislabeling.** Repo is MIT-labeled while redistributing full CC BY 4.0 framework prose; CC BY §3(a)(1)(B) modification-marking not guaranteed at every surface. | **F** — dual licensing declared (code MIT; `data/framework/**` CC BY 4.0) in NOTICE.md (already carries the Modifications section), README, and arch §9; every served resource footer carries attribution **plus a modification indication**; artifact contract test asserts per-record `source_url`/`license` and NOTICE presence. |

## Majors (16)

| # | Critic | Finding (condensed) | Disposition |
|---|---|---|---|
| M1 | Maintainer | src/-nested npm **workspaces only pass frozen gates via a fragile live-types pattern**; FOCUS reuse doesn't need package boundaries. | **F** — workspaces dropped. Plain directories `src/shared`, `src/crawlers/framework`, `src/servers/framework`, relative imports, ESLint `no-restricted-imports` boundary rules, one root tsconfig (arch §2). |
| M2 | Maintainer | **Prompt-injection vector**: crawled third-party HTML (incl. hidden modals) flows unsanitized into LLM-consumed resources; hash-level PR diffs would merge injected text unread. | **F** — arch §6 gains a sanitize stage (strip scripts/comments/off-schema hidden content; markdown-construct allowlist; drop `data:` URIs and off-domain links) + injection heuristics that fail the refresh; refresh PRs render full content diffs (§7). |
| M3 | Maintainer | **Protected-path plan incoherent** ("write workflows, fall back if blocked"). | **F** — `docs/proposed/refresh-data.yml` is the *only* delivery path, with an owner install checklist; no write to `.github/workflows/` attempted; §9 states the staleness mitigation is inactive until installed. |
| M4 | Maintainer | **Cron failure mode unhandled**: fetch failure → red run nobody sees; 60-day scheduled-workflow auto-disable; mostly-raw_fallback crawl still opens a mergeable PR. | **F** — workflow spec: on failure auto-open/refresh a labeled issue; parse-quality budget fails the run (raw_fallback % or count assertions); auto-disable + keepalive documented (§7). |
| M5 | Agent-UX | **Persona question costs ~15 round-trips** — map_personas returns links only; activities return all personas' text. | **F** — `map_personas(persona)` returns persona-scoped activity bullets inline per capability; no-args returns the persona index (§5.2). |
| M6 | Agent-UX | **No tools-only fallback** for manifest/overview/full KPI detail/non-prerequisite graph; many clients never expose resources to the model. | **F** — tool parity guaranteed: `get_framework_info` (manifest+overview+navigation), `get_kpis` returns full records, `get_related` covers informs/related edges, `get_changelog`. §5 states resources are a convenience layer; Phase 5 evals must be answerable tools-only. |
| M7 | Agent-UX | **Inferred-edge marking in `get_prerequisites` output unspecified**; propagation rule undefined; include_inferred default makes unofficial inference the headline answer. | **F** — output schema specified: every edge carries `source/confidence/rationale/evidence`; top-level summary line ("N official, M inferred…") duplicated into text content; propagation rule documented (constraint = max over path; unknown = crawl) (§5.2). |
| M8 | MCP Purist | **Prompt content-delivery undefined** — bare URI references break in hosts that don't surface resources. | **F** — `prompts/get` renders server-side with embedded-resource blocks (uri+mimeType+text from artifact); anti-duplication restated as "single renderer, embedded at render time" (§5.3). |
| M9 | MCP Purist | **Cursor contract unspecified**; nextCursor must appear in outputSchema; cross-call cursors add failure modes at this scale. | **F** — opaque base64 `{data_version, offset}` cursor; stale → in-band isError with restart instruction; `nextCursor` optional in list outputSchemas; default limits fit all current lists in one response; cursors only on `search_framework`/`get_kpis`/`list_capabilities` (§5.2). |
| M10 | MCP Purist | **Resource/tool duplication never linked** — drift risk; spec's `resource_link` bridging unused. | **F** — one renderer per entity shared by both handlers; entity-returning tools include a `resource_link` block to the canonical `finops://` URI (§5.2). |
| M11 | Practitioner | **"Action" misnames assessment characteristics** — bullets are rubric states (some are literally deficiencies), not to-do steps; agents will present them as work plans. | **A + partial F** — the entity keeps the brief's contract name `Action` (owner-specified schema vocabulary; changing it unprompted oversteps), but all semantics fixed: schema description, tool descriptions, resource text and `assess_maturity_path` output present them as "maturity characteristics (assessment rubric states), unofficial parsing — evidence to look for, not steps to execute". **Flagged for owner: approve rename to `MaturityCharacteristic` in the morning and it's a mechanical change.** |
| M12 | Practitioner | **`list_capabilities(phase?)` implies an official capability→phase mapping that does not exist** (phases are an iterative lifecycle, not a partition). | **F** — phase parameter dropped; phases resource text explains the lifecycle relationship (§5.2). |
| M13 | Practitioner | **Pre-crawl insulation too weak**; undefined semantics below Crawl; per-level sample goals missing from schema. | **F** — display name "Pre-Crawl (unofficial extension)"; maturity-model resource structured as "Official levels (3)" + visibly separate extension section; tools at pre-crawl return the extension definition + explicit "no official assessment content exists below Crawl"; `sample_goals_md` added to MaturityLevel (§3, §5). |
| M14 | Practitioner | **Lexicon-inferred prerequisite edges with maturity constraints invent precision the framework disclaims**; official relatedness signals unused. | **F** — inference restrained: inferred edges limited to `related`/`informs`, each carrying a quoted evidence sentence; `prerequisite` type or any maturity constraint only when quoting the specific maturity bullet implying it; confidence is an enum (`strong/moderate/weak`) tied to named heuristics, not [0,1]; new official-signal layer (shared KPI Related-Capabilities links, domain co-membership) emitted as `source: official` edges with evidence URLs; roadmap prompt labels inferred steps (§3). |
| M15 | Data Engineer + Maintainer | **Per-record `retrieved_at` breaks diff idempotence** (every recrawl changes every hash) and churns git. | **F** — per-record provenance is `{source_url, license}`; retrieval time lives in `manifest.json` (`crawled_at`) only; canonical content hash excludes volatile fields; idempotence test: consecutive crawls of identical fixtures → byte-identical `content/`, empty diff, no bump (§3, §4). NOTICE.md updated to match. |
| M16 | Data Engineer | **Version-store / bump-rule ambiguity.** | **F** — bump decision table: crawler auto-selects max(patch: any content hash change; minor: entity count delta); schema bumps manual, tied to `schema_version`, enforced by a manifest-consistency test; git is the version store; changelog carries summaries (§4). |

## Minors (13)

| # | Critic | Finding (condensed) | Disposition |
|---|---|---|---|
| m1 | Agent-UX | get_capability default include unspecified → full-doc dumps. | **F** — default `include = [summary, definition]`; per-section size noted in descriptions; the resource is the deliberate full-doc path. |
| m2 | Agent-UX | Resource/tool coin-flip on three surfaces. | **F** — rule written into §5: tools = model's canonical, complete-at-leaf path; resources = attachment/bulk layer; descriptions enumerate returned fields. |
| m3 | Agent-UX | Slug/enum discovery uneven (personas, maturity tokens, KPI slugs). | **F** — `map_personas()` no-args index; maturity levels as a Zod enum; KPI results always carry `slug`. |
| m4 | Purist | Capability negotiation undocumented. | **F** — §5.5 table: resources/tools/prompts declared, no subscribe/listChanged (static artifact, restart-to-refresh), completions declared; prompt-argument completion included. |
| m5 | Purist | Resource read error contract unspecified. | **F** — unknown slug/URI → JSON-RPC `-32002` with `data.uri`, suggestions in message; added to §8 test list. |
| m6 | Purist | Entity types sit in the URI authority component inconsistently. | **F** — single constant authority: `finops://framework/...` for everything; canonical form (lowercase, no trailing slash) documented. |
| m7 | Purist | Resource annotations/mimeTypes omitted; capability docs template-only. | **F** — explicit `text/markdown`/`application/json`; `lastModified` = `crawled_at`; priority on overview; 22 capability + 11 persona resources also listed concretely. |
| m8 | Purist | diff tool dead-end (dup of B4). | **F** — see B4. |
| m9 | Maintainer | `tests/**` is a protected path; root vitest include misses `src/**/*.test.ts`. | **F** — all new tests live under `src/**/*.test.ts`; `vitest.config.ts` (unprotected) updated to include them and exclude fixtures from coverage; `tests/` left untouched. |
| m10 | Maintainer | Committed search index + fixtures churn git. | **F** — search index built at server startup from the artifact, never committed; fixtures kept to the three named pages. |
| m11 | Maintainer | Confidence pseudo-precision / lexicon liability (dup of M14). | **F** — see M14 (enum confidence, named heuristics). Inference itself is kept: the brief requires it. |
| m12 | Data Engineer | Cache lacks TTL/validity rules. | **F** — cache only 200s passing a body sanity check; entry stores fetch time+status; 7-day TTL; `retrieved`/crawled time = origin fetch time (§6). |
| m13 | Data Engineer | Count-assert hard-fail kills automation; API/sitemap disagreement policy unset; personas grouping record. | **F** — automation soft-fails with `counts_mismatch` manifest flag + prominent diff-report note (PR still opens); hard-fail retained for committed-artifact CI validation; source disagreement fails fetch listing the symmetric difference; personas filtered by URL shape with a count assertion (§6). |
| m14 | Data Engineer | robots.txt checked once, not at runtime. | **F** — crawler fetches robots.txt each run, skips disallowed URLs (recorded in crawl report), honors crawl-delay ≥ built-in throttle (§6). |
| m15 | Practitioner | Domain→capability mapping sources undocumented. | **F** — breadcrumb + domains-index cards documented as dual sources, cross-checked in validate; domain detail pages + sitemap-domains.xml added to inventory (research.md, §6). |
| m16 | Practitioner | Allied personas mapped only at group level. | **F** — activity link target modeled as `core persona \| allied-group`; `map_personas` for an allied persona returns group-level data explicitly labeled as such (§3, §5.2). |

## Gate verdict

Zero unresolved BLOCKERs. M11 is the single accepted-with-rationale item
(entity name held to the owner's brief; semantics fixed; rename queued for
owner approval). Implementation (Phase 4) may proceed against the revised
architecture.
