# Final Status Review — finops-framework-mcp

**Date:** 2026-08-02
**Scope:** Full pre-launch review of branch `claude/session-k75rxy`, post critique-gate-4 fixes and post the `finops-focus-mcp` rename. Covers both shipped MCP servers (`src/servers/framework`, `src/servers/focus` / `packages/finops-focus-mcp`), the Cloudflare Worker (`src/workers`), the `demo/` walkthrough, packaging, docs, and licensing. Five lens reviews (MCP conformance, tool naming, architecture, launch readiness, docs coherence); all MAJOR+ findings were adversarially re-verified against the live servers and the tree — refuted findings dropped, three downgraded.

---

## Executive summary

**Verdict: GO-after-listed-fixes.**

The product core is ready. Live probing confirms both servers are exemplary MCP citizens (structured output, read-only annotations, fingerprinted cursors, correct error taxonomy, prompts and resources on both servers), the four prior critique gates' fixes all still hold under re-probe, packaging and registry manifests are coherent at 1.0.0, CI runs the real gates, and the trademark rename is complete with zero stale references. No BLOCKER was found by any lens, and no finding touches runtime correctness of the shipped servers.

What blocks flipping the repo public is its front door, not its code. Two MAJORs survived adversarial verification, both documentation/licensing:

1. **The root README denies half the product exists** — the shipped FOCUS server appears only as hypothetical "roadmap", and the Worker and demo are absent entirely. This README is also the npm page for `finops-framework-mcp` and the landing page both `server.json` manifests point registry users at.
2. **The root NOTICE.md omits CC BY 4.0 attribution for `data/focus/**`** — 135 tracked files of verbatim FinOps Foundation spec text and sample data are affirmatively implied to be MIT by the current NOTICE/README scoping. Correct attribution already exists in `packages/finops-focus-mcp/NOTICE.md`, so the fix is a transplant.

Both are localized doc edits with zero code or release risk. Land them, then publish. Everything else — 19 confirmed MINORs, including three findings downgraded from MAJOR during verification — is post-launch backlog.

---

## Per-area grades

| Area                       | Grade  | Rationale                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP conformance            | **A-** | All 20 tools live-verified with outputSchema, structuredContent, full read-only annotations, fingerprinted cursors, and correct error taxonomy; prompts exist on both servers (contrary to the review premise); deductions are polish only (text-pagination parity, zombie Worker GET stream, `listChanged` doc mismatch). |
| Tool naming & descriptions | **A-** | 17 of 20 tools score clean; zero collisions; every inline example resolves live; deductions are three MINORs, two of them known-open critique-3 residue (`domain_slug` prose trap, `assess_maturity_path` param docs).                                                                                                     |
| Architecture & tests       | **A-** | ESLint-enforced layering, real shared-core extraction, behavioral tests over a real MCP client, all re-probed critique fixes intact; deductions confined to the untested offline derive orchestration (contained by artifact schema+sha256 gating) and small periphery gaps.                                               |
| Launch readiness           | **B+** | Packages, manifests, versioning, CI, and the rename are publish-grade; held back solely by the two MAJOR front-door fixes (README reality gap, root NOTICE licensing scope).                                                                                                                                               |
| Docs coherence             | **B-** | Leaf docs (package README, deploy-worker.md, eval-results.md, activeContext.md) are excellent and verified current; the top-of-funnel surfaces (root README, MEMORY.md, architecture.md/AGENTS.md framing, one stale eval expectation) lag shipped reality.                                                                |

_Note: two of docs-coherence's three MAJORs (MEMORY.md staleness, eval step 4) were downgraded to MINOR under adversarial verification — the grade above reflects the lens's original assessment of surface staleness, which remains directionally fair for the orientation docs._

---

## Strengths worth keeping

Synthesized and deduped across all five lenses; every item was live-verified or file-cited by at least one reviewer.

**Protocol and tool surface**

