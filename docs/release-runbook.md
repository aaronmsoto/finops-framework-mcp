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
   tarball's package.json). This is a **listing**, not a release: it adds
   the servers to the directory MCP clients browse
   (`registry.modelcontextprotocol.io`). The packages are installable
   without it.

   > **Do not `npm install -g mcp-publisher`.** That npm name belongs to an
   > unrelated third-party package (different author, no source repository)
   > which claims the same `mcp-publisher` binary name and would shadow the
   > real tool. The official CLI is published only from the
   > `modelcontextprotocol/registry` repository.

   Install the real one — Homebrew (`brew install mcp-publisher`), a release
   binary from that repo, or from source via the Go module proxy, which
   verifies checksums and needs no GitHub access:

   ```bash
   GOBIN=/tmp/mcpbin go install github.com/modelcontextprotocol/registry/cmd/publisher@latest
   /tmp/mcpbin/publisher --help      # the binary is named `publisher`
   ```

   Then authenticate and publish, once per manifest:

   ```bash
   mcp-publisher login github        # opens a browser / device-code flow
   mcp-publisher validate            # optional; checks without submitting
   mcp-publisher publish             # root server.json
   cd packages/finops-focus-mcp && mcp-publisher publish
   ```

   **Run this from a normal machine, not an agent session.** `login github`
   needs GitHub's device-code endpoint, which proxied agent environments
   block (sessions there are scoped to specific repositories, so arbitrary
   `github.com` API paths are refused). The remaining auth methods —
   `login dns` / `login http` — need a domain you control plus a private
   key, and `login none` is test-only. Verified 2026-08-15: everything up to
   and including `mcp-publisher validate` runs fine in an agent session;
   only the login step is blocked.

   This manual step is **bootstrap-only**. From the first tag push onward
   `publish.yml`'s `registry` job does it automatically over OIDC (which
   sidesteps the device-code problem entirely, since Actions mints the token
   directly) — see step 4 of the next section.

   Schema note: both manifests declare the `2025-09-29` server schema and
   validate cleanly, but `2025-12-11` is current and the tool advises new
   servers to migrate. Migration is deferred, not forgotten — re-submitting
   a manifest is a normal per-release operation (see step 4 below), so this
   costs nothing to do later.

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
   packages via OIDC (no token, provenance automatic). **Do not tag until
   step 2 of the bootstrap is done for both packages** — the workflow fires
   on tag push and a package without a trusted publisher configured returns
   403.
4. **Nothing to do — the registry submission is automatic.** The same tag
   push runs `publish.yml`'s `registry` job, which authenticates with
   `publisher login github-oidc` and submits both manifests. It is a
   separate job that `needs: publish`, so npm publishing (irreversible)
   stays green and visible even if the registry step fails, and only that
   job is re-run. Because the registry requires manifest versions to match
   the published packages, step 1's version bump is what keeps this
   correct — the job just submits whatever is committed.

   If the `registry` job fails, re-run it from the Actions UI. If it keeps
   failing, the manual commands in bootstrap step 3 are still the fallback;
   nothing about them changed.

   The publisher version is **pinned** in the workflow
   (`...cmd/publisher@v1.8.1`) and `actions/setup-go` must stay at or above
   that release's minimum Go (v1.8.1 declares `go 1.26`). Bump both together
   and deliberately.

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
