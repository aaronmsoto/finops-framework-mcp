# Spec: tokenomics-overview-mcp v1 — AI Tokenomics MCP server (third server)

Owner decisions 2026-09-25 (question round before overnight build): Foundation
pages on the default surface, curriculum behind the experimental flag; stated
cross-links by default, curated crosswalk experimental-only; third published
package, stdio only; design PR then stacked build PR. Design:
`docs/designs/tokenomics-overview-mcp.html`. If the two disagree, this wins.

## Problem

Agents using the framework and FOCUS servers can reason about FinOps
capabilities and billing columns, but have no grounded source for AI
tokenomics: the Five-Layer Stack, Big-T notation, prompt-caching mechanics
and metrics (Cache Hit Rate, Cache Cost Efficiency), consumption levers
(caching, routing, quantization, compression, bounds), personas, value
classification, and the FOCUS 1.5 AI work in flight. That guidance lives on
tokeneconomics.com as bespoke HTML pages in Working Draft / Release Candidate
status that change weekly, plus the owner's local cert-prep curriculum.

## Sources (verified 2026-09-25)

- tokeneconomics.com (WordPress, Tokenomics Foundation, LF Projects). Footer
  on every page: CC BY 4.0. robots.txt allows everything but /wp-admin,
  search. REST API is **discovery + metadata only** (most project bodies are
  one Custom HTML block or empty; te_page/asset have no content field) —
  bodies come from rendered HTML (`main#primary section.te-section[id]`,
  docs pages by h2). JSON-LD gives dateModified.
- Registry v1 (pinned in `src/crawlers/tokenomics/urls.ts`, 12 documents):
  what-is-tokenomics (docs, WD, Definition v0.5.2); five-layer-stack +
  five-layer-stack-paper; big-t-notation + big-t-notation-paper (WD);
  cache-explainer (RC1 2026-09-22); personas-operating-model (RC2);
  value-classification (RC2); focus-1-5-for-ai (status page);
  total-cost-of-ai (podcast ep.17 transcript); routing-wars (ep.16);
  what-tokenomics-is-and-isnt (newer 15-call version).
- Excluded: State of Tokenomics page/PDF (report is all-rights-reserved; the
  server may only cite figures that appear in included CC BY pages); assets
  whose canonical URL is off-site (Spotify/Apple/finops.org copies); the
  mind map (its YAML 403s); events/members/about; unlisted TSC and 101-draft
  pages (owner may add later — registry is data).
