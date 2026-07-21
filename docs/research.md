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

### 2.5 Capability page anatomy (verified on `/framework/capabilities/allocation/`)

Server-rendered, consistent section skeleton via an "On this page" nav:

1. `<h1>` title, bolded one-line summary, and a `.callout-block` of headline
   activity groups.
2. `<h2>Definition</h2>` — prose, with inline links to Principles and other
   Capabilities (harvest as official `related` signals).
3. `<h2>Maturity Assessment</h2>` — `<h4>Crawl|Walk|Run</h4>` blocks whose
   content is `<p><b>group label</b></p><ul><li>…` — this is the **Action**
   parsing target (group label + bullet text → Action records; fall back to
   raw prose on structural surprises).
4. `<h2>Functional Activities</h2>` — `<h4>` per Persona ("FinOps
   Practitioner", "Product", …, "Allied Personas") with bullet lists → yields
   the official capability↔persona mapping.
5. `<h2 id="success-kpis">Measures of Success & KPIs</h2>` — (a) top-level
   `<ul>` = inline KPI bullets; (b) `<h3>Examples</h3>` nested list of
   Objective/KPI pairs; (c) **featured KPI cards** (`.ff-card`, `<h4>` title)
   each paired with a *server-rendered hidden modal* `div.c-modal.ff-modal`
   whose numeric DOM id equals the KPI-library post id. Modal contains: full
   description, `Formula` block (formula text + candidate data sources),
   **Related Capabilities** (official capability cross-links per KPI), and
   Related Assets. No headless browser needed — plain HTTP fetch suffices.
6. `<h2>Inputs & Outputs</h2>` — inputs/outputs prose/lists; primary fuel for
   relationship inference.

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
