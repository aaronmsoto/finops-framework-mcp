## T-087 — automate the MCP-registry submission in publish.yml — 2026-08-15T00:00:00Z

- did: Owner asked for the OIDC workflow after T-086 established that the
  manual registry step cannot run from an agent session. **Protected-path
  edit (`.github/workflows/publish.yml`), explicitly AUTHORIZED by the owner
  in-session** — the exemption AGENTS.md's hard rule allows, same shape as
  T-059 and T-066. The PreToolUse hook's own documented override marker
  (`.agents/.cache/policy-edit-ok`) was placed for the edit and removed
  straight after; verified gone. No standing bypass left behind.
  - Added a `registry` job to `publish.yml`: checkout → `setup-go` → pinned
    `go install .../cmd/publisher@v1.8.1` → `publisher login github-oidc` →
    validate both manifests → submit both.
  - Design rationale is in decisions.md 2026-08-15. The load-bearing choice:
    it is a **separate job with `needs: publish`**, not extra steps on the
    npm job. npm publish is irreversible — as a trailing step, a registry
    failure would redden a workflow whose packages published fine, and
    re-running it would retry the npm publish. Isolated, the npm result stays
    green and only the registry job re-runs.
  - Both manifests are validated before **either** is submitted, so a
    malformed file cannot leave one server listed at the new version and the
    other stranded at the old one.
  - Runbook updated on both ends: bootstrap step 3 now says the manual route
    is bootstrap-only, and subsequent-release step 4 changed from "run these
    commands" to "nothing to do, here is how to re-run the job if it fails".
- result: fast-tier gates **PASS** (format, lint, typecheck, test — 414
  passed, designs, integrity, memory) plus `npm run build` clean, which is
  the only gate the full tier adds. Notably `integrity: ok vs origin/dev`
  even with the protected path touched.
  - **Verified as far as a tag-triggered workflow can be without a tag**,
    and said plainly rather than implied: YAML structure parsed and inspected
    by hand; the pinned version confirmed to build from the Go module proxy
    with checksums on; `publisher validate server.json` and `publisher
    validate packages/finops-focus-mcp/server.json` both return `✅ server.json
    is valid` using the **exact argument form the job uses** (an earlier
    "not found" was my own cwd mistake, not a tool limitation).
  - **That verification earned its keep.** The job originally pinned
    `actions/setup-go` to `1.25`; registry v1.8.1's `go.mod` declares
    `go 1.26`, so the install step would have failed — at release time, on a
    tag, after npm had already published irreversibly. Caught by actually
    running the pinned install rather than assuming the version I had
    installed via `@latest` was representative. `go-version` is now `1.26`
    with a comment tying it to the publisher pin so the two get bumped
    together.
- implementer notes / honest limitation: **this workflow is unverifiable
  until the first real tag push.** It triggers only on `tags: v*`. I did not
  add `workflow_dispatch` to make it manually testable, because that would
  also expose the npm publish job to manual triggering, which is a worse
  failure mode than an untested registry job. The first release should be
  watched rather than fired and forgotten.
  - The OIDC identity is the repository; the registry validates the
    `io.github.<owner>/*` namespace against it. Our names are
    `io.github.aaronmsoto/*` and the repo owner is `aaronmsoto`, so they
    match — but that is reasoning from the naming convention, not something
    I could execute here.
- next: owner does the one-time manual submission to claim both listings
  (bootstrap step 3), configures npm trusted publishers, and only then tags
  `v0.1.0`. From that tag onward the registry step is automatic.
