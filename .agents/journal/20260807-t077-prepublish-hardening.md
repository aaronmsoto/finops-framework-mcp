# 2026-08-07 — T-077: pre-publish hardening from the 3-expert review panel

**Task:** T-077 — implement the owner-approved findings of a three-reviewer
panel (MCP design, npm publishing, OSS readiness) ahead of open-sourcing the
repo and publishing both packages to npm.

**Owner directives folded in:** all versions 0.9.0 (explicitly not a v1);
server identity slugs = the npm package names; NO param renames
(`slug`/`capability`/`column` verified as distinct value domains — `slug`
is the fetched entity's own identifier, `capability` a filter; FOCUS
`column` is a Column ID); Contributor Covenant 2.1 with GitHub private
reporting (no personal email); dev-history docs stay public unedited.

## What landed (one commit each)

1. **fileURLToPath fix (panel BLOCKER B1).** Both bins resolved data dirs
   via `new URL(...).pathname`, which percent-encodes spaces and yields
   `/C:/...` on Windows — npx was broken for all Windows users and any
   space-containing install path (reviewer reproduced ENOENT with `%20`).
   Regression: `src/packaging.test.ts` scratch dirs now contain a space;
   the pack→install→exec test passed post-fix.
2. **server.json validity (BLOCKER B2).** Descriptions were 161/187 chars
   vs the registry schema's 100 max; both files now validate with ajv
   against the declared 2025-09-29 schema (94/97 chars), declare
   environmentVariables and websiteUrl, and reference 0.9.0.
3. **Identity/version.** Framework server was `finops-framework` while its
   bin is `finops-framework-mcp`; both servers now report package name +
   `title`. Versions 0.9.0 everywhere; `tests/version-sync.test.ts` pins
   server.ts ↔ package.json (SERVER_VERSION must stay a literal — Worker
   fs boundary, `fs-boundary.test.ts`).
4. **Instructions accuracy.** Framework counts interpolated from the
   artifact (matching `overviewMd`'s source); FOCUS "every tool takes a
   version param" corrected (list_versions/compare_versions don't) and the
   advertised default now interpolates DEFAULT_VERSION, guarded by
   `src/servers/focus/default-version.test.ts` against data drift;
   map_personas params gained descriptions; mcp-surface.md regenerated.
5. **npx -y sweep.** 24 install-path snippets across both READMEs and
   docs/guide/index.html; version-pinning note added.
6. **Trademark phrasing.** "official FinOps Framework" claims → unofficial
   in both package descriptions, README lede, guide lede, and the guide's
   "100% official content" absolute; root NOTICE.md gained the
   non-affiliation trademark sentence the focus NOTICE already had;
   framework instructions gained the non-endorsement line.
7. **Publish pipeline.** `publish.yml` (tag-push, OIDC trusted publishing,
   no token secret; workflows edit owner-authorized by the task);
   `pack-focus.mjs` staleness check (mtime, verified: touch src → rebuild,
   fresh dist → no rebuild); stale local 1.0.0 tgz deleted;
   `docs/release-runbook.md` records the manual-first-publish bootstrap,
   per-package trusted-publisher config, 3-places-per-package version bump,
   and mcp-publisher submission order (npm first — registry validates
   against the published tarball's mcpName).
8. **CONTRIBUTING split.** External contributors get the registry-free
   command path (identical to CI gates-fast — bootstrap.sh needs an
   NPM_TOKEN outsiders don't have); stale no-AI-attribution rule corrected
   to the `allow` policy; PR template harness items maintainer-only.
9. **Community files.** Contributor Covenant 2.1 (NOT the FinOps
   Foundation's CoC — theirs routes reports to conduct@finops.org and
   would imply affiliation); YAML issue forms with required
   package/version/client/transport fields replace the markdown template;
   config.yml disables blank issues, deflects content questions upstream.
10. **Memory hygiene.** activeContext.md rewritten (removed "repo stays
    private", owner token-provisioning notes, resolved decisions, broken
    numbering; template-feedback block moved to agentic-starter-repo's
    activeContext as its Next-steps items 9–14); MEMORY.md demo-format-gate
    and current-focus staleness fixed.

## Evidence

- Gates run before every commit: `gates: PASS (format, lint, typecheck,
  test, designs, integrity, memory)` each time; `--tier all` at the end
  (see task completion record).
- Space-path packaging test: 3/3 passed post-fix (was ENOENT repro before).
- ajv: both server.json VALID against the 2025-09-29 schema.
- pack-focus staleness: touched `src/servers/focus/tools.ts` → prepack
  rebuilt (dist mtime newer); immediate re-run → no rebuild.
- End-to-end npx simulation from a space-containing dir: both packed
  tarballs installed and answered `--version` with v0.9.0 and
  initialize/tools-list over stdio (11 framework / 9 focus tools).

## Deferred (recorded in activeContext open questions)

Panel nice-to-haves: README badges, `exports` for dist/index.js, markdown
text blocks for get_capability/get_kpis, `level` alias removal, glossary
tool, dist/shared/focus trim from root tarball.
