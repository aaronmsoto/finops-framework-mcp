# Critique gate 3 — publish gate (Track A)

Panel run 2026-07-24 against the BUILT system at publish candidacy (server
1.0.0, artifact v2.1.1, crawled 2026-07-23): four lenses probing the live
server through the eval bridge and scratchpad SDK probes, with every finding
adversarially verified by **two independent verifiers** before confirmation.
Findings the verifiers refuted are recorded below as considered-and-rejected.
Gate rule: zero unresolved BLOCKERs before COMMUNITY publish.

**Result: 1 BLOCKER, 3 MAJORs, 10 MINORs confirmed; 1 candidate refuted.
Verdict: SHIP-after-fixes.**

## Verdict

**SHIP-after-fixes.** The server's content fidelity, determinism, error UX,
and eval performance (3×10/10) are publish-grade, but the package cannot ship
as-is: the npm bin entry never starts the server on Linux/macOS (A4-community-1),
which silently breaks every documented install path — npx Quickstart,
`claude mcp add`, and Claude Desktop — with exit 0 and zero diagnostics. That
BLOCKER, the three MAJORs (silent cross-query cursor reuse producing
self-contradictory empty pages; 14/22 official summaries served mid-word
truncated with no marker; map_personas redistributing ~14KB of verbatim
CC BY 4.0 content with no attribution), and the get_kpis outputSchema
violation (MINOR by rule, but functionally breaking for schema-validating
MCP clients) must land before publish. All required fixes are localized —
a guard rewrite plus smoke test, a cursor fingerprint field, a truncation
one-liner, an existing footer helper call, and two schema fields — so a hold
is not warranted; re-run `--tier full` gates and the eval suite after the
fix set, then publish.

## Scope & method

- **Four lenses:** A1 protocol correctness (cursors, schemas, error
  contracts), A2 agent usability (parameter ergonomics, response sizing,
  descriptions), A3 content fidelity & licensing (verbatim accuracy against
  finops.org, attribution, metadata), A4 community readiness (install paths,
  docs, freshness, trademark posture).
- **Live-server probing:** every behavioral claim was executed against the
  built server via `node evals/framework/mcp-call.mjs` (tools) and scratchpad
  probes using the repo's own `@modelcontextprotocol/sdk` (resources, prompts,
  wire schemas, client-side validation). Content-fidelity claims were checked
  against live finops.org pages via WebFetch.
- **Two-verifier adversarial confirmation:** each finding was independently
  re-reproduced and stress-tested by two verifiers empowered to refute or
  recalibrate severity. Several findings were downgraded from their original
  severities during verification; those downgrades are reflected below and
  are final. No new findings were added at synthesis.
- **Best-practices applicability:** per the dossier's review of
  modelcontextprotocol.info best practices (fetched 2026-07-23), production
  HTTP/K8s guidance (health endpoints, HPA, Prometheus, Redis, rps targets)
  was ruled out of scope for a stdio npm package; single-responsibility,
  error classification, safe error surfaces, externalized config, and
  multi-layer testing were applied. Documented known limitations
  (zod silent param stripping, JSON text blocks by design, preserved source
  typos, NOTICE.md posture) were judged for adequacy, not re-discovered —
  where a finding touches one, the verifier notes say what is genuinely new.

## Findings table

