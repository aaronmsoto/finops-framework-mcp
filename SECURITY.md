# Security Policy

## Supported versions

This repository ships two npm packages, `finops-framework-mcp` and
`finops-focus-mcp`. Only the latest published version of each is supported.
Both read official, publicly available FinOps Foundation content and expose
it read-only over MCP (stdio, or the Cloudflare Worker in
`src/workers/index.ts`) — there is no auth layer and no user data is
persisted, but the usual risks (dependency vulnerabilities, malformed input
handling, prompt-injection-style content in crawled/served data) still apply.

## Reporting a vulnerability

Please report suspected vulnerabilities privately using [GitHub Security
Advisories](https://github.com/aaronmsoto/finops-framework-mcp/security/advisories/new)
for this repository rather than opening a public issue. Include:

- The affected package (`finops-framework-mcp` or `finops-focus-mcp`) and
  version.
- Steps to reproduce, or a minimal example.
- The impact you'd expect (what an attacker could do with it).

Do not include exploit details in a public issue or pull request.

We aim to acknowledge reports within a few days. There is no bug bounty
program.