- Complete structured-output conformance: all 20 tools declare `outputSchema`, return `structuredContent`, and carry `{readOnlyHint, idempotentHint, openWorldHint}` via a shared constant (`src/shared/tools.ts:6-10`).
- Best-in-class pagination: opaque base64url cursors binding data version + offset + sha256 query fingerprint (`src/shared/tools.ts:39-130`); live probes confirmed valid continuation, cross-tool cursor rejection, and stale-data-version detection.
- Correct error taxonomy throughout: `isError` tool results with recovery guidance for domain misses, SDK `-32602` for validation, `-32002` with `data.uri` plus did-you-mean suggestions for resource misses — the critique-2 contract, still holding.
- Prompts exist and are well-built on both servers (4 framework, 2 focus) with `completable()` arguments and embedded-resource messages (`src/servers/framework/prompts.ts`, `src/servers/focus/prompts.ts`); a rich resource surface (44+125 resources, 8 templates) with completions.
- Unofficial derivations are impossible to mistake for official content: `compare_versions`, `get_kpi_mapping`, and `calculate_kpi` all lead with UNOFFICIAL and name their derivation method; token-cost guidance in descriptions (`get_capability`, `get_kpis`) is unusually good.
- All inline description examples resolve at default parameters, partly test-pinned (`src/servers/focus/server.test.ts:168-174`).

**Architecture and tests**

- Layering is enforced, not aspirational: `eslint.config.js:12-56` blocks cross-layer imports; `src/workers/fs-boundary.test.ts` walks the real import graph to prove the Worker is `node:fs`-free.
- Genuine shared-core extraction (pagination, footer, search, fuzzy slugs, direct-run, markdown primitives) leaves only one 16-line duplicated helper between the two server stacks.
- Tests are behavioral: 99 server cases drive a real MCP client over `InMemoryTransport` against the committed artifact; parser regressions pin verbatim spec text; `bundle-data.test.ts` fails CI if `data/` drifts from the Worker bundle.
- The committed artifact is integrity-guarded (schema + sha256 manifest, `src/shared/artifact.test.ts`), substantially containing the untested-derive-pipeline gap.
- Transport hygiene: stderr-only banner, no stray `console.log`, Worker validates `MCP-Protocol-Version`, spec-valid stateless Streamable HTTP, correct Origin allowlist + CORS preflight.

**Launch mechanics**

- All gate-4 fixes verified still live: nested EffectiveCost MUSTs, CC BY footers, OPTIONS preflight with ACAO echo, accurate `docs/deploy-worker.md`.
- README tool tables exactly match live `tools/list` on both servers; both packages coherent at 1.0.0 with matching `server.json` manifests, `mcpName` fields, and working `--version` binaries.
- The `finops-focus-mcp` rename is complete, owner-decision-recorded (`decisions.md:404-413`), with zero stale `focus-spec-mcp` references in live code or metadata.
- Package-level licensing posture is thorough: `packages/finops-focus-mcp/NOTICE.md` covers spec text, samples, modifications, and no-endorsement; per-record `license`/`source_url` fields embedded in the data.
- `docs/eval-results.md` and `.agents/memory/activeContext.md` are exemplary, honest records — the eval log annotates old failures instead of rewriting history.

---

## Confirmed findings

Deduped across lenses; verification verdicts applied (L1 and DOC-2 merged — same defect). No BLOCKERs.

### MAJOR

#### M1. Root README presents the shipped FOCUS server as future roadmap and omits the Worker and demo entirely

_(launch-readiness L1 + docs-coherence DOC-2, merged; both independently CONFIRMED at MAJOR)_

- **Evidence:** The root README's only FOCUS mention is `README.md:134-139` — a Roadmap paragraph saying the layout "leaves room for sibling servers (e.g. a FOCUS specification server: src/crawlers/focus, src/servers/focus, data/focus/)" — while all three paths exist and ship today as `finops-focus-mcp` 1.0.0. Grep confirms zero README hits for the Worker, demo, or remote HTTP; `docs/deploy-worker.md` is unreferenced. `README.md:144` cites only critique-1/2 though four adversarial reviews exist. This file is the npm page for `finops-framework-mcp` (root `package.json` files array) and both `server.json` manifests (line 7 in each) point `repository.url` here, so MCP-registry users of _either_ server land on a page that denies the FOCUS server exists. The hand-off is circularly broken: `packages/finops-focus-mcp/README.md:11-16` sends readers to "that repository for source, tests, and contribution docs."
- **Why MAJOR not BLOCKER:** purely discovery/documentation — the `finops-focus-mcp` npm page is itself accurate and self-sufficient, and both servers function regardless.
- **Fix:** Add a "Sibling server: finops-focus-mcp" section linking `packages/finops-focus-mcp`; rewrite the Roadmap paragraph to past tense; add lines for the Worker remote endpoints (`docs/deploy-worker.md`) and `demo/`; extend the critique list at `README.md:144` to critique-3/4. A few paragraphs, zero code risk.

