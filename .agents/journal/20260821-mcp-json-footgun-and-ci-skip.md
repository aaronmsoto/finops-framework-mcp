## Fix the .mcp.json build footgun and the silent CI test skip — 2026-08-21T00:00:00Z

**Untracked work — the harness CLI is unavailable this session.** `npm ci
--prefix .agentic` fails with `401 Unauthorized` against
`npm.pkg.github.com`; the harness needs a `read:packages` token in
`NPM_TOKEN` and this session has none (the session `GITHUB_TOKEN` was tried
and is also rejected). So no `tasks add/start/complete`, no hash-chain
extension, and no `./scripts/agentic gates`. `.agents/tasks.json` was **not**
hand-edited — the chain is intact, this change simply carries no task ID.
Gates were run as the individual npm commands instead, which is the fallback
AGENTS.md documents for contributors without the harness. Someone with a
GitHub Packages token should retro-file this as a task.

- did: Investigated an external report claiming both servers "may not have
  actual tool endpoints implemented yet" and "need backend integration to
  register their tools/resources with the Claude Code session MCP discovery
  system". **Both conclusions are wrong** — there is no mechanism by which an
  MCP server registers itself with a client; discovery is entirely
  client-side. But auditing rather than dismissing the report turned up two
  genuine defects that plausibly produced the experience behind it.
  - **`.mcp.json` was a footgun.** It spawned `node dist/servers/*/main.js`
    with relative paths into a **gitignored** `dist/`. Any MCP client opening
    this repo before a build gets an instantly-failing command, zero
    registered tools, and no useful diagnostic — indistinguishable from
    "these servers don't work". Now runs the published packages via `npx`;
    the working-tree form moved to `.mcp.json.example`. Rationale and the
    contributor trade-off in decisions.md 2026-08-21.
    - Also reconciled the naming: the file said `finops-focus` while every
      doc says `focus-spec`.
  - **The tests that guard against a broken bin never ran in CI.**
    `src/servers/{framework,focus}/main.test.ts` execute the built bin
    through a `.bin`-style symlink — the regression guard for the
    shipped-broken-bin incident in `docs/critique-3-publish-gate.md` — gated
    on `describe.skipIf(!existsSync(DIST_MAIN))`. CI's fast tier runs
    `npm test` without a build; the full tier builds without testing. So the
    guard was skipped in every CI run. Added
    `scripts/vitest-global-setup.mjs` as a vitest `globalSetup` that builds
    when `dist/` is missing.
  - `CONTRIBUTING.md`'s `.mcp.json` snippet was **not the real file's shape**
    — it dropped the `mcpServers` wrapper and collapsed `{command, args}`
    into a string, so copying it produced an invalid config. Rewritten
    against the actual file, plus the `.mcp.json.example` swap, the reason
    the unbuilt failure mode is confusing, and `claude mcp list` / `/mcp` as
    the way to see what a client actually registered.
- result: **the CI-skip fix is measured, not asserted.** On a dist-free tree,
  running just the two affected files:
  - before: `Tests  8 passed | 2 skipped (10)`
  - after:  `Tests  10 passed (10)`
  Full suite `414 passed (414)`, 39 files. `format:check`, `lint`,
  `typecheck`, `build` all clean.
  - **Footgun reproduced and fixed end to end in a fresh `git clone`** with
    no `dist/` and no `node_modules/`: the committed command gave
    `node:internal/modules/cjs/loader ... throw err` (Cannot find module);
    after copying the new `.mcp.json` in, `npx -y finops-framework-mcp
    --version` → `finops-framework-mcp v0.1.0 (data v2.1.1)` and the focus
    server likewise.
- implementer notes / honesty: one test, `src/packaging.test.ts`'s shim
  install, failed on an early run with `notarget No matching version found
  for ajv@^8.20.0`. I checked whether I caused it by stashing everything and
  re-running on the unmodified tree — **it failed identically**, so it is a
  cold npm packument cache in this container interacting with the test's
  `--prefer-offline` install, which the test's own comment anticipates. It
  passed once the cache warmed through unrelated npx runs. Not a regression,
  not mine, and not fixed here.
  - The audit also cleared a long list of things nobody should re-investigate:
    no stdout pollution reachable from either entry point (`--version` prints
    then returns before any transport exists), the ready banner is
    `console.error` after `connect()`, both published tarballs carry
    `#!/usr/bin/env node`, and `isDirectRunOf` already compares
    `realpathSync` on both sides so npm/npx `.bin` symlinks resolve
    correctly.
- next: T-B (rate-limit the Worker, then publish it as a real endpoint) and
  T-C (verification/troubleshooting docs, the stdio prerequisite, scope, and
  a client-independent smoke test) from the approved plan. Both were sized
  assuming the harness is available for task tracking.
