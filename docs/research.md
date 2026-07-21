# Phase 0 research — MCP spec + FinOps Framework crawl surfaces

Date: 2026-07-21. All findings verified live against the sources cited.

## 1. MCP protocol (spec revision 2025-11-25, latest per sitemap)

Sources: `modelcontextprotocol.io/specification/2025-11-25/{architecture,
server/tools, server/resources, server/prompts, basic/transports}.md` and the
TypeScript SDK README (`modelcontextprotocol/typescript-sdk`).

Takeaways that bind this project's design:

- **Primitive intent.** Resources are *application-driven* addressable
  content (`resources/list`, `resources/read`, resource **templates** with RFC
  6570 URI templates for parameterized families). Tools are *model-driven*
  callable operations with `inputSchema`, optional `outputSchema` +
  `structuredContent`, and behavior `annotations` (`readOnlyHint`,
  `idempotentHint`, `openWorldHint`) — untrusted hints, but required good
  practice. Prompts are *user-driven* reusable templates surfaced by clients
  (e.g. slash commands) returning `PromptMessage[]`.
- **Custom URI schemes** are explicitly permitted for resources; we will use
  `finops://`. Resource contents carry `mimeType`; JSON and markdown both fine.
- **Pagination** is cursor-based (`nextCursor`) for `resources/list`,
  `tools/list`, `prompts/list`; the SDK handles this. Tool *results* have no
  protocol pagination — list-shaped tools must define their own cursor/limit
  params.
- **Errors**: protocol errors (JSON-RPC codes) vs. tool execution errors
  (`isError: true` in-band so the model can react). Unknown-slug errors belong
  in-band with actionable text.
- **Transports**: stdio is the baseline; Streamable HTTP is the remote
  transport. SDK `McpServer` is transport-agnostic — `connect(transport)` is
  the only seam, so structuring for later HTTP requires nothing beyond keeping
  server construction separate from transport wiring.
- SDK: `registerResource` (with `ResourceTemplate` + `listCallback`/
  `completeCallback`), `registerTool` (Zod schemas), `registerPrompt`.
  `zod` v3 peer; server name/version passed at construction.

## 2. FinOps Framework site — inventory and crawl surfaces

Root: `https://www.finops.org/framework/` (301 from finops.org/framework).

### 2.1 License and robots — crawl is permitted

- `robots.txt` disallows only `/wp-admin/` and `/tool_service/`; all framework
  and KPI pages are crawlable.