#### M2. Root NOTICE.md and README license section omit CC BY 4.0 attribution for `data/focus/**`

_(launch-readiness L2; CONFIRMED at MAJOR)_

- **Evidence:** `git ls-files data/focus | wc -l` → 135 tracked files, including verbatim FOCUS spec prose (`data/focus/1.2/columns/billedcost.md`) and the official sample CSV (`data/focus/samples/1.0/official/focus_sample.csv`). Root `NOTICE.md` (52 lines) attributes only `data/framework/**` (lines 3-32) and the crawler fixture CSV (lines 34-46); `grep 'data/focus' NOTICE.md` → zero matches. Worse, `NOTICE.md:18-20` affirmatively states "the crawled content under data/framework/** remains CC BY 4.0" (implying everything else is MIT), and `README.md:128-132` scopes CC BY 4.0 the same way. Root NOTICE.md was last modified before the FOCUS data landed; no prior critique covers this gap.
- **Why MAJOR not BLOCKER:** correct attribution for byte-identical content exists in-tree (`packages/finops-focus-mcp/NOTICE.md:3-45`) and per-record `license: 'CC-BY-4.0'`/`source_url` fields embed provenance — this is a misleading scope statement on the canonical audit surface, not absent attribution. But a downstream redistributor reading root LICENSE/NOTICE/README would conclude `data/focus` is MIT and strip attribution, on FinOps Foundation content, in a repo going public.
- **Fix:** Transplant a "FOCUS specification text and sample data (CC BY 4.0)" section from the package NOTICE into root `NOTICE.md` (covering `data/focus/1.0`, `1.2`, `samples/1.0/official`), and widen `README.md:130-132` to "Framework and FOCUS content in `data/framework/**` and `data/focus/**`: CC BY 4.0."

### MINOR

Nineteen confirmed MINORs, grouped by theme. Three (†) were filed as MAJOR and downgraded under adversarial verification — the downgrade rationale is noted inline.

**Downgraded under verification**

1. **† Offline derive/crawl orchestration has zero test coverage** _(architecture R1)_ — `src/crawlers/framework/cli.ts` 0% covered (lines 71-573), `deriveFromDocs` (`markdown/derive.ts:405-479`) never executed by any test, focus `cli.ts`/`ingest.ts` also 0%; no gate invokes `cli.js derive`. Downgraded because launch users consume the _committed_ artifact, which is schema+sha256-gated on load (`src/shared/artifact.test.ts:96-114`), the path was verified byte-identical-idempotent live, and a bad regeneration must survive both gates and diff review. **Fix (post-launch):** one integration test running `deriveArtifactPayload` against `data/framework/content/markdown` and asserting equality with the committed JSON.
2. **† MEMORY.md frozen at v0.1** _(docs-coherence DOC-1)_ — `.agents/memory/MEMORY.md:12-14,30-31` still says "v0.1 built... two critique gates," "Current focus: Ship the v0.1 build PR," and lists the deleted "inferred edges" as a live invariant (`:21` vs `README.md:93-97`); zero mentions of the FOCUS server, Worker, or demo. Downgraded because only agent sessions read it, the same mandatory orientation pass co-loads the fully current `activeContext.md` plus `git log`, and the missing invariants have deterministic enforcement twins. **Fix:** rewrite via the `update-memory` skill — phase = v1 + finops-focus-mcp built, 4 gates passed, publish pending; add FOCUS/Worker invariants; drop "inferred edges."
3. **† `combined-scenario.xml` step 4 contradicts the T-045 fix** _(docs-coherence DOC-3)_ — `evals/focus/combined-scenario.xml:36` expects "1.2 mapping uses the identical column sets as 1.0," but live `get_kpi_mapping` for `consumption-versus-commitment` @1.2 returns `CommitmentDiscountQuantity`/`CommitmentDiscountUnit` with the rewritten caveat. Downgraded because the demo mirrors only request builders (never `<expected>` prose), the server is the _correct_ side, and T-045's `server.test.ts` assertions block regression. **Fix:** rewrite step 4's `<expected>` to match the shipped column sets and caveat, so the next graded run doesn't report a phantom regression.

