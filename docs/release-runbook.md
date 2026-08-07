# Release runbook

How the two npm packages (`finops-framework-mcp`, root; `finops-focus-mcp`,
`packages/finops-focus-mcp/`) and their MCP-registry manifests are published.
Publishing is an owner approval point (`approvals.yaml`) — agents prepare
releases; a human runs them.

## One-time bootstrap (first publish of each package)

npm trusted publishing can only be configured on a package that already
exists, so the very first publish of each package is manual:

1. From a clean checkout with gates green (`./scripts/agentic gates --tier full`):

   ```bash
   npm ci && npm run build && npm test
   npm publish --access public          # root: finops-framework-mcp
   cd packages/finops-focus-mcp
   npm publish --access public          # finops-focus-mcp (prepack stages dist+data)
   ```

   Use an npm account with 2FA enabled. `--provenance` is unavailable for
   local publishes — provenance starts with the first CI publish.

2. On npmjs.com, for **each** package (settings are per-package):
   Package → Settings → Trusted publisher → GitHub Actions →
   repository `aaronmsoto/finops-framework-mcp`, workflow `publish.yml`.
   Explicitly tick the allowed action (`npm publish`) — configurations
   created after May 2026 require selecting at least one allowed action or
   publishes 403.

3. Submit both MCP-registry manifests (after the npm packages are live —
   registry ownership validation reads `mcpName` from the published
   tarball's package.json):

   ```bash
   mcp-publisher publish            # root server.json
   cd packages/finops-focus-mcp && mcp-publisher publish
   ```

## Every subsequent release

1. Bump the version in **three places per package** (a sync test fails the
   gate if package.json and server.ts drift, and `server.json` is validated
   in CI only by review — keep them together):
   - root: `package.json`, `server.json` (`version` + `packages[0].version`),
     `src/servers/framework/server.ts` `SERVER_VERSION`
   - focus: `packages/finops-focus-mcp/package.json`, its `server.json`
     (same two fields), `src/servers/focus/server.ts` `SERVER_VERSION`
2. Gates green, PR merged to `main` per the normal approval flow.
3. Tag and push: `git tag v<version> && git push origin v<version>`.
   `.github/workflows/publish.yml` builds, tests, and publishes both
   packages via OIDC (no token, provenance automatic).
4. Re-submit the updated `server.json` manifests with `mcp-publisher publish`
   (the registry requires manifest versions to match the published packages).

## Notes

- Both packages currently release in lockstep from one tag. If their
  versions ever diverge, split the workflow's publish steps behind
  tag-name filters.
- `packages/finops-focus-mcp` has no source of its own: its `prepack`
  (`scripts/pack-focus.mjs`) stages `dist/servers/focus`, `dist/shared`,
  and `data/focus` from the repo root, rebuilding when `dist/` is missing
  or older than `src/`.
- Never publish a `.tgz` lying around in the package directory — always
  publish from the directory so `prepack` restages fresh output.
