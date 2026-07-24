## T-006: markdown compose layer — 2026-07-23T01:20:00Z

- Did: implemented spec §2 (`.agents/specs/v1-official-only.md`) in full.
  - New `src/crawlers/framework/markdown/frontmatter.ts`: plain `key: value`
    front-matter between `---` fences (no YAML dep). Sorted keys on emit;
    values are string | number | string-list (`[a, b]` comma-joined, parsed
    back via first-`": "`-split so colons inside values are safe). Round-trip
    unit tests in `frontmatter.test.ts` (10 tests): sorted-key emission,
    list/empty-list formatting, undefined-key omission, number preservation,
    round-trip of a full field set, malformed-line and unterminated-fence
    errors.
  - New `src/crawlers/framework/markdown/compose.ts`: deterministic
    serializers from `ParsedCapabilityPage` / section-parser records /
    `Persona` / `Kpi` to markdown. Capability doc section order and headings
    follow spec §2 exactly (Summary, Headline Groups, Definition, Maturity
    Assessment, Functional Activities, Measures of Success & KPIs incl.
    Examples nested Objective/KPI pairs, Inputs & Outputs, Featured KPIs with
    `{wp_id=N}` heading attribute and `[Title](url)` cross-links resolved via
    a `capabilityRefs` map). Absent section ⇒ absent heading throughout.
    `ComposeError` guard throws when a plain-text item/label starts with `-`
    or `#`, or contains a newline — verbatim already-markdown fields
    (definition_md, maturity_raw, inputs_outputs_md, description_md, formula)
    are exempt, inserted as-is.
  - Non-capability doc layouts (spec left these unspecified beyond "canonical
    headings"): personas/<slug>.md and kpis/<slug>.md get one H2 per field
    (`## Description`, `## Formula` as fenced code, `## Candidate Data
    Sources`, `## Related Capabilities`, `## Featured On` — all omitted when
    empty). The 6 section docs (principles/phases/domains/maturity-model/
    technology-categories/scopes) each hold every entry in one file, keyed
    by a `{slug=<slug>}` heading-attribute (same convention as capability
    Featured KPIs' `{wp_id=N}`) so a later derive step can recover identity
    without re-slugifying titles. Recorded as a decision (decisions.md) since
    T-007 (derive) needs to parse this back — flagging for that session.
  - `emit.ts`: `canonicalMarkdown()` writes string payloads verbatim with
    exactly one trailing newline (no JSON encoding); `serializeFile()`
    dispatches string vs JSON; `diffArtifact` diffs string payloads as
    whole-file entities (added/removed/changed by path, not per-entity) —
    added tests in `emit.test.ts` (5 new cases: verbatim write, trailing-
    newline normalization, idempotence, whole-file diff, sha256 hashing).
  - `cli.ts` `refresh`: after schema validation of the JSON files, composes
    all 127 markdown docs (22 capabilities + 11 personas + 88 kpis + 6
    section docs) and adds them to the emit map under
    `content/markdown/...` before calling `emitArtifact`. JSON payloads
    unchanged this task (T-007 will make them derive FROM markdown).
  - `compose.test.ts`: per the 5 named fixtures (allocation, forecasting,
    finops-practice-operations, executive-strategy-alignment, sustainability)
    — front-matter sorted-key/kind/slug/title assertions, single-trailing-
    newline, verbatim Definition/Maturity/Functional-Activities/Examples
    rendering, Featured-KPIs-absent-when-empty, and idempotent re-composition
    (pure function of input). Plus 5 escaping-guard tests (dash/hash/newline
    triggers, verbatim-field exemption) and a `section-doc composers` block
    covering persona/kpi/principles/phases/domains/technology-categories/
    maturity-model/scopes.
- Result (evidence):
  - `./scripts/agentic gates --tier all` → PASS on every gate (format, lint,
    typecheck, test 148/148, designs, integrity — same "impl+tests in one
    diff" warning as T-005, expected —, memory, build).
  - `npm run build && node dist/crawlers/framework/cli.js refresh` (offline,
    seeded `.cache/crawl`, 0 network fetches): "markdown composed: 127 docs";
    diff report showed exactly 127 added
    (`content/markdown/{capabilities,personas,kpis}/*.md` + 6 section docs),
    0 removed, 0 changed; `data_version` bumped 2.0.0 → 2.1.0 (minor, entity
    add) per the existing bump rule.
  - `find data/framework/content/markdown -name '*.md' | wc -l` → 127;
    per-directory counts 22/11/88 + 6 top-level docs, matching spec exactly.
  - Ran `refresh` a second time (same cache, no code change): "No changes —
    artifact untouched (version stays 2.1.0)" — double-refresh
    byte-idempotence confirmed directly, not just asserted by unit test.
  - Manifest `sha256` map now has 127 additional entries under
    `content/markdown/`, each a valid 64-hex sha256.
- Next: T-007 (derive step, spec §3) is next in the loop sequence. It must
  parse the non-capability doc layouts described above — read this journal
  entry and the `compose.ts` doc comments before designing `derive.ts`'s
  parser, since those layouts are this session's design, not spec-mandated.
  No blockers.
