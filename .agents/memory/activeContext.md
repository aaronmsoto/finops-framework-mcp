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

**CI product/governance split — T-065/T-066 done, T-067 pending**
(spec `.agents/specs/ci-product-governance-split.md`, owner-validated
2026-08-04, all four open questions resolved).

- **T-065 done** (2026-08-05): root `package.json` gained `format:check`
  / `lint` / `typecheck` scripts; the `format`/`lint`/`typecheck`/`test`
  gate entries now invoke `npm run <script>`. No tool binary is named in
  both files. See `.agents/journal/20260805-t065-npm-script-gates.md`.
- **T-066 done** (2026-08-05): `vitest.config.ts` enforces coverage
  thresholds at the measured baseline (75.6/65.21/75.6/76.72); the
  unbound optional `coverage` gate entry is removed from
  `agentic.config.json` (STRENGTHENING — it had no command and always
  reported SKIP; thresholds now fail `npm test` live, proven by a +1
  threshold bump exiting 1, then reverted). Gates `--tier all` PASS;
  only `SKIP e2e` remains. See
  `.agents/journal/20260805-t066-vitest-coverage-thresholds.md`.
- **T-067 next**: split `.github/workflows/ci.yml` into product +
  governance jobs. Key decisions: governance job always runs and no-ops
  its harness steps on forks (an `if:`-skipped job reports "skipped" and
  never satisfies a required check); product job keeps the name
  `gates-fast` (no ruleset recompile); `push` triggers gain `dev`;
  governance acquires the harness in exactly one named step. True fork-PR
  behavior is not locally observable — T-067 proves harness-independence
  via a `.agentic/` stash run; a real fork PR going green is a post-merge
  check on the first external PR.
- Driver: going public + extracting the harness to a private scoped npm
  package. Today 100% of CI signal runs through `./scripts/agentic gates`
  after `./scripts/bootstrap.sh`, so a fork PR would get no signal at all
  once the harness needs auth to install.

**v1 close-out is COMPLETE on `claude/session-k75rxy`; publish is
owner-gated.** PR #9 (FOCUS v1 batch + close-out + usage guide) was merged
2026-08-04. T-050..T-064 all landed: CI fix, the full 19-MINOR review
backlog from `docs/final-status-review.md`, the six-page guide under
`docs/guide/`, and `.mcp.json` local wiring. Evals: focus Runs 1+2 10/10,
combined two-server scenario PASS (`docs/eval-results.md`).

## Next steps

1. **T-067** via `/next-task` in a fresh context (one task per
   session). Prerequisite for going public.
2. Owner: `npm publish` BOTH packages — `packages/finops-focus-mcp/` and
   root `finops-framework-mcp`; MCP-registry submit both `server.json`
   manifests.
3. Owner: enable GitHub Pages (serve `docs/` from the default branch so
   `docs/guide/index.html` is the public usage guide) — repo setting, not
   agent-reachable.
4. Owner: `wrangler deploy` (set `ALLOWED_ORIGINS`), `wrangler pages
   deploy demo/`; smoke-test the demo against the deployed Worker (CORS
   fix is handler-level verified, not yet wrangler-deployed).
5. Harness extraction to `@aaronsoto/agentic-harness` (private scoped npm,
   name available) is the follow-on project, not yet specced. The vendored
   `.agentic/harness/` here has drifted from agentic-starter-repo
   (`approvals.ts` −307 lines, `tasks.ts` −57, `gates.ts` −27; template
   copy is ahead and publish-configured). Reconcile deliberately during
   migration; do not blind-sync before the CI split lands.

## Open questions

- npm publish of the root framework package: 1.0.x now vs after PR merge —
  owner call (registry manifests are ready either way).
- Trademark posture recorded in `decisions.md` (finops-focus-mcp,
  accepted-risk): revisit only if the FinOps Foundation objects.
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
- Template feedback queued for agentic-starter-repo: `gates --tier full`
  runs only full-tier gates (use `--tier all` before shipping);
  supervising sessions must not commit a live loop's in-flight tasks.json;
  background watchers must not `pgrep` for a pattern contained in their
  own command line (self-match false positive); `design check` should
  accept an allowlist of HTML dirs (it warns on all six guide pages).

## Last updated

2026-08-05 — T-066 session (vitest coverage thresholds enforced, unbound
coverage gate removed; T-067 next).