- Local (owner's cert-prep, private): `ai-tokenomics/` modules, PLAN.md
  glossary §3 and numbers register §4, sources.yaml, worksheets. Never
  committed to this public repo (see Curriculum overlay).

## Pipeline (same shape as framework/FOCUS)

`src/crawlers/tokenomics/cli.ts` subcommands:
- `refresh` — REST discovery (pages, te_doc, te_page, asset) → registry
  resolution (+ `unregistered` list of new on-site CC BY URLs in manifest) →
  CachedFetcher (origin tokeneconomics.com, robots honored, 1 req/s,
  `.cache/crawl-tokenomics`) → per-document cheerio parsers → sanitize
  (`scanForInjection`) → compose canonical markdown → derive JSON from that
  markdown → assess (pinned counts, parse budget) → ajv validate → emit.
- `derive` — offline JSON rebuild from `data/tokenomics/content/markdown/`.
- `import-curriculum --from <cert-prep>/ai-tokenomics --out <dir>` — builds
  the experimental overlay JSON locally (default `.cache/tokenomics-curriculum`).
Idempotent: unchanged content ⇒ byte-identical artifact; `crawled_at` only
in manifest; every document carries its page `status` + `status_date` +
`modified`.

## Data model (data/tokenomics/)

content/markdown/documents/<slug>.md (front-matter: slug,title,url,kind,
status,status_date,modified,author?,license; `## Heading {section=id}`) and
entity docs; content/*.json derived; derived/crosslinks.json (official);
derived/crosswalk.json (official:false); schema/; manifest.json.
Pinned counts (hard error on mismatch unless `--soft-counts`): documents 12,
stages 3, layers 5, bigt_classes 6, metrics 7 (cache-hit-rate,
cache-cost-efficiency, uncached-equivalent-cost, net-benefit, cost-per-token,
risk-expected-loss, ai-unit-economics), personas 12 (8 core + 4 allied),
value_categories 10, booking_destinations 5, cache_providers 3. Levers,
glossary terms, FOCUS-tracker items: minimum bounds. Every record carries
`{document, section, source_url, license: "CC-BY-4.0"}`; the publication
status lives on the document record and is rendered into every output
(single records via a status line, lists via a sources-and-status footer).

## Cross-links

- **Stated (default surface):** records `{from, target: {server:
  framework|focus|focus-working-draft, kind, id, uri?}, evidence, source_url}`
  where `evidence` is a quote that must appear verbatim in the composed
  document markdown AND names the target. Framework/FOCUS targets must exist
  in data/framework / data/focus (test cross-reads). FOCUS 1.5 working-draft
  items (TokenCacheAction, PrincipalId, SkuPriceDetails.Model*) get no URI.
  URIs duplicated as fixed public contracts (`finops://framework/...`,
  `focus://spec/{v}/columns/{slug}`), never imported across servers.
- **Curated crosswalk (experimental only):** official:false mappings
  (e.g. cache-hit-rate → framework usage-optimization) with a rationale.

## Server surface (src/servers/tokenomics, URI authority `tokenomics://overview`)

Default tools (all readOnly/idempotent, outputSchema-conformant, CC BY footer
naming the Tokenomics Foundation and the document status): get_tokenomics_info,
list_documents, get_document(document, section?), list_layers, get_layer,
get_bigt_notation, get_bigt_class, list_levers(layer?, bigt_class?,
document?), get_lever, list_metrics, get_metric, calculate_cache_metrics
(token counts + prices ⇒ Cache Hit Rate, Cache Cost Efficiency with the
official formulas; pure arithmetic, input-validated), get_provider_cache_snapshot,
list_personas, get_persona, list_value_categories, define_term,
get_focus_ai_tracker(status?), get_crosslinks(entity?, server?),
search_tokenomics. Experimental (`FINOPS_MCP_EXPERIMENTAL=1`/`--experimental`):
get_crosswalk; plus, only when `TOKENOMICS_MCP_CURRICULUM` points at an overlay,
list_curriculum_modules, get_curriculum_module, get_numbers_register. Prompts:
optimize_consumption, assess_prompt_caching, bigt_review. Resources for
documents, layers, bigt classes, metrics, personas, glossary, manifest.

## Curriculum overlay (experimental, never committed)

The owner's curriculum is private (site passcode-gated) and this repo is
public, so its text never enters `data/` or the npm tarball. The importer
emits overlay JSON to a local path; the server loads it only when both the
experimental flag and `TOKENOMICS_MCP_CURRICULUM=<dir>` are set, validates it
with ajv, and labels every output `official: false`, "cert-prep curriculum
(unofficial)". Slides keep their source lines and facilitator notes (which
mark module-original methods). Practice banks are never imported
(exam-integrity).

## Packaging

`packages/tokenomics-overview-mcp/` shim mirroring finops-focus-mcp (bin
`tokenomics-overview-mcp` → dist/servers/tokenomics/main.js, files
[dist, data/tokenomics, README, LICENSE, NOTICE], prepack
`scripts/pack-tokenomics.mjs`, mcpName
io.github.aaronmsoto/tokenomics-overview-mcp, server.json with
`TOKENOMICS_MCP_DATA` only — the experimental overlay variable is not
advertised, per decisions.md 2026-08-15). Version 0.1.0. The checked-in
`.mcp.json` gains the server only after it is on npm (fresh-clone rule);
`.mcp.json.example` gains it now.

## Acceptance criteria

- [ ] `refresh` against the live site produces data/tokenomics with the
      pinned counts; a second `refresh` from cache and a `derive` are
      byte-identical; artifact ≤1.5MB; fixtures make parser tests offline.
- [ ] Cache Hit Rate and Cache Cost Efficiency formulas in the artifact are
      built only from the cache-explainer's own formula text (stacked
      fractions linearized as `num / (den)`); `calculate_cache_metrics`
      reproduces a hand-computed fixture exactly and rejects negative/zero-
      denominator input with an error, not NaN.
- [ ] Every stated cross-link's evidence quote is found in its document and
      every framework/FOCUS target exists in the committed data (test).
- [ ] Default surface exposes no curriculum text and no crosswalk; flag-on
      exposes crosswalk; curriculum tools appear only with a valid overlay.
- [ ] Server tests: every tool in the outputSchema conformance list, not-found
      "did you mean", resources + completions, prompts.
- [ ] docs/mcp-surface.md regenerated with a tokenomics section;
      mcp-surface.test.ts covers it (and gated-absence).
- [ ] Shim tarball contains dist/servers/tokenomics + data/tokenomics, no
      framework/focus server or data, <1MB; packed bin prints
      `tokenomics-overview-mcp v0.1.0`; root and focus tarballs exclude it.
- [ ] evals/tokenomics/eval.xml (10 questions) + a three-server combined
      scenario; format/lint/typecheck/test/build green; coverage ratchet held.

## Non-goals

Worker/HTTP route and demo; State of Tokenomics content; unlisted pages;
committing curriculum text; editing protected paths (owner adds the
tests/version-sync case and publish.yml steps); publishing; a unified
cross-server process.

## Open questions

- Should the owner's own curriculum (authored, CC BY-derived) be published
  after all? v1 answer: no — local overlay only; flipping it is a data-path
  change, not a redesign.
- Include unlisted drafts (Tokenomics 101 draft's "four families" of
  optimization, TSC proposals) once the Foundation lists them?
