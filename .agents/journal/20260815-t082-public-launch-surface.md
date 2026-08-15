## T-082 — repo link in the guide, scrub experimental from public docs — 2026-08-15T00:00:00Z

- did: Owner request now that the repo is public and PRs #22/#23 are merged
  (`dev` survived #23's merge, unlike #21): put a prominent link to the repo
  on the GitHub Pages guide, remove all public references to the experimental
  content ("we will add that back once that content is more ready"), and
  update the GitHub About description to mention both servers. Owner chose,
  via clarifying questions: docs-scrub-but-keep-the-code; header link on
  every page plus an intro callout; practitioner-facing description wording.
  - **Repo link.** The guide had *no* link back to the repo — the only two
    `github.com` URLs anywhere in it were deep links to
    `docs/mcp-surface.md`. Added `<a class="repo-link">Source on GitHub ↗</a>
    to the shared `<header class="guide">` on all 7 pages, wrapped with the
    existing title in a new `.title-row` flex row. Deliberately on the
    **title row, not the nav row**: the nav was shortened to four short
    labels in the previous session specifically so it fits one line at phone
    widths, and adding a fifth item would have undone that. Plus a
    `.next-card`-styled callout on `index.html` (reusing the existing
    prominent-link-with-blurb pattern already used five times on that page)
    and a small link on `404.html`, which has its own standalone chrome and
    is not part of the seven-page shared-chrome system.
  - The chrome is hand-duplicated across the 7 pages with no build step, so
    both the CSS block and the header markup were inserted by a script that
    asserts the anchor string occurs exactly once per file before writing —
    the seven copies stay byte-identical, as the in-file comments claim.
  - No `<img>`, no CDN-fetched SVG: the guide's own header comment asserts it
    has zero external assets and renders over `file://`, so the link is a
    text arrow with CSS-drawn pill styling. Re-verified: still zero `src=`,
    zero stylesheet links, zero `@import` across all 8 files.
  - **Experimental scrub** (see decisions.md 2026-08-15 for the boundary and
    why `docs/architecture.md` and `NOTICE.md` were deliberately left alone).
    `README.md` lost the whole "Experimental extensions (opt-in)" section;
    the surviving paragraph keeps the load-bearing points (official-only, the
    deleted relationship graph, the spec pointer). `docs/guide/index.html`'s
    "Official by default" bullet and its install note, and
    `docs/guide/framework-server.html`'s two flag paragraphs, were rewritten
    to keep their actual message — "the default surface is official content
    only" — without naming the flag. Root `server.json` lost its
    `FINOPS_MCP_EXPERIMENTAL` `environmentVariables` entry (the FOCUS
    package's manifest never had one).
  - **Generator + test.** `scripts/gen-mcp-surface.mjs` no longer opens the
    second `FINOPS_MCP_EXPERIMENTAL=1` stdio connection or emits the
    "Experimental extensions" section, and the Legend lost its "gated behind
    an opt-in environment flag" clause. `src/servers/mcp-surface.test.ts`'s
    experimental case was **inverted, not deleted** — it still boots the
    flag-on server and diffs its tool list against the default one, but now
    asserts the gated tools are absent from the doc, and asserts the gated
    set is non-empty so the check can't silently pass on a no-op. That is a
    tighter contract than before, not a weakened one; flagging it explicitly
    here because "changed a test while making a scrub pass" is exactly the
    shape the integrity rule exists to catch.
- result: `./scripts/agentic gates --tier all` **PASS** (format, lint,
  typecheck, test, designs, integrity, memory, build; e2e skipped — no
  command bound). `node scripts/gen-mcp-surface.mjs --check` reports the
  committed doc up to date.
  - **Behavior probed live**, since the whole point was that this is
    docs-only: default stdio `tools/list` returns **11 tools with
    `get_actions` absent**; `FINOPS_MCP_EXPERIMENTAL=1` returns **12 tools
    with `get_actions` present**. The code path is exactly as it was.
  - **Guide rendered headless** (pre-installed Chromium via playwright-core,
    installed `--no-save` — `package.json`/`package-lock.json` untouched) at
    390px and 1280px across all 8 pages: the repo link is present and
    visible within the viewport on every page at both widths, and
    `document.documentElement.scrollWidth` is unchanged from the values
    recorded before this change — `index.html` and `focus-server.html` stay
    clean at 390/390, and `framework-server.html` (481), `example-showback`
    (443) and `example-forecasting` (456) still overflow by the *same*
    amounts as before, i.e. the pre-existing content-driven `.tbl-wrap`
    leak, not anything this change introduced.
  - **Repo description NOT applied.** `PATCH /repos/aaronmsoto/finops-framework-mcp`
    returned `403 {"message":"Repository settings writes are not permitted
    through this proxy."}`. This is an environment limit, not a permissions
    misconfiguration on the repo — no agent session behind this proxy can set
    it. Owner step, wording recorded in activeContext.md next-steps #1.
- implementer notes: the scrub has no automated guard on `README.md` or the
  guide HTML — nothing asserts their content, which is exactly how the stale
  `@0.9` pins survived into last session. A cheap grep gate over a forbidden-
  string list would make this self-enforcing; queued as follow-on, not done
  here because `agentic.config.json` gate definitions are a protected path.
- next: owner sets the About description/topics/website; then npm first
  publish of both packages at 0.1.0 and the Cloudflare Worker + Pages deploy,
  both queued behind tokens the owner will paste into a session.

## T-082 — reviewer findings applied — 2026-08-15T00:00:00Z

- did: Independent `reviewer` subagent pass (verdict: pass, all four
  acceptance criteria reproduced independently — it re-ran the build, both
  stdio postures, `--experimental` as well as the env var, a live
  `tools/call get_actions`, `gen-mcp-surface --check`, and the full gate
  suite; it also hashed the two inserted chrome blocks and confirmed they
  are byte-identical across all 7 pages, and walked four mutation cases
  against the inverted mcp-surface test to confirm it still fails on a real
  regression rather than passing vacuously).
  - **Fixed the one real regression it found.** Rewriting the README's
    official-only paragraph, I dropped the original's "by default"
    qualifier, turning a scoped claim into an absolute one — and the
    absolute version is contradicted inside the same npm tarball, since
    `NOTICE.md` discloses the pre-crawl level and parsed Action records and
    `data/framework/derived/{actions,maturity-extension}.json` are in
    `package.json`'s `files`. Same shape had crept into
    `docs/guide/index.html`'s "Official by default" bullet. Both now scoped
    with "Out of the box"; `docs/guide/framework-server.html`'s equivalent
    ("Everything in this server's default posture…") re-scoped the same way,
    which also removes the last "default posture" phrasing implying a
    non-default one exists. Worth naming plainly: the scrub's goal was to
    stop advertising a feature, and the failure mode of that goal is
    over-claiming its absence.
  - Also tightened the provenance sentence on `framework-server.html`: it
    claimed an answer's `structuredContent` "can be traced back to the
    `source_url` it carries", but `get_maturity_model`'s structuredContent
    has no `source_url` (its provenance is in the text footer). Reworded to
    say content records carry `source_url` alongside the footer.
- result: `./scripts/agentic gates --tier all` PASS again after the edits;
  `node scripts/gen-mcp-surface.mjs --check` still clean.
- implementer notes: two reviewer observations left as-is, both cosmetic and
  both recorded here rather than silently dropped. (a) `docs/mcp-surface.md`'s
  legend still labels the badge `[UNOFFICIAL/EXPERIMENTAL]` while its text now
  only describes unofficial derived content — the label is generated from a
  regex matching either word, so it is accurate about its own derivation, and
  no currently-badged entry is flag-gated. (b) The task hash chain is extended
  by `tasks complete`, run after this entry.
