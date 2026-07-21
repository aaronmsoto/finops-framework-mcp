## 2026-07-13 — design pipeline session

- did: built the feature-definition pipeline per owner request — roadmap.md
  (intent tier), docs/designs/ (rich self-contained HTML design docs:
  TEMPLATE.html house style + design-pipeline.html seed documenting itself),
  `design new|check|publish` and `serve` harness commands, the `designs`
  privacy gate (fails external resources/network calls, dead links, malformed
  HTML), the design-feature skill with owner checkpoint, and the two-tier
  format rule (markdown = machine contracts, HTML = design docs) written into
  the architecture contract, AGENTS.md, and memory.
- result: 128/128 harness tests; all 7 gates green (`gates --tier all`);
  scaffold → check → serve verified end-to-end in a scratch copy; gate
  verified to FAIL on an injected external script reference. No public
  rendering surface exists: serve binds 127.0.0.1, publish is an opt-in
  owner-configured hook.
- next: owner review; first real feature can now flow roadmap → design →
  spec → tasks → loop.