- Framework pages state: "This work is licensed under Attribution 4.0
  International" with JSON-LD `"license":
  "https://creativecommons.org/licenses/by/4.0/"` → **CC BY 4.0**.
  Attribution to the FinOps Foundation is required; `NOTICE.md` will carry it
  and every crawled record embeds `{ source_url, retrieved_at, license }`.
  **No stop condition triggered.**

### 2.2 Structured data endpoints (WordPress REST, preferred where available)

The site is WordPress and exposes custom REST routes (all GET, no auth):

| Endpoint | Returns |
|---|---|
| `/wp-json/wp/v2/capabilities-api?compare=all` | 22 capabilities: `{title, url, image_url, excerpt, id}` |
| `/wp-json/wp/v2/kpis-api?compare=all` | 88 KPI-library entries: `{title, url, excerpt, id}` |
| `/wp-json/wp/v2/personas-api?compare=all` | 12 persona records (6 Core + 5 Allied + 1 "Allied Personas" grouping page) |
| `/wp-json/wp/v2/scope` | standard WP collection for Scopes |

These give canonical entity lists + stable numeric IDs, but *not* the rich
page content — that comes from the HTML pages below.

### 2.3 Sitemaps

`/sitemap.xml` indexes `sitemap-pages.xml`, `sitemap-projects.xml`,
**`sitemap-capabilities.xml`** (exactly the 22 capability URLs — cross-check
against `capabilities-api`), `sitemap-partners.xml`.

### 2.4 Page inventory (all server-rendered HTML; verified counts)

- Overview: `/framework/`
- Sections: `/framework/principles/` (6), `/framework/phases/` (3:
  Inform/Optimize/Operate), `/framework/domains/` (4: Understand Usage & Cost,
  Quantify Business Value, Optimize Usage & Cost, Manage the FinOps Practice),
  `/framework/capabilities/` (index is client-rendered — use API/sitemap),
  `/framework/maturity-model/` (Crawl/Walk/Run + characteristics + sample
  goals), `/framework/personas/`, `/framework/scopes/`,
  `/framework/technology-categories/` (5: SaaS, Data Center, Data Cloud
  Platforms, AI, Public Cloud).
- Personas: `/framework/persona/{slug}/` — Core: finops-practitioner,
  engineering, finance, leadership, procurement, product. Allied (nested under
  `/framework/persona/allied-personas/{slug}/`): itam, itfm, itsm-itil,
  security, sustainability.
- Capabilities: 22 pages at `/framework/capabilities/{slug}/`.
- KPI library: 88 pages at `/kpi/{slug}/` (same content that feeds capability
  page popups).

### 2.5 Capability page anatomy (CORRECTED after critique gate 1)

> The first draft of this section mis-attributed the page-top callout's
> bolded-group structure to the Maturity Assessment blocks and assumed one
> skeleton for all pages. Both were empirically refuted by the critique
> panel (docs/critique-1.md B1/B2) against allocation + forecasting +
> finops-practice-operations. This section reflects the verified reality.

Server-rendered, section skeleton discovered via an "On this page" nav, but
**pages vary — anchor on normalized heading text, never exact strings/ids**:

1. `<h1>` title, bolded one-line summary, and a `.callout-block` of headline
   activity groups (`<p><b>group</b></p><ul>` — this pattern lives HERE and
   only here → Capability `headline_groups`).
2. `<h2>Definition</h2>` — prose, with inline links to Principles and other
   Capabilities (harvest as official `related` signals).
3. `<h2>Maturity Assessment</h2>` — `<h4>Crawl|Walk|Run</h4>` each followed
   by a **flat `<ul>` that may nest one level** (no bold group labels, no
   `<p>` wrappers). Nested `<li>`s are children of the preceding item. This
   is the Action parsing target; raw-prose fallback on surprises.
4. `<h2>Functional Activities</h2>` — `<h4>` per **core** Persona plus a
   single `<h4>Allied Personas</h4>` bucket (allied personas are mapped at
   group level only).
5. Measures of Success & KPIs — (a) a top-level `<ul>` of inline KPI
   bullets; (b) an optional `<h3>Examples</h3>` nested Objective/KPI list
   (allocation has it; forecasting/practice-operations don't); (c)
   **featured KPI cards** (`.ff-card`) paired with *server-rendered hidden
   modals* `div.c-modal` whose numeric DOM id equals the KPI-library post
   id — but cards/modals may sit under a **separate `<h2>KPIs</h2>`**
   (forecasting) rather than inside this section, and some capabilities
   have none (finops-practice-operations) → parse modals **page-wide**, not
   section-scoped. Modal contains: description, Formula block (+ candidate
   data sources), Related Capabilities (official cross-links), Related
   Assets. No headless browser needed.
6. Inputs & Outputs — heading renders as "Inputs & Outputs" OR "Inputs and
   Outputs"; anchor ids flip between `inputs-outputs`/`inputs_outputs` and
   live on wrapper divs, not headings. Primary fuel for relationship
   inference.

Domain→capability mapping comes from two official sources to cross-check:
the domains index page's per-domain capability cards, and each capability
page's breadcrumb ("Framework / Domains / {domain} / {capability}").

**Scopes caveat (critique B3):** the current Scopes page is conceptual
guidance with no enumerable scope list. The `/wp/v2/scope` CPT and the
page's stale JSON-LD termset hold five *legacy* scopes that were renamed to
today's five Technology Categories in 2025 — do not crawl them as Scope
entities, ever.

### 2.6 Risks / defensive notes

- The capabilities *index* page is JS-rendered → never scrape it; use
  `capabilities-api` + `sitemap-capabilities.xml` (two independent sources,
  diff them).
- Tailwind-ish utility classes are unstable; anchor parsing on heading
  ids/text (`Definition`, `Maturity Assessment`, `id="success-kpis"`) and
  element structure, not class soup.
- WP lazy-loading rewrites `<img src>` to data URIs (`data-lazy-src` holds the
  real URL) — irrelevant to text but matters if icons are captured.
- Persona "Allied Personas" API record is a grouping page, not a persona —
  filter by URL shape.
- Some KPI popups may lack Formula/related blocks — all popup fields optional.
- Politeness: modest request count (~130 pages), 1 req/s throttle + on-disk
  cache + honest User-Agent (`finops-framework-mcp-crawler/<version>
  (+repo URL)`) is ample.

## 3. Implications carried into Phase 1/2

1. Prefer the REST APIs for entity enumeration/ids; HTML pages for content;
   record both `wp_id` and `slug` as stable keys.
2. KPI is a first-class entity (88 library entries) with a many-to-many
   `featured-on-capability` relation — not merely text under a capability.
3. Official relationship edges exist in three places (Definition prose links,
   KPI-modal Related Capabilities, Inputs & Outputs) — capture as
   `source: official` with provenance; inference only adds edges on top.
4. Maturity vocabulary on-site is Crawl/Walk/Run; `pre-crawl` ships only as a
   flagged unofficial extension per the build brief.
