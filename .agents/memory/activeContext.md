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

**v1 close-out is COMPLETE on `claude/session-k75rxy`; publish is
owner-gated.** State as of 2026-08-02:

- FOCUS build batch T-027..T-038 (12/12) + critique gate 4
  (`docs/critique-4-focus-gate.md`, SHIP-after-fixes, 2 BLOCKER / 8 MAJOR /
  5 MINOR, 0 refuted) + fix batch T-039..T-047 (9/9, loop run
  `.agents/journal/20260730-loop-build-134141.md`) all landed. Every fix
  hand-verified live this session (probe notes in `docs/eval-results.md`
  Focus Run 2).
- **T-048**: FOCUS package renamed `focus-spec-mcp` → **`finops-focus-mcp`**
  (owner decision in `decisions.md`; resolves gate-4 C4-community-3). Dir is
  `packages/finops-focus-mcp/`, bin prints
  `finops-focus-mcp v1.0.0 (FOCUS spec versions: 1.0, 1.2; latest 1.2)`,
  tarball 241KB, temp-install verified. Historical docs/journals keep the
  old name on purpose.
- **Evals**: focus Run 1 10/10 (pre-fix), Run 2 10/10 (post-fix, post-rename,
  regenerated artifact), combined two-server scenario PASS —
  `docs/eval-results.md`.
- **Final pre-launch review** (`docs/final-status-review.md`, five lenses +
  adversarial verification): **GO-after-listed-fixes**, grades A-/A-/A-/B+/B-,
  zero BLOCKERs. Its two MAJORs (root README omitted the shipped FOCUS
  server/Worker/demo; root NOTICE.md lacked CC BY scope for `data/focus/**`)
  were fixed as **T-049** — landed, gates green. Its 19 MINORs are the
  post-launch backlog (list in the review doc; includes MEMORY.md refresh,
  derive-pipeline integration test, worker index/data tests, demo in the
  format gate [protected-path — owner task], SECURITY/CONTRIBUTING files,
  npm author/homepage/bugs fields, text-pagination parity, Worker
  GET/DELETE 405).
- All commits re-authored (committer noreply@anthropic.com) and pushed.
  Task-evidence commit SHAs recorded before the 2026-08-02 rebase point at
  pre-rebase objects (provenance display only; nothing resolves them).

## Next steps

1. Owner: review PR #9 (whole FOCUS v1 batch + close-out) and merge.
2. Owner: `npm publish` from `packages/finops-focus-mcp/` and (if desired)
   the root `finops-framework-mcp` package; MCP-registry submit both
   `server.json` manifests.
3. Owner: `wrangler deploy` (set `ALLOWED_ORIGINS`), `wrangler pages deploy
demo/`; smoke-test the demo against the deployed Worker (the CORS fix is
   handler-level verified, not yet wrangler-deployed).
4. Next agent session: work the 19-MINOR backlog from
   `docs/final-status-review.md` — start with the MEMORY.md rewrite
   (update-memory skill) and the `combined-scenario.xml` step-4 expectation
   fix (T-045 made the server correct; that eval prose is now stale).

## Open questions

- npm publish of the root framework package: 1.0.x now vs after PR merge —
  owner call (registry manifests are ready either way).
- Trademark posture recorded in `decisions.md` (finops-focus-mcp,
  accepted-risk): revisit only if the FinOps Foundation objects.
- `agentic.config.json` format-gate scope excludes `demo/` (review MINOR):
  protected path — needs an explicit owner-approved task.
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
  NEW — background watchers must not `pgrep` for a pattern contained in
  their own command line (self-match false positive, this session).

## Last updated

2026-08-02 — close-out session (gate-4 fix verification, T-048 rename,
T-049 doc MAJORs, final status review GO-after-listed-fixes, focus eval
Run 2 10/10).
