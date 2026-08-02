# Critique gate 4 — focus-spec-mcp publish gate

Panel run 2026-07-28 against the BUILT system at focus-spec-mcp publish
candidacy (FOCUS v1.0 + v1.2 artifact, packaging shim
`packages/focus-spec-mcp/`, Worker `src/workers/`, demo app `demo/`): four
lenses probing the live focus server through the eval bridge and scratchpad
Worker probes, with every finding adversarially verified by **two independent
verifiers** before confirmation. No candidate finding was refuted. Gate rule:
zero unresolved BLOCKERs before COMMUNITY publish.

**Result: 2 BLOCKERs, 8 MAJORs, 5 MINORs confirmed; 0 candidates refuted.
Verdict: SHIP-after-fixes.**

## Verdict

**SHIP-after-fixes.** The server's core lookup surface, error UX
(did-you-mean everywhere), determinism, and packaging are close to
publish-grade, but the package cannot ship as-is on two independent axes.
First, spec fidelity: the requirements parser keeps only top-level bullets, so
**149 nested normative MUST/SHOULD statements across 39 of 57 FOCUS 1.2
columns are silently absent from the derived artifact and therefore from every
tool, resource, and the search index** (C2-fidelity-1) — the dropped bullets
are exactly the conditional-nullability and reconciliation rules a
conformance-checking agent needs, while the tool self-describes as serving the
normative bullets "verbatim … nothing else". Serving wrong-by-omission spec
content on the default version is this server's own declared worst case.
Second, community readiness: **the Worker has zero CORS support** — no
preflight handling, no `Access-Control-Allow-Origin` ever emitted — so the
shipped browser demo deterministically fails on first contact against any
deployment under any `ALLOWED_ORIGINS` setting, while `docs/deploy-worker.md`
and the demo's own error hint actively misdirect users to an allowlist knob
that cannot fix it (C4-community-1).

The eight MAJORs cluster into three themes the fix set should treat together:
**attribution/trademark posture** (get_requirements serves verbatim CC BY 4.0
text with no footer or source_url; the focus-spec-mcp README calls the sibling
package "the official FinOps Framework server", contradicting its own
NOTICE.md), **version semantics** (compare_versions reports typo'd columns as
"unchanged" and surfaces "43 changed" without the upstream CHANGELOG's
most-changes-are-not-material caveat; the KPI mapping at version 1.2 explains
why it cannot use a column that the requested version actually contains), and
**fabricated KPI numbers** (calculate_kpi coerces a 0/0 denominator to
definite-sounding "0% utilization / 100% waste" with `caveat: null` on the
official 1.0 sample — the exact three numbers the demo's walkthrough finale
auto-computes).

A hold is not warranted: the 15 findings collapse to roughly ten distinct,
localized fixes. One parser change in `extractRequirements` plus an offline
re-derive resolves both fidelity findings (C2-fidelity-1/-2); one
zero-denominator guard resolves both calculate_kpi findings
(C3-version-1/C4-community-2); one cross-version probe in `findColumn`
resolves both error-hint MINORs (C1-protocol-4/C3-version-3); the CORS fix is
standard preflight + ACAO echo with tests; the rest are string, schema, and
one-JSON-field edits. Fix the BLOCKERs and MAJORs, regenerate
`data/focus/` via `cli.js derive` with fixture tests pinning the recovered
bullets, re-run `./scripts/agentic gates --tier full` and the eval suite, then
publish. The package-name trademark question (C4-community-3) is an owner
decision point that must be recorded in `decisions.md` before first publish —
npm names are permanent.

## Scope & method