**MCP polish** _(mcp-conformance)_

4. **Text/structured pagination parity landed only on `get_kpis`** _(MCP-1)_ — `list_capabilities` and `list_columns` text blocks carry no "Showing X of Y" note or cursor (live-verified); `search_framework` includes total but not cursor. Fix: apply the `get_kpis` text pattern to every paginated tool (`src/servers/framework/tools.ts:213-270`). Mitigated today: default limits return full lists.
5. **Worker GET opens an eternal silent SSE stream; DELETE returns 200** _(MCP-2)_ — live probe: GET with `Accept: text/event-stream` → 200, stream held open forever despite per-request stateless servers (`src/workers/app.ts:58-64`); only PUT is 405-tested (`app.test.ts:198-202`). Spec-permits 405 here. Fix: short-circuit GET/DELETE with 405 and add worker tests.
6. **`listChanged:true` advertised despite documented immutable-artifact contract** _(MCP-3)_ — live initialize on both servers returns `listChanged:true` for tools/resources/prompts (SDK forces it), contradicting `src/servers/framework/server.ts:20-23`. Fix: correct the comments or suppress the flag if the SDK allows.
7. **No focus prompt for the flagship KPI workflow** _(MCP-4)_ — `get_kpi_mapping`/`calculate_kpi` are the server's most caveat-laden tools yet have no guided prompt (`src/servers/focus/prompts.ts` registers only two). Fix (v1.1): add a `map-kpi-to-focus-columns` prompt mirroring the existing pattern.

**Tool descriptions** _(tool-naming)_

8. **`list_capabilities` prose invites the silently-dropped `domain_slug` param** _(TN-1; critique-3 residue, still live)_ — description says "filtered by domain slug" but the param is `domain` (`src/servers/framework/tools.ts:203` vs `:208`); live call with `domain_slug` returned all 22 unfiltered, no error. Fix: one string edit spelling the exact param names.
9. **`assess_maturity_path` has zero param descriptions and an off-convention verb** _(TN-2; critique-3 residue, still live)_ — only tool on the 20-tool surface with no `.describe()` on any param and no cross-reference to overlapping `get_maturity_assessment` (`tools.ts:678-687`). Fix: add param descriptions and the cross-reference; rename only with owner approval.
10. **Hardcoded corpus counts in four descriptions will silently go stale** _(TN-3)_ — "22 capabilities," "88-entry library," "43 in 1.0, 57 in 1.2," "14 added, 0 removed, 43 changed" are string literals (`framework/tools.ts:545,203`; `focus/tools.ts:307,568`), all currently accurate but unguarded. Fix: interpolate from the loaded artifact (the focus server already does this for version lists) or pin via test.

**Architecture periphery** _(architecture)_

11. **Worker deploy entry untested** _(R2)_ — `src/workers/index.ts` (`parseAllowedOrigins`, env wiring) and `data.ts` (`loadWorkerData` Map rehydration) at 0% while `app.ts` is 100%; a `parseAllowedOrigins` bug would surface only as production-only CORS failures. Fix: ~20 lines of pure-function tests.
12. **Stale `endsWith("cli.js")` direct-run guard** _(R3)_ — `src/crawlers/framework/cli.ts:569` retains the exact fragile pattern `src/shared/direct-run.ts` was built to eliminate; all five sibling entry points migrated. Fix: replace with `isDirectRunOf(import.meta.url)`.
13. **Byte-identical `notFound()` helper duplicated across both servers** _(R4)_ — 16 lines implementing the cross-server -32002 contract copy-pasted (`framework/resources.ts:23-42` = `focus/resources.ts:18-37`). Fix: hoist into `src/shared`; existing typo tests pin behavior.
14. **Dead code: `parseOverview()` and template `greet()` scaffold** _(R5)_ — `parse/sections.ts:214-225` has no non-test caller; `src/index.ts:9-11` greet exists only for `tests/index.test.ts`. Fix: delete both.
15. **`demo/` sits outside every quality gate** _(R6)_ — prettier/eslint/tsc all scope to `src`+`tests`; `npx prettier --check demo` fails on 3 files today. Fix: add demo to the format gate target and run `--write` once. Note: gate-command edits touch `agentic.config.json`, a protected path — route as an explicit owner-approved task.

