# Spec: usage-guide v1 — six-page documentation guide (docs/guide/)

Owner directive (2026-08-02): grow the single ESR walkthrough artifact into
a full documentation guide — Intro + Getting Started, one page per MCP
server, three worked examples using both servers together — linked from
README.md and docs/, hosted in-repo in a GitHub-Pages-ready structure, and
mirrored as the claude.ai review Artifact.

## Hosting decision

**`docs/guide/` in-repo, one self-contained HTML file per page.**
Rationale (record in decisions.md): a GitHub wiki is a separate git remote
with no PR review and no gates coverage; GitHub Pages can serve `docs/`
straight off the default branch, pages stay reviewable/diffable, and the
repo already uses rich self-contained HTML for owner-facing documents
(docs/designs convention). Enabling Pages is a repo-settings action —
owner checklist item, not agent-executable. The claude.ai Artifact remains
the pre-merge preview: a single-file SPA build of the same six pages with
client-side nav (Artifacts are one page).

## Page inventory (docs/guide/)

Every page: self-contained HTML (inline CSS, no external requests),
light/dark via prefers-color-scheme, shared chrome (header with guide nav,
footer with CC BY 4.0 attribution + UNOFFICIAL legend), relative links so
the set works on Pages, locally via file://, and in the SPA build.

1. **index.html — Intro + Getting Started.** What the repo is; the two
   launch servers introduced side by side (finops-framework-mcp: official
   FinOps Framework guidance — domains, capabilities, KPIs, personas,
   maturity; finops-focus-mcp: FOCUS spec 1.0/1.2 — columns, attributes,
   requirements, diffs, unofficial KPI extensions). Getting-started:
   npx/npm install for both bins, MCP client config JSON (Claude Code +
   Claude Desktop shapes), the Worker HTTP endpoints (/mcp/framework,
   /mcp/focus) as the remote option, a first-calls transcript per server
   (list_versions; get_capability) with REAL output, and a "which page
   next" map.
2. **framework-server.html — finops-framework-mcp reference.** Data model
   (domains → capabilities → KPIs/personas/maturity), tool tour grouped
   discover → read → search → assess, prompts + resource URIs
   (finops://), pagination/cursor behavior, provenance + official-vs-
   unofficial marking. Simple worked demo: explore one capability
   (Anomaly Management) end to end with real transcripts.
3. **focus-server.html — finops-focus-mcp reference.** Version model
   (1.0/1.2, latest default), tool tour grouped versions → columns/
   attributes → requirements → search → compare_versions/changelog →
   unofficial KPI mapping/calculation, prompts + focus:// resources.
   Simple worked demo: BilledCost deep-dive at both versions + the
   1.0→1.2 diff, real transcripts.
4. **example-showback.html — Worked example: Showback Reporting.** Based
   on the Understand Usage & Cost domain — primarily Allocation plus
   Reporting & Analytics capabilities. Flow: framework server (domain →
   capabilities → featured KPIs → maturity guidance on allocation
   coverage) → focus server (columns a showback report needs: account/
   sub-account, tags, service taxonomy, charge period, effective cost —
   exact sets per version via get_kpi_mapping/list_columns) → a small
   showback table computed from the bundled official sample (group
   EffectiveCost by ServiceCategory/SubAccountId — computed offline from
   the committed CSV, labeled as sample-data illustration) → practitioner
   takeaways. Every number real.
5. **example-esr.html — Worked example: Rate Optimization / ESR.** The
   existing walkthrough content (scratchpad focus-walkthrough.html —
   already all-real: capability → 4 KPIs → columns 1.0 vs 1.2 → ESR
   26.552972346576816% over the official sample → not-computable lesson →
   1.2 values) restyled into the shared chrome and cross-linked.
6. **example-forecasting.html — Worked example: Forecasting maturity
   journey.** Framed as a maturity journey to Walk-level Forecasting:
   get_maturity_assessment / assess_maturity_path for Forecasting
   (Crawl → Walk requirements, verbatim official characteristics),
   supporting capabilities (Unit Economics; Budgeting/Allocation where
   the framework's own text links them), relevant KPIs (forecast
   accuracy/variance + unit-economics KPIs from get_kpis), then the FOCUS
   columns that feed a forecasting pipeline (charge periods, effective/
   billed cost, pricing quantity; 1.2 additions that help). Every quote
   verbatim from the live server, maturity levels official-only
   (Crawl/Walk/Run).

## Hard content rules (all builders)

- **Every fact, number, quote, and transcript comes from a live probe**
  (`node evals/framework/mcp-call.mjs [--server=focus] call ...`) or the
  committed artifact/sample files — no invented data, no paraphrased
  "verbatim" quotes. Cite the tool call above each transcript block.
- Unofficial derivations (KPI mapping, calculate_kpi, diff) always carry
  the UNOFFICIAL flag visibly; official framework/spec text carries the
  CC BY 4.0 footer attribution.
- Tool names/params must match the live post-T-051..T-054 surface (check
  docs/mcp-surface.md once T-054 lands).
- No external assets; pages must render offline; body never scrolls
  horizontally (wide tables wrap in overflow-x containers).

## Task decomposition (with model orchestration)

Implementation is orchestrated by the supervising session via subagents:
content pages built by **opus** (index, showback, forecasting — new
narrative + data work) and **sonnet** (server reference pages from
mcp-surface.md + ESR restyle — structured transformation), then assembled,
probed, and committed per task by the supervisor.

- **T-A (scaffold + intro):** spec committed; shared chrome template
  (docs/guide/_template notes inside index.html comments); index.html.
- **T-B (server pages):** framework-server.html, focus-server.html.
- **T-C (worked examples):** example-showback.html, example-esr.html,
  example-forecasting.html.
- **T-D (integration + publish):** README "Documentation" section links
  the guide; docs/mcp-surface.md cross-links; decisions.md records the
  Pages-over-wiki call; SPA build published as the claude.ai Artifact
  (same URL); activeContext/journal updated; owner checklist gains
  "enable GitHub Pages (serve docs/ from default branch)".

## Acceptance (whole feature)

All six pages exist, self-contained, cross-linked, chrome-consistent;
every transcript/number re-probes clean (spot-check pass recorded);
README + docs link the guide; Artifact republished at the existing URL;
gates green; memory/journal updated.
