## T-028: generic artifact-loading seam + multi-server eval bridge — 2026-07-28T00:00:00Z

- Did:
  - Added `src/shared/artifact-loader.ts`: `ArtifactValidationError` (moved
    from `artifact.ts`, remediation text now a required 3rd constructor
    arg instead of hardcoded), `sha256`, and
    `loadArtifactGeneric<T>(dir, {files, assemble, crossValidate,
    remediation})` — schema-validates every file in `files` (ajv 2020),
    checks the `manifest.json` sha256 map against files on disk, calls the
    caller's `assemble` to build the typed artifact, then the optional
    `crossValidate` hook for referential checks. Own synthetic-spec test
    (`artifact-loader.test.ts`, 6 cases): a fake widgets/groups artifact
    (not framework-shaped) covering success, schema violation (with the
    caller's own remediation string surfacing verbatim), hash mismatch,
    missing file, a custom crossValidate rejecting a dangling reference,
    and a nested artifact directory.
  - Rewrote `src/shared/artifact.ts`: `loadArtifact(dir)` is now a thin
    wrapper — `loadArtifactGeneric(dir, { files: ARTIFACT_FILES,
    remediation: <original string, unchanged>, crossValidate, assemble })`.
    `ArtifactValidationError` and `sha256` are re-exported from the same
    path (`./artifact.js`) so `emit.ts`'s `import { sha256 } from
    "../../shared/artifact.js"` and `artifact.test.ts`'s import both work
    unmodified. Signature and every error message are byte-identical to
    before (remediation string is passed through unchanged, concatenated
    the same way).
  - `src/shared/index.ts`: added a named re-export of `loadArtifactGeneric`
    (+ its option types) from the new module — used `export {..}`/`export
    type {..}` rather than `export *` to avoid an ambiguous-export clash
    with `ArtifactValidationError`/`sha256` already re-exported via
    `artifact.js`.
  - `evals/framework/mcp-call.mjs`: added `--server=<name>` flag /
    `MCP_EVAL_SERVER` env var selecting `dist/servers/<name>/main.js`,
    defaulting to `framework` (unchanged default path and behavior).
- Result: `./scripts/agentic gates` all green (format/lint/typecheck/
  test/designs/integrity/memory); 203/203 tests pass (197 before + 6 new
  in `artifact-loader.test.ts`). `git diff --stat` confirms
  `src/servers/framework/main.ts`, `src/crawlers/framework/emit.ts`, and
  `src/shared/artifact.test.ts` are untouched. Behavior: rebuilt `dist/`
  and ran `node dist/servers/framework/main.js --version` → `finops-
  framework-mcp v1.0.0 (data v2.1.1)` (proves `loadArtifact` still boots
  the real committed artifact through the new seam). Ran `node
  evals/framework/mcp-call.mjs list-tools` before (via `git stash`) and
  after this change and diffed the two JSON outputs — byte-identical.
  Ran `mcp-call.mjs --server=doesnotexist list-tools` and
  `MCP_EVAL_SERVER=doesnotexist node mcp-call.mjs list-tools` — both
  correctly attempt to spawn `dist/servers/doesnotexist/main.js` and fail
  with `MCP error -32000: Connection closed`, confirming the
  flag/env-var selection path is exercised (no `doesnotexist` server
  exists yet, so a spawn failure is the expected/correct outcome here).
- Next: T-029 (FOCUS ingestion pipeline) can now call `loadArtifactGeneric`
  directly from `src/shared/index.js` for `data/focus/<version>/`, per
  `.agents/specs/focus-mcp-v1.md`'s version-model section. The eval bridge
  is ready for a future `evals/focus/` suite via `--server=focus` /
  `MCP_EVAL_SERVER=focus` once `dist/servers/focus/main.js` exists.
