# ADR-0001: Add FOCUS 1.3, 1.4 and 1.5 together, after 1.5 ratifies

**Status:** Proposed — deferred until FOCUS 1.5 is ratified (expected 3 Dec 2026). Nothing here is built. Owner decision (2026-10-20): write the plan down now; build everything through 1.5 in one pass once 1.5 is final.

## Context

`finops-focus-mcp` serves FOCUS 1.0 and 1.2. Those are what the hyperscalers export: AWS 1.2 is GA, Azure and GCP 1.2 are preview, OCI is 1.0 or 1.2. FOCUS's own adoption table lists 1.3 only at MongoDB, Snowflake, Vercel and Databricks, and no provider emits 1.4. 1.5 is the AI release (model properties, `TokenCacheAction`, `TokenDirection`, `PrincipalId`) that the tokenomics server already names as working-draft identifiers with no URI. Evidence: [`docs/research/focus-version-support.md`](../research/focus-version-support.md).

Reading the FOCUS_Spec repository at the 1.3 and 1.4 tags (2026-10-20) showed that adding a version is not just a new `VERSIONS` entry in `src/crawlers/focus/urls.ts`:

- **Layout:** `specification/columns/` is gone. Columns live under `specification/datasets/<dataset>/columns/`: 1.3 has `cost_and_usage` (65) and `contract_commitment` (13); 1.4 has `cost_and_usage` (65), `contract_commitment` (30), `invoice_detail` (22) and `billing_period` (6). The same column name appears in more than one dataset.
- **Column pages:** normative requirements moved under a `## Requirements` heading. Our parser reads the intro before the first `##`, so it would silently drop them. 1.4 also adds "Content Constraints" (casing), a Dataset row and "Implementation Guidance". `specification/requirements_model/` JSON may be a sturdier source than the markdown.
- **Hard-coded to 1.0 and 1.2:** the `compare_versions` diff and its `focus://spec/changes/1.0-1.2` resource, the KPI mapping (`V = ["1.0", "1.2"]` in `kpi-mapping-data.ts`), the bundled samples, the validate/generate CLI defaults, and the tokenomics `FOCUS_LINK_VERSION = "1.2"` (`src/crawlers/tokenomics/links-data.ts`).

Alternatives considered: (a) ship 1.3 and 1.4 now and 1.5 later, which means doing the dataset and parser work twice for versions almost nobody exports; (b) skip 1.3/1.4 and add only 1.5, which leaves `compare_versions` unable to explain 1.4's first-ever column removals (`ProviderName`, `PublisherName`) to anyone migrating from 1.2.

## Decision

When 1.5 is ratified, add 1.3, 1.4 and 1.5 in one change set, in this order:

1. **Dataset-aware ingest.** Crawl `specification/datasets/*/columns/` for 1.3+; keep the 1.0/1.2 path as is. Fix the parser to read `## Requirements` (and the 1.4 sections), or switch 1.3+ to the requirements-model JSON if it covers the same text. Add a parser fixture per version so a layout change fails loudly.
2. **Dataset in URIs and tools.** `focus://spec/<version>/<dataset>/columns/<Column>`, with Cost and Usage as the default when `dataset` is omitted, so every existing 1.0/1.2 URI and tool call keeps working unchanged. `list_columns`/`get_column` gain an optional `dataset` argument; `list_datasets` is new.
3. **General diff.** `compare_versions(from, to)` over any two served versions, dataset-aware, reporting added, removed, deprecated and changed columns; `focus://spec/changes/<from>-<to>` for adjacent pairs plus 1.2→1.5.
4. **KPI mapping and samples** extended to each new version where the official sample data exists; otherwise state "no bundled sample" rather than compute.
5. **Tokenomics cross-links.** Set `FOCUS_LINK_VERSION` to 1.5 so the 11 working-draft identifiers get real `focus://spec/1.5/…` URIs, then re-crawl the tokenomics FOCUS 1.5 page.
6. **Provider-support resource** from FOCUS's "latest version supported" table, with GA/preview noted where a provider's own docs say so.

1.2 stays the default `version` everywhere until a hyperscaler exports something newer as GA. Every 1.3+ answer says "ratified; limited provider adoption".

## Consequences

- One ingest redesign instead of two; 1.3/1.4 users wait until December, which matches current demand.
- Existing URIs, tool calls and the tokenomics links stay valid; only `FOCUS_LINK_VERSION` moves.
- The Worker bundle grows by roughly three more versions of column data; re-measure against the 10 MB Paid limit (today about 760 KiB gzipped).
- If 1.5 slips, revisit: 1.3 + 1.4 can ship alone using steps 1–4, with 1.5 following.