| id | severity | title | one-line |
|---|---|---|---|
| A4-community-1 | BLOCKER | npm bin never starts the server | `endsWith("main.js")` guard is false under the `.bin` symlink; every documented install path exits 0 silently on Linux/macOS. |
| A1-protocol-1 | MAJOR | Cursors not bound to query/filters/tool | A cursor from one query/tool is silently applied to another, yielding empty pages whose text says "Try broader terms". |
| A3-fidelity-1 | MAJOR | list_capabilities garbles 14/22 official summaries | `slice(0, 200)` cuts Foundation prose mid-word with no ellipsis; text block omits summaries entirely. |
| A3-fidelity-2 | MAJOR | map_personas serves ~14KB CC BY 4.0 content unattributed | The one content tool that never calls `attribution()` — no source_url, license, or uri anywhere in its output. |
| A1-protocol-2 | MINOR | entity_type singular in search, plural in get_entity | Copying `entity_type` from a search hit into get_entity fails validation; recovery is one step. |
| A1-protocol-3 | MINOR | get_kpis structuredContent violates its own outputSchema | Undeclared source_url/license + `additionalProperties:false` → SDK-validating clients reject every get_kpis call. |
| A2-usability-1 | MINOR | Misnamed optional filters silently drop | Documented SDK limitation, but list_capabilities' description prose actively invites the failing `domain_slug` name. |
| A2-usability-2 | MINOR | Param names unspelled/inconsistent across tools and prompts | `current_level`/`target_level` vs prompt `current`/`target`; assess_maturity_path description never spells its params. |
| A2-usability-3 | MINOR | map_personas persona view is 35KB with no size control | Description routes the most natural persona question to the largest default response; no trimming lever, no cost note. |
| A2-usability-4 | MINOR | get_changelog text gives counts only; items are artifact paths | "127 added" (schema-migration re-add) is indistinguishable from real framework change; identities are internal file paths. |
| A3-fidelity-3 | MINOR | parse_warnings stale: claim missing summaries that exist | Manifest/front-matter warnings contradict the shipped artifact; exposed via the manifest resource. |
| A4-community-2 | MINOR | No refresh cadence or npm data-update story documented | Data versioning docs cover git-ref pinning only; tarball consumers' data changes only via package release. |
| A4-community-3 | MINOR | "Not endorsed" buried in NOTICE.md; NOTICE lists a deleted feature | README/registry lead with "official FinOps Framework"; NOTICE still names deleted inferred relationships. |
| A4-community-5 | MINOR | No install instructions for non-Claude MCP clients | README covers only Claude Code/Desktop; no `.vscode/mcp.json` or generic stdio snippet. |

## BLOCKER (1)

### A4-community-1 — npm bin never starts the server; every documented install path silently does nothing

**Claim.** The guard `const isDirectRun = process.argv[1]?.endsWith("main.js")`
(src/servers/framework/main.ts:47) is false when the binary is invoked the way
npm/npx invokes it on Linux/macOS — via the `node_modules/.bin` symlink named
`finops-framework-mcp`, whose `argv[1]` is the unresolved symlink path.
`runCli()` is never called; the process exits 0 with no output. The README
Quickstart (`npx finops-framework-mcp`, README.md:34), the Claude Code line
(README.md:46), and the Claude Desktop JSON (README.md:51-60) all launch a
server that instantly dies silently; Claude Desktop shows "Server
disconnected" with zero diagnostics. Windows cmd-shims pass the real main.js
path, so this ships broken specifically on the platforms most practitioners
use.

**Evidence.** Simulated npm's exact bin mechanism:
`ln -sf dist/servers/framework/main.js fakebin/finops-framework-mcp; ./fakebin/finops-framework-mcp --version`
→ no output, exit 0 (direct `node dist/servers/framework/main.js --version`
correctly prints `finops-framework-mcp v1.0.0 (data v2.1.1)`). Piping a real
MCP initialize request into the symlinked bin → no JSON-RPC response, exit 0.
Root cause confirmed on Node v22.22.2: a symlink-invoked script's `argv[1]` is
the unresolved symlink path (probe printed `argv1: .../probe-link`). Both
verifiers reproduced end-to-end, including a faithful
`node_modules/.bin` relative-symlink layout. The passing evals invoke main.js
by direct path and never exercised the bin route.

**Fix.** Replace the suffix guard with a realpath comparison
(`realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)`) or add a
tiny dedicated bin wrapper (dist/bin.js) that unconditionally calls
`runCli()`. Add a pack-and-install smoke test (`npm pack` → install into a
temp dir → run the `.bin` entry → assert an initialize response) so the
actual npx path is exercised before publish.

## MAJORs (3)

### A1-protocol-1 — Cursors not bound to query/filters/tool: silent empty pages with misleading "try broader terms" text

**Claim.** Pagination cursors encode only `{data_version, offset}`
(tools.ts:43-59), so a cursor issued for one query/filter set — or even
another tool — is accepted with different parameters. Instead of the -32602
rejection the server correctly gives for garbage/stale cursors, it silently
applies the old offset to the new result set, returning an empty page whose
text block contradicts its own structuredContent and steers the agent wrong.

**Evidence.** A `search_framework "cost allocation"` cursor reused with query
`"kubernetes"` → `isError` absent, structuredContent `{total: 3, results: []}`,
text `'3 hit(s) for "kubernetes". Try broader terms…'` — while a fresh
kubernetes query returns 3 real hits. A get_kpis cursor (o=25) fed to
list_capabilities (22 items) → accepted, `{capabilities: [], total: 22}`.
Contrast: garbage and version-mismatched cursors are properly rejected with
actionable text, proving the server intends cursor validation but leaves
query/filter/tool binding unchecked. Verifiers confirmed the trigger is
common (default unfiltered get_kpis issues a nextCursor on page one, so agents
routinely hold live cursors) and the failure is the worst kind: silent,
self-contradictory, and actively misdirecting — it can yield a confident
false negative relayed to the human user.

