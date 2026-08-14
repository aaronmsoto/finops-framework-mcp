## Reorganize root README for FinOps-practitioner readability — 2026-08-14T00:00:00Z

- did: Owner request, prompted by PR #20/#21 landing live on GitHub Pages
  earlier the same session: clean up, reorganize, and improve the root
  `README.md` for public readability, mention the usage guide higher, make
  it read for an end-user/non-technical FinOps practitioner rather than
  leading with MCP-protocol internals, fix at least one leftover `0.9`
  version reference, and check `docs/` for similar accuracy gaps.
  - **Root README.md restructured.** Old order: title → crawler pipeline
    diagram → Quickstart → experimental extensions → refresh/versioning →
    license → sibling server → Documentation (guide link, 6th section) →
    Development. New order: title (plain-language one-liner) → **"Start
    here: the usage guide"** (the guide link is now the second thing on
    the page, framed as "no-install, for practitioners as much as
    engineers") → **"Why this exists"** (plain-language value prop: an AI
    assistant will happily improvise a FinOps answer without this; these
    servers exist so it doesn't have to — read-only, offline, sourced) →
    Quickstart (unchanged content, just moved down since it's inherently
    technical) → "How it's built" (renamed from the old un-headed intro;
    the crawler/artifact/server pipeline diagram lives here now, further
    down) → Experimental extensions → Refresh/versioning → License →
    Sibling server → Documentation (guide table) → Development.
  - **Leftover version references fixed.** The prior version-bump session
    grepped for the literal `0.9.0` and missed `@0.9` — an npm dist-tag
    pin hint ("`npx -y finops-framework-mcp@latest` or `@0.9`") in both
    README.md and `packages/finops-focus-mcp/README.md`. Both now read
    `@0.1`.
  - **`docs/` accuracy sweep.** Checked every `docs/*.md` for stale
    version numbers, tool counts, and page counts against the current
    code: `docs/release-runbook.md`, `docs/deploy-worker.md`,
    `CONTRIBUTING.md`, `NOTICE.md` — no stale references found.
    `docs/architecture.md`'s one `0.9` hit is a sitemap `priority` value,
    unrelated, left alone. `docs/deploy-pages.md`'s "six guide pages" line
    (flagged by a naive grep) is actually correct — 7 total pages minus
    the front door = 6 others, already fixed in the prior guide-nav
    session. Verified all 6 principle/phase/domain/capability/persona/
    tech-category/KPI counts in the README's opening paragraph
    (6/3/4/22/11/5/88) live against `get_framework_info` — still accurate,
    unchanged by this session's param-rename/validation work.
  - **Found and fixed a real gap the grep alone wouldn't have caught:**
    the README's own guide-page table only listed 6 rows — it was never
    updated when `example-quick-qa.html` (the 7th page) was added earlier
    this session. Added the missing row.
  - **`packages/finops-focus-mcp/README.md`** also got its opening line
    changed from "An MCP server..." to "An unofficial MCP server..." —
    its own `package.json` description already said "Unofficial", the
    README's self-description didn't, an inconsistency the 2026-08-07
    "official→unofficial" rephrasing pass apparently missed for this one
    file.
  - Also trimmed `.agents/memory/activeContext.md`'s "In flight" section:
    it had accumulated five separate multi-paragraph "complete" writeups
    (T-077, T-080, T-079, T-081, guide restructure, version bump) that are
    all now merged and live — collapsed to a compact dated index per the
    file's own "most recent truth, not a re-narration" convention, full
    detail already living in journal files and `decisions.md`.
- result: `./scripts/agentic gates` full run PASS (format, lint, typecheck,
  test — 414 tests, designs, integrity, memory). No product code touched
  (README.md, packages/finops-focus-mcp/README.md, and the memory bank
  only), so no behavior to probe live — verified instead by reading the
  rendered markdown structure and cross-checking every fact against
  current source (get_framework_info counts, actual file listings for
  every Development-section link, actual guide page count).
- implementer notes: did not add README badges — explicitly listed as a
  deferred "panel nice-to-have" in activeContext.md's open questions, not
  in scope for this request. Did not touch `docs/README.md` further
  (already fixed for the 7-page count in the prior guide-nav session).
- next: `dev` branch is gone (see activeContext.md's "Next steps" #1) —
  this commit, like the memory-note corrections before it, is stranded on
  `claude/session-k75rxy` until the owner recreates `dev` or the workflow
  changes to target `main` directly.
