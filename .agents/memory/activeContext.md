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

**Merge reconciliation (2026-08-07):** `origin/main` merged into the
release line — main carried PR #15 (guide large-viewport widening from a
parallel session) which `dev` lacked, leaving rolling PR #17 conflicted.
Its task collided on ID **T-073** (already the npm-harness task on this
chain) and was renumbered **T-078** with the chain recomputed; journal
`20260806-t073-guide-wide-viewport.md` keeps the old ID (same precedent as
the T-065..T-067 renumbering — second occurrence of upstream feedback
item 13). The guide widening itself (`--wrap` custom property in the
shared chrome, datamodel flex) merged cleanly alongside this branch's
`npx -y`/unofficial edits.

**Pre-publish hardening COMPLETE (T-077, 2026-08-07, branch
claude/session-k75rxy).** A 3-expert review panel (MCP design, npm
publishing, OSS readiness) audited the repo for open-sourcing + npm publish;
the owner approved every finding. Landed, one commit per item:

- **B1:** both bins resolve data/package.json via `fileURLToPath` —
  `URL.pathname` broke npx on Windows and space-containing paths (reproduced,
  then regression-covered by space-containing scratch dirs in
  `src/packaging.test.ts`).
- **B2:** both `server.json` manifests now validate against the 2025-09-29
  registry schema (descriptions were over the 100-char max); env vars +
  websiteUrl declared.
- **Identity/version:** servers report their package names (framework was
  `finops-framework`), plus `title`; ALL versions moved to **0.9.0** (owner
  call: first public release is deliberately not v1). Sync tests:
  `tests/version-sync.test.ts` (server.ts ↔ package.json),
  `src/servers/focus/default-version.test.ts` (DEFAULT_VERSION ↔ data
  latest). SERVER_VERSION stays a literal — Worker fs boundary.
- **Docs/UX:** instructions counts derived from artifact; FOCUS "every tool
  takes version" overclaim fixed; `npx -y` everywhere; "official" phrasing
  now "unofficial" in package descriptions/README/guide; root NOTICE.md
  carries the trademark non-affiliation sentence.
- **Pipeline:** `publish.yml` (tag-triggered, npm trusted publishing/OIDC);
  `pack-focus.mjs` rebuilds on stale dist (mtime check), stale local .tgz
  deleted; **`docs/release-runbook.md` is the publish procedure now** —
  first publish per package is manual (trusted publishing needs an existing
  package), then per-package trusted-publisher config on npmjs.com.
- **Community:** CONTRIBUTING split into external (registry-free npm
  commands, matching CI gates-fast) vs maintainer (harness) paths;
  AI-attribution ground rule corrected to `allow`; CODE_OF_CONDUCT
  (Contributor Covenant 2.1, GitHub private reporting as contact); YAML
  issue forms replace the markdown template; PR template harness items are
  maintainer-only.

Prior state (Pages live at aaronmsoto.github.io/finops-framework-mcp,
solo_maintainer + ai_attribution toggles working, Phase C npm-harness
complete on @aaronmsoto/agentic-harness@0.2.1) is unchanged — see journal
20260806-* files.

## Next steps

1. Owner: merge the T-077 PR, flip the repo public.
2. Owner: follow `docs/release-runbook.md` — manual first `npm publish` of
   both packages (0.9.0), configure trusted publishers, submit both
   `server.json` manifests via `mcp-publisher`.
3. Owner: `wrangler deploy` (set `ALLOWED_ORIGINS`), `wrangler pages deploy
   demo/`; smoke-test the demo against the deployed Worker.
4. Post-merge observable still pending: `governance` CI job green ("success",
   not "skipped") on a real PR, proving the package-access grant.

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
- Guide mobile overflow (pre-existing, noted by T-078): `index`,
  `framework-server` and `focus-server` overflow horizontally at 414/360px.
  Deserves its own task.
- Upstream porting status: the two policy toggles (`solo_maintainer`,
  `ai_attribution`) ALREADY shipped in harness 0.2.0 (starter T-012/T-013);
  the remaining harness feedback (incl. task-ID collisions — bit again in
  THIS merge) lives in agentic-starter-repo's activeContext Next steps
  9–14. `.agents/specs/upstream-port-to-agentic-starter-repo.md` (from
  PR #15) is the fuller port brief; its toggle diffs are done, its smaller
  feedback list is superseded by the starter-repo list.

## Last updated

2026-08-07 — T-077 pre-publish hardening session (review panel findings
implemented; versions at 0.9.0; publish procedure in
docs/release-runbook.md), then main→dev merge reconciliation
(T-073(main) → T-078 renumbering) to unblock rolling PR #17.
