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

## Owner decision: publish docs/guide/ only, via Actions — 2026-08-05T22:45:00Z

**Decision.** The owner asked whether narrowing the published set to
`docs/guide/` was worth it. Two facts settled it: GitHub's branch source
offers only `/` or `/docs` (a deeper folder is not selectable), and a
*project* Pages site cannot carry its own `robots.txt` (it lives in the
`aaronmsoto.github.io` user repo). So narrowing means Pages source =
"GitHub Actions". Chosen — **not** for secrecy (a public repo exposes those
files on github.com anyway) but because the guide then serves at the bare
`https://aaronmsoto.github.io/finops-framework-mcp/` with no redirect hop.

**Did.** Reworked the branch-source setup from earlier this session into an
Actions deployment publishing `docs/guide/` alone:

- `docs/proposed/pages.yml` (new) — staged, uninstalled, following the
  `refresh-data.yml` convention (`.github/workflows/` is protected, so the
  owner runs `git mv`). `push` to main filtered on `docs/guide/**` plus
  `workflow_dispatch`; least-privilege `contents: read` / `pages: write` /
  `id-token: write`; `concurrency: pages` with `cancel-in-progress: false`;
  a guard step that fails if any of the seven expected files is missing so a
  bad path filter cannot publish an empty site over a working one.
- `docs/index.html` **deleted** — the redirect existed only to give the
  `/docs` root a front door; the guide is now the root itself.
- `docs/404.html` → `docs/guide/404.html` (must sit at the published root),
  its link retargeted from `/finops-framework-mcp/guide/index.html` to
  `/finops-framework-mcp/`.
- `docs/.nojekyll` → `docs/guide/.nojekyll`. The Actions path never runs
  Jekyll; kept as insurance if the source is ever switched back to a branch.
- All six pages: `canonical`/`og:url` re-baked without the `/guide/` segment
  (`…/finops-framework-mcp/` for page 1, `…/<file>.html` for the rest).
- The two `href="../mcp-surface.md"` links (framework-server, focus-server)
  now point at the GitHub blob URL on `main` — that file is no longer on the
  published site, so a relative link would 404.
- `deploy-pages.md` rewritten for the three-step owner flow; `README.md`,
  `docs/README.md` and the shared-chrome comment in `guide/index.html`
  updated to say only `docs/guide/` is published.

**Result.** Served `docs/guide/` as a site root on localhost — the exact
shape the artifact upload produces: `/`, `/index.html`, the five other
pages and `/404.html` all **200 (8/8)**; crawled every non-external `href`
across all seven files, **8 internal targets, 0 broken**; `canonical` ==
`og:url` on all six pages and each matches its own filename. Ran the
workflow's guard step by hand — all seven files present and non-empty.
`docs/proposed/pages.yml` parses as valid YAML with the expected job shape.
`./scripts/agentic gates`: everything PASS except the same pre-existing
sandbox `src/packaging.test.ts` registry failure documented above.

**Still owner-gated**, now three steps: (1) repo public or paid plan,
(2) merge to `main`, (3) `git mv docs/proposed/pages.yml
.github/workflows/pages.yml` **and** Settings → Pages → Source = GitHub
Actions.

## T-065 closed — the npm failure was a stale cache — 2026-08-06T01:50:00Z

The blocker above is resolved, and the earlier diagnosis was incomplete.
It was not that the sandbox registry mirror lacks the packages — `npm view
ajv@^8.20.0 version` returns `8.20.0` fine. The **local npm cache held stale
packuments**, and `src/packaging.test.ts` installs with `--prefer-offline`
(deliberately, per T-050, to dodge ENOTCACHED in CI), so range resolution
read those stale packuments and reported `notarget`. The tell: on retry it
failed on a *different* package (`qs@^6.15.2` instead of `ajv@^8.20.0`) —
a genuinely missing dependency would not move around.

`npm cache clean --force` fixed it outright:

- `npx vitest run src/packaging.test.ts` → 3/3 pass.
- `./scripts/agentic gates --tier all` → **PASS** on every gate
  (format, lint, typecheck, test, designs, integrity, memory, build).
- `./scripts/agentic tasks complete T-065 --commit` → chain extended,
  `7576a10b34e5463264df420a2c96b11a11cd8966171a8f0860be8bb88650484b`.
- `./scripts/agentic verify` → all checks pass (gates-fast, chain-valid,
  working-tree-clean, done-tasks-have-evidence, acceptance-criteria-present).

Worth remembering: a `notarget` error under `--prefer-offline` means "stale
cache" at least as often as it means "package missing". Clear the cache
before concluding the environment is broken.
