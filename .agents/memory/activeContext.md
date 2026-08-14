# Active context — the handoff file

<!--
  Format (keep all four sections, most recent truth only — this file is
  overwritten, not appended; history lives in .agents/journal/ and git):
    ## In flight       — what is currently being worked on, by whom/what mode
    ## Next steps      — ordered, concrete, small
    ## Open questions  — things a future session must not silently re-decide
    ## Last updated    — ISO date + actor
  `memory lint` warns when this file goes stale while commits continue.
-->

## In flight

**Nothing mid-task.** Recent history (full detail in `.agents/journal/`,
`decisions.md`, and git — this is a compact index, not a re-narration):

- **2026-08-07:** T-077 pre-publish hardening (bins, `server.json` schema
  validation, identity/version = 0.9.0, docs/UX fixes, publish pipeline,
  community docs) — merged via PR #17.
- **2026-08-13:** T-080 (tool-description audit), T-081 (`get_capability`'s
  `slug`→`capability`, `get_attribute`'s `slug`→`attribute` — decisions.md
  2026-08-13 amendment to the 2026-08-07 no-rename ruling), T-079
  (`get_kpi_mapping` capability-filter validation), version 0.9.0 → 0.1.0
  (decisions.md 2026-08-13, supersedes T-077's call), and the guide nav
  restructure (6-label nav → 4 + Examples sub-nav, 7th page
  `example-quick-qa.html` transcribing a live Q&A session).
- **2026-08-14:** PR #20 (bundling all of the above) and the rolling
  "Release: dev → main" PR #21 it triggered both merged by the owner
  within minutes. Confirmed live at
  https://aaronmsoto.github.io/finops-framework-mcp/. Root README.md
  reorganized for FinOps-practitioner readability (guide linked in the
  first section, not the sixth; plain-language "why this exists" before
  any MCP/pipeline internals) and audited both READMEs for stale `0.9`
  references the earlier version-bump grep missed (`@0.9` npm dist-tag
  hints, not caught by a literal `0.9.0` search) — fixed both to `@0.1`;
  also added the missing "unofficial" self-description to
  `packages/finops-focus-mcp/README.md`'s opening line (its own
  `package.json` description already said it; the README didn't) and
  added the README's guide table's missing 7th row.

## Next steps

1. **Resolved (2026-08-14):** GitHub deleted the **`dev` branch** when PR
   #21 merged (its own "delete head branch on merge" setting, since `dev`
   was #21's head ref). Owner chose to keep the existing dev→main
   rolling-release pattern; `dev` recreated from `main`'s current tip
   (`git push origin main:dev`, confirmed via `git ls-remote`: `dev` and
   `main` both at `77f48dc`). **Still worth checking:** Settings → General
   → "Automatically delete head branches" — if on, it will delete `dev`
   again the next time a PR with `dev` as its head branch merges (i.e.
   every "Release: dev → main" rolling PR). Turning that setting off is
   the actual fix; recreating the branch is just a one-time patch.
2. Owner: flip the repo public — still **private** as of 2026-08-14
   (confirmed via the GitHub API; Pages serves it anyway on the paid
   plan), which is why `docs/release-runbook.md`'s npm trusted-publishing
   flow and the "flip public" step are both still open.
3. Owner: follow `docs/release-runbook.md` — manual first `npm publish` of
   both packages (0.1.0), configure trusted publishers, submit both
   `server.json` manifests via `mcp-publisher`.
4. Owner: `wrangler deploy` (set `ALLOWED_ORIGINS`), `wrangler pages deploy
   demo/`; smoke-test the demo against the deployed Worker.

## Open questions

- `src/shared/index.ts` `export *` barrel: any new server code importing a
  real binding from it can silently reintroduce fs-reachability in the
  Worker; `fs-boundary.test.ts` only catches code reachable from
  `src/workers/index.ts`. Splitting the barrel is a real refactor (queued
  observation since T-037).
- `validateFocusCsv` can't validate JSON-typed columns whose
  `allowed_values` are embedded-key names (1.2 `SkuPriceDetails`); the
  generator emits null as a workaround (decisions.md 2026-07-28).
- M11 rename (Action → MaturityCharacteristic) — owner call; moot while
  Actions stay behind `FINOPS_MCP_EXPERIMENTAL`.
- MCP SDK zod validation silently strips unknown tool params
  (docs/eval-results.md #3) — revisit when the SDK supports strict input
  schemas.
- Trademark posture (decisions.md, accepted-risk, phrasing now "unofficial"
  everywhere outward-facing): revisit only if the FinOps Foundation objects.
- Panel nice-to-haves deliberately deferred: README badges, `exports` field
  for `dist/index.js` (currently shipped but unimportable), markdown text
  blocks for `get_capability`/`get_kpis`, dropping `get_actions`' `level`
  alias, glossary lookup tool, trimming `dist/shared/focus/*` from the root
  tarball.
- Guide mobile overflow (pre-existing, noted by T-078) — **partially fixed
  2026-08-13**: shortening the nav eliminated the leak on `index.html` and
  `focus-server.html` (confirmed via `document.documentElement.scrollWidth`
  at 390px). **Still open** on `framework-server.html`,
  `example-showback.html` and `example-forecasting.html`: a *different*,
  content-driven leak — certain wide `.tbl-wrap` tables (long unbroken
  `.mono` strings in cells) escape their `overflow-x:auto` container and
  widen `document.documentElement` itself (verified real via
  `window.scrollTo` actually moving `scrollX`). `.tbl-wrap` and its
  ancestor chain measure correctly bounded via `getBoundingClientRect`, so
  the cause is deeper than the container CSS — still deserves its own task.
- Upstream porting status: the two policy toggles (`solo_maintainer`,
  `ai_attribution`) ALREADY shipped in harness 0.2.0 (starter T-012/T-013);
  the remaining harness feedback (incl. task-ID collisions) lives in
  agentic-starter-repo's activeContext Next steps 9–14.
  `.agents/specs/upstream-port-to-agentic-starter-repo.md` (from PR #15)
  is the fuller port brief; its toggle diffs are done, its smaller
  feedback list is superseded by the starter-repo list.

## Last updated

2026-08-14 — Reorganized root README.md and the FOCUS package README for
FinOps-practitioner readability; fixed leftover `@0.9` npm version pins
and a missing "unofficial" self-description. Recreated the `dev` branch
(owner-approved) after GitHub's merge cleanup deleted it; flagged that
"Automatically delete head branches" needs turning off or this repeats
every rolling-release merge.
