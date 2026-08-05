# Publishing the usage guide on GitHub Pages

Owner-only checklist. Enabling Pages is a repository **setting**, not
something in this repo — no agent, workflow, or script here can turn it on,
and the GitHub API path for it is blocked to automation. Everything below
that _is_ in the repo is already in place; steps 1–2 are the human part.

The published site is the six-page usage guide in [`guide/`](guide/index.html).

## Prerequisites

- **The repository must be public**, or the account must be on GitHub Pro /
  Team / Enterprise. GitHub Pages is not available for private repositories
  on the Free plan. This repo is currently **private**, so on a Free plan
  step 1 will not offer a source until the repo is made public.
- The content must be on the branch you select in step 1 — Pages serves a
  branch, not a pull request. Merging the branch that carries these files to
  `main` is the normal path (merging to `main` is a human approval point per
  `approvals.yaml`).

## 1. Turn Pages on

Repository **Settings → Pages**:

| Field  | Value                |
| ------ | -------------------- |
| Source | Deploy from a branch |
| Branch | `main`               |
| Folder | `/docs`              |

Save. The first build takes a minute or two; the URL appears on the same
settings page.

## 2. Check the result

Published URL: <https://aaronmsoto.github.io/finops-framework-mcp/>

| Path                 | Serves                                                |
| -------------------- | ----------------------------------------------------- |
| `/`                  | `docs/index.html` — redirects to the guide            |
| `/guide/`            | `docs/guide/index.html` — page 1 of 6, the front door |
| `/guide/<page>.html` | the other five guide pages                            |
| anything unmatched   | `docs/404.html`                                       |

Smoke test after the build goes green:

```sh
BASE=https://aaronmsoto.github.io/finops-framework-mcp
for p in / /guide/ /guide/framework-server.html /guide/focus-server.html \
         /guide/example-showback.html /guide/example-esr.html \
         /guide/example-forecasting.html; do
  printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$p")" "$p"
done
```

All seven should be `200`.

## What is in the repo for this

- `docs/index.html` — the site root; redirects `/` to `/guide/`.
- `docs/404.html` — the Pages 404 page (must live at the published root).
- `docs/.nojekyll` — turns Jekyll off. Without it Pages would render every
  markdown file under `docs/` as a web page and would rewrite paths starting
  with `_`. With it, the HTML is served exactly as committed and the
  markdown is served as raw text.
- `docs/guide/*.html` — the guide itself. Self-contained: no external CSS,
  fonts, scripts or images, so every page also opens over `file://`.
  Each page carries a `description`, `canonical` and Open Graph tags
  pointing at the URLs in the table above.

## Notes and limits

- **Publishing `/docs` publishes everything under it**, including the
  internal review documents (`critique-*.md`, `final-status-review.md`,
  `eval-results.md`). They are served as raw markdown, unlinked from the
  guide and not indexed by anything that follows links only — but they are
  reachable by exact URL. They are equally readable on github.com once the
  repository is public, so this exposes nothing the public repo would not.
  If that is not acceptable, the alternative is a Pages source of
  "GitHub Actions" plus a workflow that uploads only `docs/guide/` — that
  needs a new file in `.github/workflows/`, a protected path, so it has to
  be an explicitly authorised task.
- The two guide pages that link to `../mcp-surface.md` resolve to
  `/mcp-surface.md` on the published site and download as plain markdown.
  Publishing only `docs/guide/` (the alternative above) would break those
  two links.
- Changing the repository name or owner changes the published URL, which
  would invalidate the `canonical`/`og:url` values baked into the six guide
  pages and the root-relative link in `docs/404.html`. **A custom domain
  does the same**: it drops the `/finops-framework-mcp` path prefix, so that
  one link in `404.html` has to lose the prefix too. The guide pages
  themselves link relatively and survive either change.
