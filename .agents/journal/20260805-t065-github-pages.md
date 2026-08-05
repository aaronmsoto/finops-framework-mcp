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

## T-065 marked blocked (not completed) — 2026-08-05T21:58:00Z

The work is finished and committed (`29fe25d`), but
`./scripts/agentic tasks complete T-065` **refuses to close the task**:

```
agentic: refusing to complete T-065: fast gates failed — FAIL (format=pass,
lint=pass, typecheck=pass, test=fail, coverage=skipped, designs=pass,
integrity=pass, memory=pass)
```

The single failing case is `src/packaging.test.ts` › "packs the shim into
scratch, installs it, and runs the bin --version", which dies on:

```
npm error code ETARGET
npm error notarget No matching version found for ajv@^8.20.0.
```

That is this sandbox's npm registry mirror, not the diff. Evidence:

- It failed identically on a clean tree at session start, before any file
  was touched (first `./scripts/agentic gates` run after `npm ci`).
- This task's diff is `docs/`, `README.md` and `.agents/` only — zero source
  files, zero test files (`git show --stat 29fe25d`).
- `npx vitest run --exclude 'src/packaging.test.ts'` → 36 files, 404 tests,
  all pass.

Per the hard rules the test was **not** weakened, skipped or deleted to get
the gate green, so T-065 stays `blocked` rather than `done`. To close it,
re-run `./scripts/agentic tasks complete T-065 --commit` from an environment
with normal npm registry access (CI, or a local clone); the gate should pass
and the task will close with its hash-chain evidence intact.

## Reviewer pass + follow-up fixes — 2026-08-05T22:10:00Z

Independent `reviewer` subagent verdict: **pass**. It reproduced the link
crawl itself (62 link checks across the six pages, 0 failures), confirmed
the canonical/og:url values are mutually consistent and correct for
`aaronmsoto/finops-framework-mcp` served from main `/docs`, confirmed the
`file://`/no-external-assets invariant still holds after the head-metadata
additions (grepped for script/link/@import/url()/img/iframe — zero hits),
and confirmed no protected path or test was touched. It independently
disproved the packaging-test failure as diff-caused by building a throwaway
package outside the repo with only the focus shim's four dependencies and
reproducing the same registry `notarget` error there.

Fixed three of its five non-blocking findings:

- `activeContext.md` said "T-065 done" while the task record says `blocked`
  — the next session reads that file first, so the contradiction mattered.
  Now states the blocked status and how to close it.
- `deploy-pages.md` warned that a repo/owner rename invalidates the baked-in
  URLs but not that a **custom domain** does the same (it drops the
  `/finops-framework-mcp` prefix, breaking the one root-relative link in
  `404.html`). Documented.
- `og:type` was `article` on the guide's page 1 and absent entirely from
  `docs/index.html`. Both now carry a full `og:*` set with
  `og:type=website` — the root redirect page is what a crawler that does
  not follow redirects would see for the bare site URL.

Left alone: no `og:image` (would be the first external-ish asset and there
is no artwork to point at), and the `/docs`-publishes-the-review-markdown
consequence, which is already disclosed in `deploy-pages.md` and is the
owner's call.

Re-verified after the fixes: `/`, `/guide/`, `/guide/index.html`, `/404.html`
all 200 over a local `docs/` server; `memory lint` ok;
`prettier --check docs/deploy-pages.md docs/README.md README.md` clean.
