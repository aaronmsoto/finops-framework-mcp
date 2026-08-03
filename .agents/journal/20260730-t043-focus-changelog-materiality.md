# T-043 — Expose CHANGELOG + materiality caveat; official:false on diff (gate4 C2-fidelity-4+5)

## What I did

Two independent gate-4 findings sharing one fix locus (`compare_versions`
+ the diff artifact), plus a new resource:

1. **C2-fidelity-4** (MAJOR — "43 changed" conflates formatting
   normalization with material change). The upstream FOCUS CHANGELOG has
   been ingested and bundled since T-029 (`data/focus/{version}/
   CHANGELOG.md`, loaded into `FocusVersionArtifact.changelog_md`) but was
   never exposed by any tool or resource. Added:
   - `src/servers/focus/uris.ts`: `URI.changelog(version)` /
     `TEMPLATES.changelog`, mirroring the existing glossary URI shape.
   - `src/servers/focus/render.ts`: `changelogMd(artifact)` — the verbatim
     `changelog_md` plus the same `footer()` every other content-bearing
     surface uses (CC BY 4.0 attribution + license + crawl provenance),
     source-citing whichever URL in `manifest.source_urls` ends in
     `CHANGELOG.md` (that's the raw-GitHub CHANGELOG fetch URL recorded by
     the ingest step; falls back to the first source_url, then a static
     GitHub URL, if for some reason no CHANGELOG URL is present).
   - `src/servers/focus/resources.ts`: registers `focus://spec/{version}/
     changelog` as a `ResourceTemplate`, list/complete mirroring the
     glossary resource.
   - `compare_versions`'s shared `note` banner (used by all five response
     branches — full diff, added/removed/changed/unchanged single-column)
     now reads: "...Per the upstream CHANGELOG, most changes are not
     material unless specifically called out — read
     focus://spec/{to}/changelog and each entry's source_url(s) below to
     judge materiality before treating a "changed" status as semantic."
     Chose to put this in the shared banner (all branches) rather than
     only the no-`column` summary, since the same "changed ≠ necessarily
     material" caveat applies to a single-column `changed` lookup too, and
     it's one string change vs. five.

2. **C2-fidelity-5** (MINOR — NOTICE.md claims all derived records carry
   `official: false`; true for `kpi-mapping.json`, false for
   `diff-1.0-1.2.json`). Added `official: false` to the `FocusDiff` type
   (`src/shared/focus/types.ts`) and to `diffColumns`'s return
   (`src/crawlers/focus/diff.ts`). `compare_versions`'s `outputSchema`
   gains `official: z.literal(false)`, and all five response branches'
   structuredContent now include it alongside `from`/`to`.

## Regeneration

- `npm run build` (tsc emits despite an expected transient type error on
  the pre-existing generated worker bundle — see below; exit code
  non-zero doesn't block emit since `noEmitOnError` isn't set).
- `node dist/crawlers/focus/cli.js` (cache-only, confirmed "0 network" in
  its own log line) to re-derive `data/focus/derived/diff-1.0-1.2.json`
  with the new field. `git diff --stat data/focus` shows only
  `derived/diff-1.0-1.2.json` and `index.json` (the diff's sha256)
  changed — column/attribute/manifest content is byte-identical, as
  expected (no parser or ingestion logic touched).
- `node scripts/bundle-worker-data.mjs` to regenerate
  `src/workers/generated/focus-store.ts` (the diff's `official: false` is
  now present at line ~4692 of that file) — this is what cleared the
  transient tsc error (the generated file was stale against the now-wider
  `FocusDiff` type until regenerated).
- `npm run build` again: clean, exit 0.

## Tests

- `src/crawlers/focus/diff.test.ts`: added `expect(diff.official).toBe(false)`.
- `src/crawlers/focus/emit.test.ts`: fixture `FocusDiff` literal gains
  `official: false` (was a type error otherwise).
- `src/servers/focus/server.test.ts`:
  - resource-listing test now also asserts `focus://spec/1.2/changelog`
    and `focus://spec/1.0/changelog` are listed.
  - new test: reading `focus://spec/1.2/changelog` returns text starting
    with the real upstream CHANGELOG heading, containing the exact
    upstream materiality sentence, and containing "CC BY 4.0".
  - new test: `compare_versions` (no column) banner text matches the
    materiality sentence and contains `focus://spec/1.2/changelog`.
  - `official: false` assertions added to the existing full-diff test and
    the existing BilledCost "changed" test.

## Gates

`./scripts/agentic gates --tier all` → PASS (format/lint/typecheck/test
370 passed, up from 367/coverage-skipped/designs/integrity/memory/build
all pass). Integrity gate's one warning (mixing implementation with
tests/policy in one diff) is the same pre-existing informational warning
seen on every task in this batch (T-039..T-042), not new.

## Live probes

Scratch MCP client script (written to the repo root, deleted after use —
not committed) driving the built `dist/servers/focus/main.js` over stdio:

- `readResource("focus://spec/1.2/changelog")` → text starts with
  `# FinOps Open Cost and Usage Specification Changelog`; contains the
  exact upstream sentence "the vast majority of such changes are not
  material unless specifically called out"; ends with the CC BY 4.0
  footer citing
  `https://raw.githubusercontent.com/.../v1.2/CHANGELOG.md`.
- `compare_versions({})` (via `evals/framework/mcp-call.mjs --server=focus`)
  → text: "...Per the upstream CHANGELOG, most changes are not material
  unless specifically called out — read focus://spec/1.2/changelog and
  each entry's source_url(s) below to judge materiality..."; `structured
  Content.official` is `false` alongside `from`/`to`/`added_columns`/etc.
- `compare_versions({column: "BilledCost"})` → same banner text;
  `structuredContent.official: false` alongside `status: "changed"`.
- Confirmed `data/focus/derived/diff-1.0-1.2.json` now parses with
  `official === false` — the exact sentence in
  `packages/focus-spec-mcp/NOTICE.md` ("All derived content is marked
  `official: false` in its records") is no longer false for this file.

## What should happen next

T-044..T-047 remain in the gate-4 fix batch (README "official" phrasing,
calculate_kpi 0/0 guard + KPI mapping version differentiation,
cross-version unknown-column hints, package trademark naming owner
decision). Not started this session.