- **Four lenses:** C1 protocol correctness (tool contracts, error paths,
  structured/text parity), C2 spec fidelity & licensing (verbatim accuracy
  against the pinned upstream FOCUS tags, attribution, unofficial marking),
  C3 version semantics (the 1.0↔1.2 axis: defaults, diffs, KPI mapping,
  cross-version errors — this server's declared worst-case failure axis),
  C4 community readiness (Worker/demo deployment, docs, trademark posture).
- **Live probing:** every behavioral claim was executed against the built
  focus server via `node evals/framework/mcp-call.mjs --server=focus`, and
  Worker claims via a scratchpad probe driving native `Request` objects
  through the built `dist/workers/app.js` handler. Fidelity claims were
  checked against the raw upstream FOCUS spec files at the v1.0/v1.2 tags
  (bundled files verified byte-identical to upstream before use as ground
  truth) and against independent scans of `data/focus/`.
- **Two-verifier adversarial confirmation:** each finding was independently
  re-reproduced and stress-tested by two verifiers empowered to refute or
  recalibrate. All 15 candidates survived; verifier corrections to evidence
  sub-claims (noted inline below — e.g. the official 1.0 sample's
  commitment-covered row count, the stringhandling attribute example, a
  CHANGELOG line number) are folded into the finding texts and in two cases
  *strengthen* the defect. No new findings were added at synthesis.
- **Accepted limitations honored:** versions beyond 1.0/1.2, bundled-samples-
  only calculate_kpi, 9/18 formula coverage, zod param stripping, and
  handler-only Worker testing were judged for adequacy, not re-discovered.
  Where a finding is adjacent to one (e.g. C3-version-1 vs "unsupported KPIs
  error with guidance"), the verifier notes establish it is a distinct defect.

## Findings table

| id | severity | title | one-line |
|---|---|---|---|
| C2-fidelity-1 | BLOCKER | 149 nested normative MUST bullets silently dropped | Parser keeps top-level bullets only; 39/57 v1.2 columns serve incomplete "Requirements (normative)" on every surface. |
| C4-community-1 | BLOCKER | Worker has zero CORS support | No preflight, no ACAO ever; the shipped browser demo cannot work against any deployment; docs misdirect to ALLOWED_ORIGINS. |
| C1-protocol-1 | MAJOR | get_requirements serves verbatim CC BY 4.0 text unattributed | The most verbatim tool bypasses the footer helper; no source_url/license in text or structuredContent. |
| C1-protocol-2 | MAJOR | compare_versions calls unknown columns "unchanged" | Typo'd column → success + status "unchanged"; today that status is produced *only* by bad input. |
| C2-fidelity-2 | MAJOR | Requirements filter omits RECOMMENDED and MAY | 12 v1.2 + 1 v1.0 top-level RFC-2119 bullets dropped artifact-wide, incl. unique MAY permission clauses. |
| C2-fidelity-3 | MAJOR | README calls sibling package "the official FinOps Framework server" | Endorsement-reading phrase on the npm package page, contradicting NOTICE.md's unofficial posture. |
| C2-fidelity-4 | MAJOR | "43 changed" conflates formatting normalization with material change | Upstream CHANGELOG's materiality caveat is bundled but exposed nowhere; bare counts overstate semantic change. |
| C3-version-1 | MAJOR | calculate_kpi fabricates 0% utilization / 100% waste at v1.0 | ratio() coerces 0/0 to 0 with caveat null on three commitment KPIs, violating the stated error-with-guidance design. |
| C3-version-2 | MAJOR | KPI mapping at v1.2 self-contradicts on its own added columns | 18/18 KPIs version-undifferentiated; the 1.2 answer explains it can't use CommitmentDiscountQuantity — which 1.2 has. |
| C4-community-2 | MAJOR | Demo finale shows the fabricated 0%/100% numbers as fact | Same root cause as C3-version-1, surfaced as the walkthrough's peak moment on official-sample provenance. |
| C1-protocol-3 | MINOR | get_attribute's own example slug fails at the default version | 'CurrencyCodeFormat' was renamed in 1.2; the inline example only works at non-default 1.0. |
| C1-protocol-4 | MINOR | Version-scoped unknown-column errors omit exists-in-other-version hint | ServiceSubcategory@1.0 → fuzzy suggestions for *different* columns; the server already knows it was added in 1.1. |
| C2-fidelity-5 | MINOR | NOTICE overclaims: diff artifact carries no official:false marker | True for kpi-mapping.json (19×), false for diff-1.0-1.2.json; compare_versions structuredContent has no unofficial field. |
| C3-version-3 | MINOR | 1.2-only column at v1.0 errors without version context | Same fix locus as C1-protocol-4: bare "Unknown column" names neither the version consulted nor the 1.2 existence. |
| C4-community-3 | MINOR | Package name leads with the FOCUS trademark | LF trademark policy prohibits mark-first product names; rename after npm publish is irreversible — pre-publish owner decision. |

## BLOCKERs (2)

### C2-fidelity-1 — get_requirements/get_column silently drop all nested normative MUST bullets (149 in v1.2)

**Claim.** The requirements parser keeps only top-level list items, so every
nested normative bullet in FOCUS 1.2 column files is missing from
get_requirements and get_column output — **149 MUST/SHOULD statements across
39 of 57 v1.2 columns** — while the tool self-describes as "The normative
MUST/SHOULD bullets for one column, verbatim from the spec text — nothing
else" and the rendered section is headed "Requirements (normative)". The
dropped bullets are exactly where FOCUS 1.2 puts conditional nullability and
reconciliation semantics, so the server serves incomplete (wrong-by-omission)
spec content on the default version. Verifiers confirmed the loss is
unrecoverable anywhere in the served record: the nested MUSTs are absent from
the derived `data/focus/1.2/columns.json` entirely, and get_requirements,
get_column, the `focus://` resources, and search_focus's index all read that
same record — an agent has no fallback path.

**Evidence.** `src/crawlers/focus/parse/table.ts:54`
`lines.filter((l) => /^[*-]\s+/.test(l))` (top-level only; the test at
`parse/table.test.ts:50` asserts "ignoring nested bullets"). Live:
`get_requirements '{"column":"EffectiveCost","version":"1.2"}'` returns 7
bullets; the bundled `data/focus/1.2/columns/effectivecost.md` (byte-identical
to the upstream v1.2 tag) has 4 more nested MUSTs, including verbatim: "The
sum of EffectiveCost where ChargeCategory is 'Usage' MUST equal the sum of
BilledCost where ChargeCategory is 'Purchase'." InvoiceId loses both governing
nullability MUSTs ("InvoiceId MUST be null when…", "InvoiceId MUST NOT be null
when…"); SkuId 1.2 serves 4 of 12+, dropping all 3 nullability rules and 5
per-SKU rules. Independent scan of `data/focus/{v}/columns/*.md` vs
`columns.json`: 1.2 → 39 columns / 149 dropped nested normative bullets
(worst: skupricedetails 13, tags 11, skupriceid 9); 1.0 → 0 (flat/prose form,
unaffected). Not documented-by-design: the parser comment's premise
("requirements appear as top-level bullets or prose") is false for v1.2, and
the dossier's accepted-limitations list does not cover it.

**Fix.** In `extractRequirements`, when a top-level bullet introduces a nested
list, keep the nested items (prefixed with their parent scoping clause, e.g.
"When ChargeCategory is not 'Usage' or 'Purchase': EffectiveCost … MUST …"),
or serve the whole requirements block verbatim as the fallback. Re-run
`cli.js derive`, regenerate `data/focus/1.2/columns.json` and the packaged
copy, and add fixture tests on effectivecost/skuid 1.2 asserting the nested
MUSTs survive.

### C4-community-1 — Worker has zero CORS support — the shipped browser demo cannot work against any deployment

**Claim.** `src/workers/app.ts` never handles OPTIONS preflight and never
emits `Access-Control-Allow-Origin`, so a browser page (including `demo/`)
can never read a cross-origin response from the Worker, no matter how
`ALLOWED_ORIGINS` is set. The demo's only purpose is to run in a browser
against the deployed Worker (`demo/index.html:151-153`: "real JSON-RPC
tools/call sent to the worker endpoints"), and the Worker serves nothing but
`/mcp/*` (404 otherwise), so same-origin hosting is impossible.
`docs/deploy-worker.md:47-53` actively misleads ("Before pointing a
browser-based client (e.g. the T-038 demo app) at the Worker, set a
comma-separated allowlist"), and `demo/client.js:19` misdiagnoses the
resulting fetch failure as an allowlist configuration problem. Every demo user
and every platform engineer wiring any browser MCP client hits this
deterministically on first try — the dossier's BLOCKER bar of misleading the
community.

**Evidence.** Scratch probe driving `dist/workers/app.js` with native
Requests (`scratchpad/cors-probe.mjs`,
`allowedOrigins:['https://demo.pages.dev']`): OPTIONS `/mcp/focus` with
Origin + `Access-Control-Request-Method` → `PREFLIGHT status: 405`, headers
`[["allow","GET, POST, DELETE"],["content-type","application/json"]]`; POST
with allowed Origin → `POST status: 200` but
`POST Access-Control-Allow-Origin: null`. `demo/client.js:11` sends
`Content-Type: application/json`, which always triggers a preflight.
`grep -rniE 'preflight|Access-Control' src docs demo` → no matches.
`src/workers/app.test.ts:102-123` tests Origin allow/deny but never preflight
or response CORS headers — which is why gates stay green. Both verifiers
reproduced end-to-end via the sanctioned handler-level probe, so the accepted
"handler only, not wrangler" testing limitation does not cover this: the gap
is in the handler itself.

**Fix.** In `createFetchHandler`: answer OPTIONS on known routes with 204 +
`Access-Control-Allow-Origin` (echoing an allowlisted Origin),
`Access-Control-Allow-Methods: POST, GET, DELETE, OPTIONS`,
`Access-Control-Allow-Headers: Content-Type, Accept, Mcp-Session-Id,
MCP-Protocol-Version`; append ACAO to every response whose Origin passed the
allowlist. Add app.test.ts cases for preflight and for ACAO presence on
allowed-Origin POSTs; correct the deploy doc and the demo error hint.

## MAJORs (8)

### C1-protocol-1 — get_requirements serves verbatim CC BY 4.0 spec text with no attribution footer or source_url

**Claim.** The spec contract mandates "CC BY 4.0 attribution footers on
content-bearing responses" (`.agents/specs/focus-mcp-v1.md:79-80`), and every
other content-bearing surface complies (get_column, get_attribute, resources
all end with the `ccByFooter` via `src/servers/focus/render.ts:65,94,100`).
get_requirements returns the most verbatim spec content of any tool — the
normative MUST/SHOULD bullets copied from the FOCUS spec — yet its text has no
attribution/license line and its structuredContent (spec_version, column,
requirements only) carries no source_url or license field, so a consumer has
no way to attribute or to resolve the dangling intra-spec anchors the bullets
contain (`[NumericFormat](#numericformat)`,
`[*FOCUS dataset*](#glossary:FOCUS-dataset)`). The canonical use of this tool
is an agent copying the bullets into conformance reports — downstream
redistribution silently breaches CC BY 4.0, a first-order concern given the
project's standing with the FinOps Foundation.

**Evidence.** Live: `get_requirements '{"column":"BilledCost"}'` → text is
exactly 8 bullets ending "…generated by the [InvoiceIssuer](#InvoiceIssuer)."
with no footer; structuredContent =
`{"spec_version":"1.2","column":"BilledCost","requirements":[…]}` — no
source_url, no license. Contrast get_column BilledCost, whose text ends "…— ©
FinOps Foundation, licensed CC BY 4.0 (…). Content restructured and adapted by
focus-spec-mcp…". Handler: `src/servers/focus/tools.ts:495-531` builds bullets
directly, bypassing render.ts `footer()`; its outputSchema declares no
source_url. Both verifiers reproduced live.

**Fix.** In the get_requirements handler, append `footer(artifact,
c.source_url)` to the text response, and add `source_url` (and optionally
`license: "CC-BY-4.0"`) to the outputSchema and structured payload, mirroring
get_column. Adding source_url also resolves the dangling intra-spec anchors.

### C1-protocol-2 — compare_versions reports unrecognized columns as success with status "unchanged"

**Claim.** compare_versions with an unknown or typo'd column returns
`isError: false` and structuredContent `status: "unchanged"`, conflating
"nonexistent" with "unchanged". Since the current diff is 14 added / 0
removed / 43 changed — every real column is added or changed — "unchanged" is
today produced *exclusively* by bad input: a success status 100% correlated
with typos, returned confidently on the server's declared worst-case axis
(wrong version semantics). A structured consumer that typos a column gets a
confident wrong answer ("BilledCosts" → unchanged, while the real BilledCost
is "changed"). Every sibling lookup tool (get_column, get_attribute,
get_kpi_mapping) properly errors with did-you-mean suggestions; this is the
one gap.

**Evidence.** Live: `compare_versions '{"column":"BilledCosts"}'` →
isError false, `{status:"unchanged"}`; `'{"column":"BilledCost"}'` →
status "changed", changed_fields `["description_md","requirements"]`;
`'{}'` → "14 added, 0 removed, 43 changed". The hedge exists only in prose:
`src/servers/focus/tools.ts:642-645` returns "…is unchanged between 1.0 and
1.2 (or not a recognized column in either version)." — never reaching
structuredContent. Contrast `get_column '{"column":"biledcost"}'` →
isError true, "Did you mean: billedcost, listcost?". Not covered by the zod
accepted limitation (unknown *param names*, not unknown *values*).

**Fix.** In the fall-through branch at tools.ts:642-645, first check whether
the column resolves in either version's column set; if it resolves in
neither, return an error with the same did-you-mean suggester get_column
uses. Reserve "unchanged" for columns that genuinely exist in both versions
with no diff entry.

### C2-fidelity-2 — Requirements filter omits RFC-2119 keywords RECOMMENDED and MAY, dropping presence-level bullets

**Claim.** The NORMATIVE regex matches only MUST/MUST NOT/SHOULD/SHOULD NOT,
so top-level bullets whose only normative keyword is RECOMMENDED or MAY are
dropped from the derived artifact — including each Recommended column's
presence requirement and, more damagingly, MAY permission clauses whose
semantics are served nowhere else. 12 such bullets across 11 v1.2 columns
plus 1 in v1.0. RFC 2119 defines RECOMMENDED as an exact synonym of SHOULD,
so keeping SHOULD while dropping RECOMMENDED is an incoherent parsing bug,
not a designed strength cutoff. An agent conformance-checking would produce
stricter-than-spec verdicts (e.g. flagging pre-invoice InvoiceIds as
violations). Verifier calibration: get_requirements' own description does
limit itself to "MUST/SHOULD bullets", but get_column (tools.ts:240) and
get_attribute (tools.ts:459) advertise unqualified "normative requirements"
backed by the same filtered array, so the fidelity loss on those primary
surfaces stands; and the originally-cited stringhandling attribute example
was corrected — that MAY bullet lives upstream in "## Exceptions" and IS
served verbatim in exceptions_md, so no attribute Requirements section is
affected.

**Evidence.** `src/crawlers/focus/parse/table.ts:43`
`const NORMATIVE = /\b(MUST NOT|MUST|SHOULD NOT|SHOULD)\b/;`. Live:
get_requirements InvoiceId 1.2 returns 3 bullets; the bundled source
(byte-identical to upstream) also has "* InvoiceId is RECOMMENDED to be
present in a [*FOCUS dataset*]…" and "* InvoiceId MAY be generated prior to
an invoice being issued." — both absent from get_requirements,
get_column.requirements, and the rendered "## Requirements (normative)"
section (the column resource serves the same render, so the content is
unreachable server-wide; description_md holds only the intro paragraph).
Scan counts verified exactly: 12 dropped bullets across 11 columns in v1.2,
1 in v1.0 (tags.md).

**Fix.** Extend the keyword set to the full RFC-2119 family used by FOCUS:
MUST (NOT), SHOULD (NOT), RECOMMENDED, MAY (ordered longest-first).
Regenerate the artifact (rides the same re-derive as C2-fidelity-1) and
update tool descriptions if any keywords remain intentionally excluded.

### C2-fidelity-3 — focus-spec-mcp README calls the companion package "the official FinOps Framework server"

**Claim.** `packages/focus-spec-mcp/README.md:13-14` describes the sibling
npm package as "(the official FinOps Framework server)" — the parenthetical
grammatically modifies the server, asserting official status. This directly
contradicts the same package's NOTICE.md ("independent, unofficial
integration … not affiliated with or endorsed by the FinOps Foundation") and
violates the repo's pinned no-endorsement posture (CC BY 4.0 attribution must
not imply endorsement). The README ships in the tarball and becomes the npm
package page — the single most-read surface of the package. A practitioner or
their agent could cite the sibling package as "the official FinOps Framework
MCP server" in a vendor evaluation, and the Foundation could reasonably
object — precisely the reputational/trademark exposure the project has
organized itself to avoid. The author plainly meant "server for the official
FinOps Framework", which keeps this at MAJOR rather than higher.

**Evidence.** README.md:13-14: "decoupled from the companion
`finops-framework-mcp` package (the official FinOps Framework server)."
vs NOTICE.md:50-53: "FOCUS™ and the FOCUS logo are trademarks of the FinOps
Foundation; this package is an independent, unofficial integration and is
not affiliated with or endorsed by the FinOps Foundation or the FOCUS
project." package.json `"files"` includes README.md, so it ships as the npm
page. Gate 3 flagged the same "official" ambiguity on the framework package
(A4-community-3); this repeats the pattern on the new package.

**Fix.** Rephrase so "official" attaches to the framework, not the server —
e.g. "(the companion unofficial server for the FinOps Framework published at
finops.org)" — and grep both package READMEs/descriptions for other
"official" phrasings that modify the software rather than the upstream spec.

### C2-fidelity-4 — compare_versions' "43 changed" conflates upstream formatting normalization with material change

**Claim.** The 1.0→1.2 diff marks all 43 shared columns changed because v1.2
rewrote every column's requirements from prose to bullets. The upstream
CHANGELOG bundled in the artifact explicitly warns "the vast majority of such
changes are not material unless specifically called out", but compare_versions
surfaces only bare counts and per-column changed-field names, the bundled
CHANGELOG is exposed by no tool or resource, and the changed/unchanged
verdicts are computed over the lossy parsed requirements from
C2-fidelity-1/-2. An agent asking "what changed for column X" cannot
distinguish a material semantic change from reformatting, so migration-
planning answers are systematically overstated. (The counts themselves are
accurate: 14 added = 7 v1.1 + 7 v1.2 per upstream CHANGELOG; 0 removed; byte
diffs of bundled vs upstream files confirm all sampled "changed" columns
genuinely differ upstream.)

**Evidence.** Live: `compare_versions '{}'` → text is only "UNOFFICIAL…
FOCUS 1.0 → 1.2: 14 added, 0 removed, 43 changed."; per-column mode →
"`BilledCost` changed fields: description_md, requirements." with no
materiality signal. `data/focus/1.2/CHANGELOG.md:41` carries the exact
upstream caveat. `changelog_md` is bundled (`src/shared/focus/artifact.ts:58`)
but never exposed: the registered `focus://spec/changes/1.0-1.2` resource
serves the same derived diff, not the CHANGELOG.
`diff-1.0-1.2.json` changed_fields distribution: 19 columns list only
`requirements`. The only mitigation is the generic "not an official FOCUS
changelog" disclaimer (tools.ts:580 / render.ts:109), which does not convey
the noise problem.

**Fix.** Expose the bundled CHANGELOG as a resource
(`focus://spec/{version}/changelog`) and have compare_versions cite the
upstream materiality caveat in its banner; optionally annotate changed
entries with the CHANGELOG's called-out material changes, or at minimum link
the two source_urls as "consult upstream text to judge materiality".

### C3-version-1 — calculate_kpi fabricates 0% utilization / 100% waste at version 1.0 instead of erroring

**Claim.** For the three commitment KPIs at version 1.0, calculate_kpi
silently converts an uncomputable metric into a definite-sounding number: the
official FOCUS 1.0 sample contains zero ChargeCategory='Purchase' rows, so
the formulas' denominator is 0, and the shared `ratio()` helper returns 0 on
zero denominator — yielding "Commitment Utilization Score = 0%", "Percentage
of Commitment Discount Waste = 100%", and "Consumption versus Commitment = 0"
with `caveat: null`. This contradicts the server's own stated design that
uncomputable KPIs "error with guidance instead" (kpi-calc.ts header, tool
description). Verifier correction that *strengthens* the defect: a correct
quoted-CSV parse shows only 4 rows carry a real CommitmentDiscountId (all
Usage, EffectiveCost sum 0.0) — the sample handles a literal 'NULL' token —
so the metric is 0/0, fully undefined, yet reported as definite 0%/100%. Not
the accepted "unsupported KPIs error with guidance" limitation: this is a
*supported*-KPI path silently violating that very contract; a journal
self-annotation calling it "not a bug" is an author claim, not an
owner-accepted limitation.

**Evidence.**
`calculate_kpi '{"kpi":"commitment-utilization-score","version":"1.0"}'` →
value 0, caveat null, text "# Commitment Utilization Score (FOCUS 1.0)\n\n0%";
percentage-of-commitment-based-discount-waste → value 100, caveat null;
consumption-versus-commitment → value 0. Sample ground truth
(`data/focus/samples/1.0/official/focus_sample.csv`): 0 Purchase rows,
denominator SUM(ContractedCost WHERE Purchase AND CommitmentDiscountId IS NOT
NULL) = 0. Root cause `src/shared/focus/kpi-calc.ts:55-56`
`return denominator === 0 ? 0 : numerator / denominator;` used at :102 (pct)
and :137 (`(1 - ratio(usage, purchase)) * 100` → 100). The guard is
unit-tested only for the ESR/ListCost=0 case (kpi-calc.test.ts:42-47), where
0 is defensible; for these KPIs it inverts meaning.

**Fix.** Detect a zero denominator for ratio-of-two-filtered-sums KPIs and
throw the existing clean-guidance error path ("the FOCUS 1.0 official sample
contains no Purchase rows carrying CommitmentDiscountId, so this KPI cannot
be computed on it; try version 1.2"), keeping return-0 only where 0 is
semantically true (ESR with zero ListCost). Add a test pinning the
official-1.0-sample behavior. This single fix also resolves C4-community-2.

### C3-version-2 — KPI mapping at version=1.2 self-contradicts: cites 1.0's missing column while ignoring 1.2's fix

**Claim.** The kpi-mapping is not version-differentiated anywhere it should
be: all 18 KPIs have byte-identical `columns_by_version['1.0']` and
`['1.2']`, and formula/caveat are single un-versioned strings. Concretely,
`get_kpi_mapping(kpi='consumption-versus-commitment', version='1.2')` serves
a formula justified by "a spend ratio, since FOCUS 1.0 has no dedicated
committed-quantity column" plus a caveat admitting "a quantity-based ratio
would need CommitmentDiscountQuantity, which FOCUS only introduced in 1.2" —
while the requested version IS 1.2, where the server's own data contains
CommitmentDiscountQuantity and CommitmentDiscountUnit (both among the 14
added columns). The 1.2 answer explains why it can't use a column that exists
in the version being served; calculate_kpi at 1.2 then computes the inferior
spend proxy (0.498) over a synthetic sample that includes the better columns.
Self-contradictory version framing on the axis this server exists for; the
`columns_by_version` structure implies differentiation was intended but the
derivation never populates a difference. UNOFFICIAL flagging keeps it below
BLOCKER.

**Evidence.** Live get_kpi_mapping call returns exactly the cited
self-contradictory text headed "FOCUS 1.2". Scan of
`data/focus/derived/kpi-mapping.json`: 18 KPIs, 0 version-differentiated.
CommitmentDiscountQuantity confirmed in `data/focus/1.2/columns.json` and in
`derived/diff-1.0-1.2.json` added_columns; the synthetic 1.2 sample's CSV
header includes both quantity columns. The only prior acknowledgment is a
journal aside (`.agents/journal/20260728-t033-focus-kpi-mapping.md:21`), not
a dossier-accepted limitation.

**Fix.** Version-differentiate at least the commitment KPIs: for 1.2, add
CommitmentDiscountQuantity/CommitmentDiscountUnit to
`columns_by_version['1.2']` with a per-version formula or caveat — or
minimally rewrite the shared caveat to be version-neutral ("at 1.0 use spend
as a proxy; at 1.2 prefer CommitmentDiscountQuantity"). The structure already
supports this.

### C4-community-2 — calculate_kpi coerces divide-by-zero to 0 — demo finale shows 0% utilization / 100% waste as fact

**Claim.** Same root cause as C3-version-1, surfaced where it does the most
community damage: the demo's step 6 auto-computes the featured Rate
Optimization KPIs — three of the four are the commitment KPIs — as the
walkthrough finale, rendering "Commitment Utilization Score: 0%",
"Percentage of Commitment Discount Waste: 100%", "Consumption versus
Commitment: 0" with official-sample provenance and no "not computable on this
sample" caveat. The 0%-utilization/100%-waste pair is a pure artifact of
`(1-0)*100` on a 0/0 metric; a FinOps practitioner reads these either as real
claims about official FOCUS sample data or as bugs — either way trust is gone
at the exact moment the combined-value story peaks. `KpiCalcResult` has no
computability flag, so structured consumers (`value: 0`, `caveat: null`)
cannot distinguish a genuine zero from not-computable. The zero-coercion is
unit-tested (kpi-calc.test.ts:42), so deliberate at code level — but
deliberateness is not dossier-documented acceptance and does not cure the
misleading output.

**Evidence.** Live calls as in C3-version-1. Demo wiring: `demo/requests.js`
targets rate-optimization + version 1.0; get_capability returns exactly the
4 featured KPIs; `demo/app.js:80-89` auto-computes them as the finale.
`src/servers/focus/tools.ts:815` shows caveat comes from the mapping entry
only, so degenerate results always ship caveat-null. (Verifier correction as
in C3-version-1: the sample's real committed rows number 4, all
zero-EffectiveCost Usage — the metric is 0/0, strengthening the fabrication
claim.)

**Fix.** Covered by the C3-version-1 fix: extend KpiCalcResult with
`computable: false` + reason (or throw the clean guidance error) and have the
tool — and therefore the demo — render "not computable over this sample"
instead of a number. Add a zero-denominator unit test.

## MINORs (5)

### C1-protocol-3 — get_attribute's own documented example 'CurrencyCodeFormat' fails at the default version

The slug parameter's schema description is "Attribute ID or slug, e.g.
'CurrencyCodeFormat'" (`src/servers/focus/tools.ts:463`), but that attribute
was renamed between versions (`1.0/attributes/currency_code_format.md` →
`1.2/attributes/currency_format.md`), so an agent copying the tool's own
example with default arguments (version 1.2) gets an error. Recovery is one
detour thanks to a good did-you-mean — but attributes have no dedicated list
tool, so the inline example is the primary discovery hint, and a server whose
core value is version fidelity shouldn't ship an example that only works on
the non-default version. Evidence:
`get_attribute '{"slug":"CurrencyCodeFormat"}'` → isError true, "Did you
mean: currency_format?"; same call with `"version":"1.0"` succeeds.
**Fix:** change the example to a slug stable across both served versions
(e.g. 'datetime_format', present in both); optionally note that attribute
slugs are discoverable via `search_focus` with `entity_types=["attribute"]`.

### C1-protocol-4 — Version-scoped unknown-column errors omit the exists-in-another-version hint

Asking get_column (or get_requirements) for a column at version 1.0 that only
exists in 1.1+ yields "Unknown column" with fuzzy suggestions for *different*
columns, never saying the exact column exists in the other served version.
Live: `get_column '{"column":"ServiceSubcategory","version":"1.0"}'` →
"Did you mean: servicecategory, pricingcategory?" — while the same call
without version succeeds (introduced 1.1) and compare_versions lists it among
the 14 added. A fresh agent probing "was ServiceSubcategory in FOCUS 1.0?"
could conclude the column name itself is wrong. Cross-version hints are
precisely this server's specialty and the data is already loaded
(`store.versions` in registerTools, tools.ts:117-151). Kept MINOR: recovery
is one tool call away. **Fix:** shared with C3-version-3 — in the
unknown-column path, when the exact ID/slug resolves in a different served
version, say so: "ServiceSubcategory is not in FOCUS 1.0 — it exists in 1.2
(introduced 1.1); see compare_versions." before falling back to fuzzy
suggestions.

### C2-fidelity-5 — NOTICE claims all derived records carry official:false, but the diff artifact has no such marker

`packages/focus-spec-mcp/NOTICE.md:28-30` states "All derived content is
marked `official: false` in its records and carries an UNOFFICIAL banner in
tool output" — true for kpi-mapping.json (19 occurrences), false for
`data/focus/derived/diff-1.0-1.2.json`, which contains no official flag
anywhere; and compare_versions' structuredContent keys are
`{from, to, added_columns, removed_columns, changed_columns}` only, so the
UNOFFICIAL marking exists solely in the human-readable text. Agents
increasingly consume structuredContent, and NOTICE.md is exactly the
compliance surface an auditor or the Foundation would check — a verifiably
false sentence there is a small but genuine trust defect. Mitigations keeping
it MINOR: the text output does carry the banner, and the diff is a mechanical
comparison of two official versions. **Fix:** add `"official": false` to
diff-1.0-1.2.json and echo it in compare_versions structuredContent, or
soften the NOTICE sentence to match reality.

### C3-version-3 — 1.2-only column queried at 1.0 errors without version context or cross-version hint

The findColumn edge of the same gap as C1-protocol-4:
`get_column '{"column":"SkuMeter","version":"1.0"}'` → isError true,
'Unknown column "SkuMeter". Use list_columns for the full list.' — naming
neither the version consulted nor the fact that compare_versions itself
reports "`SkuMeter` was added in 1.2". The error's own suggested recovery
(list_columns at 1.0) confirms the wrong conclusion that SkuMeter is not a
FOCUS column at all; the resource read `focus://spec/1.0/columns/skumeter`
has the same shape. FOCUS 1.0 consumers pinned to 1.0 will hit 1.2-only
columns in provider docs, so the scenario is realistic. **Fix:** in
findColumn (tools.ts:136-151), on a miss probe `store.versions` and, on a
hit, emit "SkuMeter does not exist in FOCUS 1.0 — it was added in 1.2; retry
with version '1.2' or see compare_versions." Otherwise at least prefix the
version: 'Unknown column "X" in FOCUS 1.0.' One fix covers both this and
C1-protocol-4.

### C4-community-3 — Package name 'focus-spec-mcp' leads with the FOCUS trademark — rename risk after publish

The npm name (`packages/focus-spec-mcp/package.json:2`), bin name, and
registry id `io.github.aaronmsoto/focus-spec-mcp` (server.json:3) all
incorporate the FOCUS mark as the leading element of the product name. The
project's own NOTICE.md acknowledges FOCUS™ is a FinOps Foundation
trademark, and the Linux Foundation trademark policy (the Foundation is an LF
project) prohibits exactly this pattern — fetched and quoted verbatim: "A
trademark should not be used as part of your product name." Publishing mints
the npm name permanently; a post-publish complaint forces a rename that
strands early installs. Kept MINOR: no user is harmed today, the name is
accurately descriptive, NOTICE.md disclaims endorsement, the registry id is
author-namespaced, harm requires a contingent enforcement chain, and the
primary package 'finops-framework-mcp' already embeds the 'FinOps' mark —
this is the project's existing de facto naming posture. But it is a
**pre-publish owner decision point**, and no decisions.md entry covers it.
**Fix:** owner decision before first publish — get written OK from the
Foundation, restructure to the sanctioned "<name> for <mark>" pattern, or
knowingly accept the risk and record it in decisions.md with the policy
quote. Descriptive uses inside README/NOTICE are fine and need no change.

## Considered and rejected (0)

No candidate finding was refuted at this gate: all 15 findings submitted by
the four lens critics survived two-verifier adversarial confirmation. Where
verifiers found individual evidence sub-claims wrong (the official 1.0
sample's committed-row count in C3-version-1/C4-community-2, the
stringhandling attribute example in C2-fidelity-2, a CHANGELOG line number in
C2-fidelity-4), the corrections are folded into the finding texts above; in
the KPI case the correction strengthened the finding (0/0 rather than a
nonzero numerator). Severity recalibrations during verification (downgrade-
only) produced no changes.

## What this gate did not cover

- **Versions beyond 1.0/1.2** — out of v1 scope by accepted limitation; the
  design's support for adding versions was not exercised.
- **The framework server** (`src/servers/framework`) beyond incidental
  contact — gate 3's findings and their fix dispositions were not
  re-verified here; this gate reviewed the focus surface, Worker, packaging
  shim, and demo only.
- **Live wrangler deployment** — Worker claims were verified at the handler
  level per the accepted testing limitation; the CORS fix should be
  smoke-tested against a real deployed Worker + Pages-hosted demo before the
  demo URL is shared.
- **The conformance validator and synthetic generator internals**
  (`src/shared/focus/`) beyond their observable effects through calculate_kpi
  and the bundled samples — no rule-by-rule audit against the spec.
- **calculate_kpi numeric accuracy on the 1.2 synthetic sample** for the six
  KPIs with valid denominators — only the degenerate-denominator path was
  audited.
- **search_focus ranking quality** — indexing correctness was touched only
  via the C2-fidelity-1 observation that it indexes the lossy record.
- **The harness/template machinery** (.agentic/, gates, task chain).
- **Windows and non-Claude-client install paths for the focus-spec-mcp
  tarball** — the tarball was verified working per the dossier, but gate 3's
  pack-and-install smoke-test recommendation was not re-executed against the
  new package.

## Gate exit criteria

Before publish: fix both BLOCKERs — C2-fidelity-1 together with C2-fidelity-2
(one `extractRequirements` change + `cli.js derive` re-run + fixture tests
pinning nested and RECOMMENDED/MAY bullets), and C4-community-1 (preflight +
ACAO echo + app.test.ts cases + deploy-doc and demo-hint corrections). Land
the remaining MAJORs in the same change set: C1-protocol-1 (footer + schema
field), C1-protocol-2 (membership check before "unchanged"), C2-fidelity-3
(one-phrase README rewrite + grep for other "official" bindings),
C2-fidelity-4 (changelog resource + materiality caveat), and the single
zero-denominator guard that resolves both C3-version-1 and C4-community-2,
plus the C3-version-2 caveat rewrite. Resolve C4-community-3 as an explicit
owner decision recorded in decisions.md before the npm name is minted. The
remaining MINORs (example slug, cross-version error hints — one shared fix —
and the NOTICE/diff official:false alignment) are cheap and should ride
along. Then re-run `./scripts/agentic gates --tier full` and the eval suite
against the regenerated artifact, and re-verify the demo end-to-end against a
deployed Worker.