## T-086 — fix the release runbook's mcp-publisher step — 2026-08-15T00:00:00Z

- did: Owner asked me to run the MCP-registry submission and to fix the
  runbook. The registry step turned out to be blocked from an agent session;
  the runbook fix is what shipped, and investigating the blocker is what made
  it worth writing.
  - **Found a supply-chain trap in our own runbook.** It said
    `mcp-publisher publish` without ever naming an install source. The npm
    package literally named `mcp-publisher` (latest 0.4.2) is **not** the
    official tool: different author (`gottivartanian`), no repository field,
    and a Russian description about browser automation for auto-posting
    content. It declares `bin: {"mcp-publisher": "index.mjs"}`, so a global
    install would shadow the real binary. Anyone following our runbook and
    reaching for the obvious `npm i -g mcp-publisher` would have installed
    it. The runbook now carries an explicit blockquote warning plus three
    verifiable install routes.
  - **Verified an install route that works without GitHub access**, since
    `github.com` release downloads are 403 through this environment's proxy:
    `GOBIN=/tmp/mcpbin go install
    github.com/modelcontextprotocol/registry/cmd/publisher@latest` resolves
    through `proxy.golang.org` (which is in the proxy's noProxy list) at tag
    `v1.8.1`, **with checksum verification left on** — I did not set
    `GOSUMDB=off` or `GOPRIVATE`, which would have been the easy way through
    and exactly the wrong lesson to encode in a runbook that is now warning
    about supply-chain substitution.
  - Documented the real auth constraint (below) and the schema-version
    situation, and added a "do not tag before trusted publishing exists"
    warning to the subsequent-release section — `publish.yml` fires on tag
    push and 403s against a package with no trusted publisher, which is a
    trap the runbook described the two halves of without connecting them.
- result: `./scripts/agentic gates --tier all` **PASS**.
  - **The registry submission is blocked from here, and this was tested, not
    assumed.** `mcp-publisher login github` fails with `error requesting
    device code: ... {"message":"This GitHub API path is not available:
    sessions are bound to their configured repositories. Use
    repository-scoped endpoints (repos/{owner}/{repo}/...)"}`. The device-code
    endpoint is not repository-scoped, so no agent session behind this proxy
    can complete it. The other methods do not rescue it: `dns`/`http` need a
    domain plus a private key, `none` is test-only, and `github-oidc` only
    works inside GitHub Actions.
  - **Everything short of login does work here**, which is what makes the
    boundary worth recording precisely rather than as "registry publishing
    doesn't work": the CLI installs and runs, and `mcp-publisher validate`
    reports **`✅ server.json is valid`** for both the root and the FOCUS
    manifest. So the manifests are known-good; only the submission is human.
  - Registry itself confirmed healthy (`/v0/health` → `{"status":"ok"}`) and
    neither `io.github.aaronmsoto/finops-framework-mcp` nor
    `io.github.aaronmsoto/finops-focus-mcp` is listed yet. Other FinOps
    servers are (`io.costory/finops`, `io.github.chaandannn/finops-mcp`),
    which is a decent argument that the listing is worth doing.
- implementer notes: the validator also emits an advisory — both manifests
  declare the `2025-09-29` server schema while `2025-12-11` is current, and
  it suggests new servers migrate. Recorded in the runbook as deferred rather
  than acted on: it validates cleanly today, the changelog needed to do the
  migration properly lives on a GitHub path this session cannot reach, and
  re-submitting a manifest is already a normal per-release step so the cost
  of doing it later is nil. Worth a task when someone has the changelog open.
  - Noted in the runbook, not done: `mcp-publisher login github-oidc` is
    built for GitHub Actions and would let `publish.yml` submit both
    manifests automatically on every release, removing this manual step for
    good. That edits a protected path, so it needs owner sign-off as its own
    task rather than being smuggled into a docs fix.
- next: owner runs the two `mcp-publisher publish` commands from a normal
  machine per the corrected runbook. Still outstanding: the npm
  trusted-publisher config on both packages, and no `v0.1.0` tag until it
  exists.