**Public-repo hygiene** _(launch-readiness, docs-coherence)_

16. **No SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT, or issue templates** _(L3)_ — `.github/` has only CODEOWNERS, PR template, rulesets, workflows; the focus package README even promises "contribution docs" here. Fix: minimal SECURITY.md (most valuable), short CONTRIBUTING.md pointing at AGENTS.md/gates, one issue template.
17. **npm metadata gaps; engines>=20 untested** _(L4)_ — neither `package.json` has `author`/`homepage`/`bugs`; both declare `engines.node >=20` but CI pins node 22 only (`ci.yml:65,105`). Fix: add the three fields pre-publish (cheap); add a node-20 CI leg or bump engines to >=22.
18. **Worker's no-auth/no-rate-limit posture undocumented as deliberate** _(L5)_ — defensible for stateless read-only public data, but `docs/deploy-worker.md` never says so nor points at Cloudflare rate-limiting. Fix: two sentences in "Notes / limits."
19. **architecture.md and AGENTS.md still frame FOCUS/HTTP as future work** _(DOC-4)_ — `docs/architecture.md:44-45,240-241,353-354` and `AGENTS.md:5-13` describe a one-server, stdio-only project. Fix: "Now built" pointers and a one-sentence project-description extension.

---

## Launch next steps

### MUST land before public repo / npm / registry publish

- [ ] **M1 — Rewrite the root README to match shipped reality:** sibling-server section linking `packages/finops-focus-mcp`; Roadmap paragraph to past tense; Worker endpoints (`docs/deploy-worker.md`) and `demo/` mentioned; critique list at `README.md:144` extended to critique-3/4. _(Owner of both registry landing experiences.)_
- [ ] **M2 — Fix root licensing scope:** transplant the FOCUS CC BY 4.0 section from `packages/finops-focus-mcp/NOTICE.md` into root `NOTICE.md`; widen `README.md:130-132` to cover `data/focus/**`. _(License-compliance surface for a public repo redistributing Foundation content.)_
- [ ] Re-run `./scripts/agentic gates --tier full` after both edits and confirm the working tree is clean before flipping public.

Strongly recommended to ride along (one-line edits, near-zero risk, improve day-one impressions): TN-1 (`domain_slug` prose fix), L4 (`author`/`homepage`/`bugs` in both package.json files), and #16's SECURITY.md.

### Post-launch backlog (ranked)

1. Derive-pipeline idempotence test — run `deriveArtifactPayload` against `data/framework/content/markdown`, assert equality with committed JSON (#1); add `parseAllowedOrigins`/`loadWorkerData` tests (#11). Together these close every 0%-coverage runtime/tooling gap.
2. Text-pagination parity across all paginated tools (#4); Worker 405 for GET/DELETE with tests (#5).
3. MEMORY.md rewrite via `update-memory` (#2); fix `combined-scenario.xml` step 4 (#3); architecture.md/AGENTS.md "now built" updates (#19); correct or suppress `listChanged` (#6).
4. `assess_maturity_path` param descriptions + cross-reference (#9); interpolate or test-pin hardcoded corpus counts (#10).
5. Bring `demo/` under the format gate (owner-approved task — protected path) (#15); hoist shared `notFound()` (#13); replace the stale `endsWith` guard (#12); delete dead code (#14).
6. CONTRIBUTING.md + issue templates (#16); node-20 CI leg or engines bump (#17); Worker posture sentences in deploy docs (#18).
7. v1.1 feature: `map-kpi-to-focus-columns` guided prompt on the focus server (#7).

---

_Review inputs: five lens reviews with live stdio/Worker probe transcripts; adversarial verification transcripts for all MAJOR+ findings; docs/critique-1 through critique-4 consulted to exclude already-fixed items._
