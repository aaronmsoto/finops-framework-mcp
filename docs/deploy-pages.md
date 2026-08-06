# Publishing the usage guide on GitHub Pages

The deploy workflow is **installed** at
[`.github/workflows/pages.yml`](../.github/workflows/pages.yml). One owner
step remains, and it is a repository **setting** rather than anything in this
repo — the Pages REST API is blocked to agent sessions, so no automation here
can do it.

The published site is the six-page usage guide in [`guide/`](guide/index.html)
— **only** that directory. Nothing else under `docs/` is served.

## Prerequisites

- **GitHub Pages must be available for this repository.** It is included for
  private repos on GitHub Pro / Team / Enterprise, but on the Free plan it
  requires a public repository. This repo is private, so on Free the setting
  below will not offer a source at all.
- On Pro, the repository stays private while the **published site is public**
  — access-controlled (private) Pages sites are GitHub Enterprise Cloud only.
  That is the intended posture here: public guide, private repo, and the
  internal review markdown never leaves the repo because the workflow uploads
  only `docs/guide/`.
- The workflow deploys from `main`, so the content has to be merged there
  first (merging to `main` is a human approval point per `approvals.yaml`).

## 1. Turn Pages on

Repository **Settings → Pages → Source: GitHub Actions**.

Do _not_ pick "Deploy from a branch" — that ignores the workflow, and its
folder options are only `/` or `/docs`, neither of which is the guide.

## 2. Run it and check the result

The workflow runs on any push to `main` touching `docs/guide/**`, and can be
started by hand from **Actions → pages → Run workflow**.

Published URL: <https://aaronmsoto.github.io/finops-framework-mcp/>

| Path               | Serves                                                |
| ------------------ | ----------------------------------------------------- |
| `/`                | `docs/guide/index.html` — page 1 of 6, the front door |
| `/<page>.html`     | the other five guide pages                            |
| anything unmatched | `docs/guide/404.html`                                 |

Smoke test once the deploy goes green:

```sh
BASE=https://aaronmsoto.github.io/finops-framework-mcp
for p in / /framework-server.html /focus-server.html /example-showback.html \
         /example-esr.html /example-forecasting.html; do
  printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$p")" "$p"
done
curl -s -o /dev/null -w '%{http_code} (expect 404) /no-such-page\n' "$BASE/no-such-page"
```

The six real paths should be `200`.

## What is in the repo for this

- `.github/workflows/pages.yml` — the deploy workflow. Uploads
  `docs/guide` as the Pages artifact; least-privilege permissions
  (`contents: read`, `pages: write`, `id-token: write`); guards against
  publishing an empty site by failing if any of the seven expected files is
  missing.
- `docs/guide/*.html` — the guide. Self-contained: no external CSS, fonts,
  scripts or images, so every page also opens over `file://`. Each carries a
  `description`, `canonical` and Open Graph tags pointing at the URLs above.
- `docs/guide/404.html` — the Pages 404 page; lives in `guide/` because that
  directory becomes the site root.
- `docs/guide/.nojekyll` — belt and braces. The Actions deploy path does not
  run Jekyll at all, but this keeps the site correct if anyone ever switches
  the source back to a branch.

## Notes and limits

- **Only `docs/guide/` is published.** The internal review documents
  (`critique-*.md`, `final-status-review.md`, `eval-results.md`,
  `research.md`) are not served on the public site. While the repository is
  private that is the only thing keeping them off the web; if the repository
  is ever made public they become readable on github.com regardless, because
  this controls the web site, not repository visibility.
- Because the rest of `docs/` is off-site, the two guide pages that cite
  `docs/mcp-surface.md` link to the GitHub blob URL on `main` rather than a
  relative path. If `mcp-surface.md` is ever moved or renamed, those two
  links break silently — nothing validates them.
- Changing the repository name or owner changes the published URL, which
  invalidates the `canonical`/`og:url` values baked into the six guide pages
  and the root-relative link in `404.html`. **A custom domain does the
  same**: it drops the `/finops-framework-mcp` path prefix, so that link in
  `404.html` has to lose the prefix too. The guide pages link to each other
  relatively and survive either change.
- A _project_ Pages site cannot carry its own `robots.txt` — for
  `aaronmsoto.github.io/finops-framework-mcp/` the crawler directives live at
  `aaronmsoto.github.io/robots.txt`, i.e. in a separate `aaronmsoto.github.io`
  repository. Nothing here can control indexing.
