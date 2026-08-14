## Shorten guide nav, add Quick Q&A example page — 2026-08-13T00:00:00Z

- did: Owner request, prompted by a live Q&A session against both MCP
  servers earlier in the session (list capabilities by domain, summarize
  the sustainability capability, close its Crawl→Walk maturity gap with
  validating KPIs, and starter Unit Economics KPIs from FOCUS 1.2). Two
  parts:
  1. **Nav shortened for phone fit.** Top-level guide nav dropped from 6
     long labels (`Intro & Getting Started`, `finops-framework-mcp`,
     `finops-focus-mcp`, `Showback`, `Rate Optimization (ESR)`,
     `Forecasting Journey`) to 4 short ones (`Intro`, `Framework MCP`,
     `FOCUS MCP`, `Examples`) across all 7 pages. The 4 example pages
     (Showback, ESR, Forecasting, and the new Quick Q&A) now live as
     "virtual sub-pages" under `Examples` via a second `nav.guide.sub` row
     shown only on those 4 pages, with its own `aria-current` tracking.
     `Examples`' own top-level link/aria-current is active whenever the
     current page is any of the 4 example pages.
  2. **New page `docs/guide/example-quick-qa.html` (page 7 of 7).** Unlike
     the 3 pre-planned walkthroughs, this one transcribes an actual
     unscripted Q&A session verbatim: each of the 4 prompts asked this
     session, the real MCP tool calls, and the real output (domain-grouped
     capability table — 4+5+5+8=22 matching the tool's own `total`;
     sustainability's official summary + 5 featured KPIs; the Crawl→Walk
     maturity table plus which KPIs validate it; the 2 FOCUS-1.2-computable
     Unit Economics KPIs out of 9 official ones, plus the verbatim
     `calculate_kpi` error explaining why neither is in the server's
     auto-calculate list). Reused the shared chrome exactly (style block,
     header/footer), added one small page-specific `.prompt-box` style for
     the "you asked" callouts.
  Updated for the new 7-page count: `index.html`'s "Where to go next"
  next-grid (new 4th card) and lede; the 3 existing examples' closing
  cross-link paragraphs; `docs/guide/404.html`; `docs/README.md`;
  `docs/deploy-pages.md` (page-count text, smoke-test curl list, and a new
  "known gap" note); every "Page N of 6"/"identical on all six pages"/"six
  nav links" comment across all 7 HTML files, all bumped to 7. Did NOT
  touch `.github/workflows/pages.yml` (protected path) — its file-existence
  guard predates `example-quick-qa.html` and still only checks the original
  7 filenames; documented as a known gap in `deploy-pages.md` rather than
  editing a protected workflow file without explicit task authorization.
- result: Rendered all 7 pages headlessly (pre-installed Chromium via
  `playwright-core`, no new project dependency — installed with `--no-save`
  for local verification only, not added to `package.json`) at 390px and
  1280px and confirmed visually via screenshots: both nav rows fit one line
  at phone width on every page, `aria-current` styling correct throughout.
  Measured `document.documentElement.scrollWidth` at 390px on all 7 pages:
  **`index.html` and `focus-server.html` no longer overflow at all**
  (390===390, confirmed by `window.scrollTo` finding no real scroll room) —
  the nav row was the source of their share of the pre-existing "guide
  mobile overflow" bug noted in activeContext.md. `example-esr.html` and
  the new `example-quick-qa.html` were already/remain clean.
  `framework-server.html` (481px), `example-showback.html` (443px) and
  `example-forecasting.html` (456px) **still overflow** — verified this is
  a real, separate, content-driven leak (`window.scrollTo` actually moves
  `scrollX`, not an inert reading) from specific wide `.tbl-wrap` tables,
  not the nav — `.tbl-wrap` and its ancestor chain measure correctly
  bounded via `getBoundingClientRect`, so the leak is deeper than the
  container CSS. Did not chase this further — pre-existing, already
  tracked as "deserves its own task" in activeContext.md, out of scope for
  a nav-relabeling request. `./scripts/agentic gates` run after all edits
  (see summary below).
- implementer notes: `playwright-core` was installed with `npm install
  --no-save` purely to drive the pre-installed Chromium binary
  (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`) for measurement —
  `git status` confirms `package.json`/`package-lock.json` are unchanged by
  this, since `--no-save` never touched them.
- next: the residual `.tbl-wrap` overflow on 3 pages is worth its own
  tracked task — start by diffing what's different about
  `framework-server.html`'s/showback's/forecasting's wide tables vs.
  `focus-server.html`'s 9 tables (which don't leak) to find the actual
  content-shape trigger (long unbroken `.mono` tokens is the current
  suspect, unconfirmed).
