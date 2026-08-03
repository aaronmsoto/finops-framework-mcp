# T-051: tool description fixes — 2026-08-02T07:00:00Z

- Did: fixed the three tool-description issues from the final pre-launch
  review (`docs/final-status-review.md` TN-1/2/3):
  - `list_capabilities` (`src/servers/framework/tools.ts`): replaced the
    "domain slug or persona slug" prose (which invited callers to guess a
    non-existent `domain_slug` param) with the exact param names `domain`
    and `persona`, plus example values. The "22 capabilities" count is now
    `artifact.capabilities.length` interpolated at registration time
    instead of a string literal.
  - `assess_maturity_path` (same file): added `.describe()` to all three
    params (`capability`, `current_level`, `target_level`) and a
    cross-reference to `get_maturity_assessment` for callers who want one
    level (or all three) rather than a gap.
  - The four hardcoded corpus counts named in TN-3 are now interpolated
    from the loaded artifact/store instead of string literals: framework
    `get_kpis` ("44"/"88", from `artifact.kpis` — 44 = count with a
    `formula` field, matching what the description already claimed),
    focus `list_columns` ("43 in 1.0, 57 in 1.2", built from
    `store.versions.get(v).columns.length` per version slug — same
    pattern `list_versions`/`DEFAULT_VERSION` already used elsewhere in
    that file), and focus `compare_versions` ("14 added, 0 removed, 43
    changed", from `store.diff.added_columns/removed_columns/changed_columns.length`).
  - Ran `prettier --write` on both touched files to satisfy the format
    gate (multi-line template literals needed re-wrapping).

- Result: `./scripts/agentic gates` — PASS (format, lint, typecheck, test
  379/379, designs, integrity, memory all green; only the pre-existing
  integrity WARN about the diff-vs-origin/main mix, unrelated to this
  change). Live-verified against the built `dist/` with an in-memory MCP
  client (`InMemoryTransport`, `@modelcontextprotocol/sdk`):
  - `list-tools` shows the new `list_capabilities`/`assess_maturity_path`/
    `get_kpis` descriptions, and the focus server's `list_columns`/
    `compare_versions` descriptions.
  - Interpolated counts match the previously-hardcoded literals exactly:
    get_kpis "44"/"88", list_columns "43 in 1.0, 57 in 1.2",
    compare_versions "14 added, 0 removed, 43 changed" — confirming the
    fix doesn't just move the bug, the artifact really does contain those
    counts today.
  - `list_capabilities({domain: "understand-usage-and-cost"})` returns 4
    capabilities (Allocation, Anomaly Management, ...) with prose matching
    the new description.

- Next: T-052..T-059 are queued next in the backlog (see
  `docs/final-status-review.md`'s MINOR list and `activeContext.md`).