**Fix.** Add a context fingerprint to the cursor (short hash of tool name +
normalized query/filter params) alongside `v` and `o`; reject on mismatch in
`paginate()` with the same actionable style as the stale-cursor error
("Cursor was issued for a different query/filter — restart without a
cursor"). Make the empty-page text distinguish "no hits" from "page beyond
results" using offset vs total.

### A3-fidelity-1 — list_capabilities garbles 14/22 official summaries: mid-word 200-char cut, no ellipsis

**Claim.** `summary: c.summary.slice(0, 200)` (tools.ts:320) hard-truncates
capability summaries mid-word with no marker, so 14 of 22 capabilities serve
mangled Foundation prose (executive-strategy-alignment ends "…govern i";
governance-policy-risk ends "…regulatory requirements, "). An agent quoting
these reproduces corrupted framework content with no way to know it is
incomplete. The text block omits summaries entirely, contradicting the tool
description's promise of "slug, title, domain, one-line summary".

**Evidence.** Live call reproduced all 14 clamped summaries at exactly 200
chars; source capabilities.json holds the full sentences (verified
byte-identical against live finops.org), so the corruption is
server-introduced. Same pattern in search_framework snippets
(tools.ts:246, `slice(0, 100)`). Verifiers upheld MAJOR: silent, user-visible
content corruption in 64% of a core discovery tool's output, in a product
whose fidelity promise extends to preserving source typos. get_capability
offering full text keeps it below BLOCKER.

**Fix.** Raise the cap so all 22 curated summaries (max 409 chars) fit whole,
or truncate at a word boundary with an appended "…"; include the summary in
the text block to match the description.

### A3-fidelity-2 — map_personas serves ~14KB of verbatim CC BY 4.0 content with no attribution, source_url, or license

**Claim.** Every other content-bearing tool appends the
"Source: … © FinOps Foundation, licensed CC BY 4.0…" footer and carries
provenance fields, but map_personas returns the Foundation's verbatim
persona-activity bullets with zero provenance in either the text block or
structuredContent — an attribution gap on redistributed licensed content,
inconsistent with the project's own NOTICE.md posture and its critique-2 M7'
decision that every content tool carries per-response attribution.

**Evidence.** `map_personas {"persona":"finance"}` → single 14,346-char text
block, no footer; structuredContent `{mode, note, entries}` with no
source_url/license/uri. Contrast: get_maturity_assessment ends with the full
CC BY footer. Code confirms omission, not design: the comment at tools.ts:98
says content tools "carry the same CC BY 4.0 attribution as resources
(critique-2 M7')", `attribution()` is appended in all six peers
(lines 434/523/574/692/760/1031), but the map_personas handler
(lines 802-898) never calls it in any of its three modes; the attribution
test at server.test.ts:262 omits map_personas, so the gap is untested.

**Fix.** Append the same attribution footer to map_personas responses
(persona and capability modes), add per-entry uri or source_url fields to its
structuredContent, and add map_personas to the attribution test.

## MINORs (10)

### A1-protocol-2 — entity_type vocabulary is singular in search_framework but plural in get_entity

search_framework emits `entity_type: "principle"` (etc.) while get_entity
requires `"principles"` (plural collection names, plus singular `"persona"`).
The natural copy-from-search-hit flow fails with -32602; the error lists valid
values, so recovery is one deterministic step. Evidence: hit carries
`"principle"`; `get_entity {"entity_type":"principle"}` → invalid-option error
(tools.ts:25-35 vs 911-918). **Fix:** normalize singular→plural before the
enum check (or widen the enum with aliases); keep one canonical vocabulary in
docs. Verified as a one-turn, self-correcting papercut — MINOR floor.

### A1-protocol-3 — get_kpis structuredContent includes source_url/license fields undeclared in its outputSchema

Each KPI record carries source_url and license, but the declared outputSchema
for `kpis[]` items omits both (tools.ts:612-627 vs 661-672). **Verification
found the impact understated:** the wire schema carries
`additionalProperties: false`, and the official MCP TS SDK client validates
structuredContent against the schema cached from listTools — a probe using
the repo's own node_modules SDK threw
`McpError -32602 "Structured content does not match the tool's output schema: data/kpis/0 must NOT have additional properties"`.
Real hosts (Claude Code/Desktop, TS/Python SDK agents) list tools before
calling, so get_kpis fails on every call for them; the eval bridge masked
this by calling without listing first. Severity stays MINOR per gate rules
(downgrade-only verification), but the panel notes this behaves like a
functional breakage and includes it in the required pre-publish fix set.
**Fix:** declare source_url and license in the get_kpis outputSchema
(matching get_capability) and add a test asserting every tool's
structuredContent keys are a subset of its declared schema.

### A2-usability-1 — Misnamed optional filter params silently drop, returning wrong-scope data at up to 9x token cost

4/4 probes bit: `get_kpis {"capability_slug": …}` returned 57KB of unfiltered
library instead of 6.4KB filtered; `list_capabilities {"domain_slug": …}`
returned all 22 instead of 5; misnamed get_capability/map_personas params
likewise ignored. The core behavior duplicates documented known limitation #3
(SDK zod stripping; mitigation = param names spelled in descriptions), and
the primary fix (strict schemas) is owner-accepted as blocked on SDK support.
What survives as new: the list_capabilities description (tools.ts:260) says
"filtered by domain slug" without backticking `domain`, actively inviting the
failing `domain_slug` name — the documented mitigation is false for exactly
this tool. **Fix:** reword descriptions to spell exact param names in
backticks; adopt strict/unknown-key rejection when the SDK allows it.

### A2-usability-2 — Param names unspelled and inconsistent across tools and prompts, causing live detours

assess_maturity_path's description never states its required params
(`current_level`/`target_level`), and the matching prompt
plan-maturity-roadmap takes `current`/`target`; get_capability takes `slug`
while the maturity tools take `capability`. Verification tempered the impact:
real clients receive full inputSchema via tools/list (the eval bridge strips
it, which blinded the probing agent), all params are required so mistakes
fail loudly with -32602 naming the path, and recovery is one retry. What
remains is real tool-vs-prompt vocabulary drift plus uneven application of
the repo's own description-spelling standard. **Fix:** standardize one
vocabulary across tools and prompts, and add exact param names to
assess_maturity_path's and get_capability's descriptions. Cheap string edits.

### A2-usability-3 — map_personas persona view is 35KB with no size control; description routes agents to it

"One call answers what does X do across the framework" routes the most
natural persona question to a 35,456-byte (~9k-token) response with no
pagination, no include-style trimming (a `limit` param is silently ignored),
and no token-cost note — while the lighter persona document (13.5KB via
get_entity) fits the question better. Inconsistent with get_capability, which
itemizes per-section token costs and defaults small — an internal-consistency
gap, not an imported generic best practice. **Fix:** state approximate size
in the description, point goal/overview questions at get_entity(persona), and
optionally add a capabilities-subset filter or summary_only mode.

### A2-usability-4 — get_changelog text gives counts only; changed items surface as internal artifact file paths

The text block answers "what changed?" with "0 added, 0 removed, 2 changed"
and no identities; identities live in structuredContent as crawl-artifact
paths (content/markdown/capabilities/usage-optimization.md), and the v2.1.0
entry reads "127 added" — a schema-migration re-add that no field
distinguishes from real framework growth, so a text-only client would relay a
massive framework change that never happened. **Fix:** name changed entities
per version in the text block, map file paths to entity titles + finops://
URIs, and annotate or collapse migration-driven mass re-adds. The server
already owns the slug-to-title mappings.

### A3-fidelity-3 — parse_warnings are stale: they claim missing summaries the shipped artifact contains

manifest.json parse_warnings ("no summary paragraph found" for
executive-strategy-alignment and usage-optimization) contradict the shipped
v2.1.1 data — both files carry full "## Summary" sections verified identical
to the live site. Cause: the HTML-parser heuristic (capability.ts:110-117)
warns on the first-bolded-paragraph path while derive.ts:262 successfully
extracts from the Summary heading; the two paths were never reconciled. Not
purely internal: the manifest is exposed as finops://framework/meta/manifest,
so an auditing agent can report nonexistent gaps. Determinism and accuracy
context from this audit was otherwise clean (identical md5s across double
runs; allocation, maturity-model, and ESR KPI content verified verbatim
including the preserved source typo). **Fix:** reconcile parser warnings
against the composed artifact at derive time; regenerate.

### A4-community-2 — No refresh cadence promised and no data-update story for npm/npx consumers

Freshness IS discoverable at runtime (get_framework_info → crawled_at
2026-07-23), and the README honestly documents the uninstalled refresh
workflow. What's missing: the "Data versioning policy" section covers only
git-ref pinning, never stating that npm-tarball data changes only via a
package release, and no cadence (even "best-effort, none guaranteed") is
stated anywhere. **Fix:** one README paragraph — npm users get
release-time data (check get_framework_info/--version), intended or
explicitly-absent refresh cadence, and the local-refresh +
FINOPS_MCP_DATA path. Ideally install refresh-data.yml before publish so any
cadence claim is real.

### A4-community-3 — "Not endorsed" is buried in NOTICE.md while README/registry lead with "official"; NOTICE stale

README.md:4, package.json:4, and server.json:4 all lead with "official FinOps
Framework" (grammatically the Framework, not the server, and attributed to
the Foundation in the same sentence), while "The FinOps Foundation does not
endorse this project" lives only in NOTICE.md, which npm and the MCP registry
don't surface. "FinOps" is a Foundation trademark, so the disclaimer should
sit where people look. Additionally NOTICE.md:29 still lists "inferred
capability relationships" among current adaptations, though that feature was
deleted (README.md:95-97; data/framework/derived/ has no relationships file)
— over-inclusive but inaccurate at publish time. **Fix:** one non-affiliation
line near the top of README and in the package/server descriptions; reword so
"official" cannot bind to the server; drop the stale NOTICE line.

### A4-community-5 — No install instructions for Copilot/VS Code or any non-Claude MCP client

README install coverage is Claude-only; no `.vscode/mcp.json` /
`code --add-mcp` snippet or generic stdio-config sentence, despite the
project positioning itself for "AI agents and MCP clients" generally. Nobody
is blocked — the Claude Desktop JSON exposes the full stdio contract and
adapting it is a two-field copy — but a copy-paste snippet removes real
friction for less-developer-heavy FinOps practitioners at near-zero cost.
**Fix:** a short "Other MCP clients" subsection with a `.vscode/mcp.json`
example and one generic stdio sentence (~6 README lines).

## Considered and rejected (1)

| id | title | why rejected |
|---|---|---|
| A4-community-4 | Node >=20 requirement is undocumented in README and unenforced at runtime | The claimed harm never materializes: neither src nor shipped dist uses any Node 20-exclusive API (import.meta.dirname appears only in unshipped tests), and the bundled SDK declares engines >=18, so a Node 18 user gets an advisory EBADENGINE warning and a working server. As of July 2026, Node 18 is 15+ months past EOL, making the affected population negligible. What remains is a cosmetic README omission already communicated via the standard engines field. |

## What this gate did not cover

- **The experimental surface** (`FINOPS_MCP_EXPERIMENTAL=1`: get_actions and
  the maturity-model extension) beyond confirming it stays gated by default —
  its content quality was not re-audited.
- **The crawler against live-site drift or hostile HTML**: the pipeline was
  judged on the shipped v2.1.1 artifact (spot-verified verbatim against
  finops.org), not by re-crawling or fuzzing future page variants.
- **Production HTTP/K8s best practices** (health endpoints, autoscaling,
  Prometheus, caching layers, load targets) — ruled inapplicable to a stdio
  npm package per the dossier's applicability review.
- **Windows end-to-end install** — the bin analysis reasons that cmd-shims
  pass the real main.js path, but no Windows host was available to execute
  the install; the pack-and-install smoke test should run on Windows CI if
  available.
- **Concurrency/load behavior** of the stdio server and performance under
  very large conversation contexts.
- **The harness/template machinery** (.agentic/, gates, task chain) — this
  gate reviewed the publishable server and package only.
- **Round-1/2 regression sweep**: critique-1/2 dispositions were consulted
  where findings touched them (e.g. M7' attribution, B1' text-parity), but
  the panel did not re-verify every prior fix.

## Gate exit criteria

Before publish: fix A4-community-1 (with the pack-and-install smoke test),
A1-protocol-1, A3-fidelity-1, A3-fidelity-2, and A1-protocol-3 (functionally
breaking despite MINOR label); re-run `./scripts/agentic gates --tier full`
and the eval suite. The remaining MINORs are cheap, mostly documentation and
description edits, and should ride along in the same change set where
convenient; none individually blocks publish.