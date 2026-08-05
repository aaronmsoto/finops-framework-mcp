# 2026-08-05 — T-065 publish the usage guide on GitHub Pages

## Make docs/ a publishable GitHub Pages site root — 2026-08-05T21:40:00Z

**Did.** Turned the existing six-page usage guide (`docs/guide/`) into the
repo's public web site, served from `docs/` on branch `main`.

- `docs/index.html` — site root, redirects `/` to `/guide/index.html` three
  ways (`<meta http-equiv=refresh>`, `location.replace`, visible link) so it
  works with JS off. Styled with the guide's palette, light + dark.
- `docs/404.html` — the Pages not-found page (must live at the published
  root, so it uses a root-relative `/finops-framework-mcp/guide/...` link
  rather than a relative one).
- `docs/.nojekyll` — Jekyll off. Without it Pages would render every
  markdown file under `docs/` as a page and rewrite `_`-prefixed paths.
- All six guide pages: added a per-page `<head>` block below the `<title>` —
  `description`, `rel=canonical`, `og:type/site_name/title/description/url`,
  `twitter:card` — pointing at
  `https://aaronmsoto.github.io/finops-framework-mcp/guide/…`. No external
  assets added, so the `file://` invariant holds. Noted in the shared-chrome
  comment in `index.html` that `<head>` metadata is per-page, NOT chrome.
- `docs/deploy-pages.md` — owner checklist, same shape as
  `deploy-worker.md`: the Settings → Pages fields, the URL table, a curl
  smoke test, and the two limits (publishing `/docs` also serves the
  internal `critique-*.md` / `final-status-review.md` as raw markdown; a
  repo/owner rename invalidates the baked-in canonical URLs).
- `README.md` + `docs/README.md` point at the published URL and the new doc.

**Result.**

- `./scripts/agentic gates`: format/lint/typecheck/designs/integrity/memory
  PASS. `test` FAIL on one case only — `src/packaging.test.ts` "packs the
  shim into scratch, installs it, and runs the bin --version", which dies on
  `npm error notarget No matching version found for ajv@^8.20.0`. This is
  the sandbox's npm registry mirror, not the change: it failed identically
  on a clean tree before any edit, and this task's diff touches only
  `docs/`, `README.md` and `.agents/`. `npx vitest run --exclude
  'src/packaging.test.ts'` → **36 files, 404 tests, all pass**.
- `design check` now reports 8 warnings, up from 6 — the two new HTML files
  under `docs/`. Gate still PASS (warnings are advisory). Same known
  template gap as the six guide pages: `design check` has no allowlist for
  HTML dirs outside `docs/designs/`.
- **Ran the site.** Served `docs/` on `localhost:8899` (the exact shape
  Pages serves) and checked every path: `/`, `/index.html`, `/guide/`,
  all six `/guide/*.html`, `/mcp-surface.md`, `/404.html` — **11/11 HTTP
  200**. Crawled every non-external `href` on all six pages: **8 internal
  link targets, 0 broken**. Headless Chromium: `/` lands on
  `/guide/index.html` with JS on *and* with `javaScriptEnabled: false` in
  dark mode (meta-refresh path); 404 page and a guide page both screenshot
  clean.

**Next / blockers.** The last step is not agent-reachable and not on this
branch:

1. **Enabling Pages is owner-only.** It is a repo setting; the GitHub API
   path (`/repos/{o}/{r}/pages`) is blocked to this session's proxy —
   verified, HTTP 403 "Access to this GitHub API path is not permitted
   through this proxy."
2. **The repo is private** (`visibility: private`, confirmed via the API).
   Pages is unavailable for private repos on GitHub Free — the repo must go
   public, or the account be on Pro/Team/Enterprise, before Settings → Pages
   offers a source at all.
3. Pages serves a branch, so this has to reach `main` first — merging to
   `main` is a human approval point per `approvals.yaml`.
