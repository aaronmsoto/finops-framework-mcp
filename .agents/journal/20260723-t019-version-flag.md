## T-019 — Add --version flag to the finops-framework-mcp bin — 2026-07-23T00:00:00Z

- task: T-019 — Add --version flag to the finops-framework-mcp bin

### What I did

- `src/servers/framework/main.ts`: refactored the previously-unconditional
  top-level `main().catch(...)` side effect into an exported
  `runCli(cliArgs: string[])` function, guarded behind
  `isDirectRun = process.argv[1]?.endsWith("main.js")` — the same pattern
  `src/crawlers/framework/cli.ts` already uses, so importing this module in
  a test no longer starts a stdio server as a side effect.
- Added a `--version` check inside `runCli`: reads `package.json`'s
  `version` via `readFileSync` (path resolved relative to the module with
  `new URL(...)`, same trick already used for `defaultDir`), loads the data
  artifact for `manifest.data_version`, prints
  `finops-framework-mcp v<pkg> (data v<data_version>)` via `console.log`,
  and returns before touching `createServer`/`StdioServerTransport`.
- The existing positional-artifact-dir filter
  (`cliArgs.find((a) => !a.startsWith("--"))`) already excludes any
  `--`-prefixed flag, so `--version` is filtered the same way
  `--experimental` already was — no separate change needed for that
  acceptance criterion.

### Result

- New `src/servers/framework/main.test.ts` (2 cases): mocks
  `./server.js`'s `createServer` and asserts it's never called when
  `--version` is passed, and that the printed line matches
  `finops-framework-mcp vX.Y.Z (data vX.Y.Z)`; second case passes
  `--version` together with `--experimental` and asserts it still resolves
  (would throw trying to `loadArtifact("--version")` if the positional
  filter didn't exclude it).
- Bug caught by running the test file standalone before trusting it: my
  first draft called `logSpy.mockRestore()` in a `finally` block ahead of
  asserting on `logSpy.mock.calls` — `mockRestore()` clears call history
  (same as `mockReset`) as well as restoring the original implementation,
  so the assertion always saw zero calls regardless of whether `runCli` had
  logged anything. Fixed by asserting before restoring.
- Verified beyond gates: `npm run build && node dist/servers/framework/
  main.js --version` printed `finops-framework-mcp v1.0.0 (data v2.1.1)`
  and exited 0 with no "ready on stdio" line — server never started. Same
  result running `--experimental --version` together (flag order doesn't
  matter).
- `./scripts/agentic gates`: PASS (format=pass, lint=pass, typecheck=pass,
  test=pass — 188/188, up from 186 for the 2 new cases — coverage=skipped,
  designs=pass, integrity=pass, memory=pass).

### Next

- No blockers. Remaining v1.1 candidates (Cloudflare Workers remote
  endpoint, Action rename decision) still pending — see
  activeContext.md.
