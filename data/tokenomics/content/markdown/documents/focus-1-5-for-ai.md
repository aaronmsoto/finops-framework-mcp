---
author: Matt Cowsert
kind: project
license: CC-BY-4.0
modified: 2026-09-21
slug: focus-1-5-for-ai
source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
status: Status as of 17 Sep 2026
status_date: 17 Sep 2026
status_source: page
title: What 1.5 does for AI cost, and what it does not
word_count: 4698
---

# What 1.5 does for AI cost, and what it does not

## Overview {section=overview}

FOCUS Working Group / Release 1.5

Every AI-related item in the FOCUS 1.5 release, sorted by how likely it is to ship. Buckets 1 and 2 are the release story: merged into the working draft, or in review and moving through the release gates. Bucket 3 is work that has started with no decision yet on whether it lands in 1.5. Bucket 4 is the answer to "why isn't X in there." FOCUS is the FinOps Open Cost and Usage Specification, an open standard for cloud, SaaS, and AI billing data supported by the FinOps Foundation; the specification and its adoption resources are at focus.finops.org.

Prepared by Matt Cowsert Status as of 17 Sep 2026 Ratifies 3 Dec 2026 Announced Dec 2026

What 1.5 delivers for AI

Merged into the working draft, or in review with a pull request moving through the release gates.

- **Cost data names the model.** Which model ran, who built it, and which version are recorded the same way regardless of which provider sent the bill. Merged
- **Cache economics become visible.** Tokens served from cache separate from tokens processed fresh, and input separate from output, declared on the price itself. A rising bill from a falling cache hit rate becomes distinguishable from one driven by more traffic. In review.
- **Worked examples for AI billing.** Six scenarios showing how to turn a token or generation bill into FOCUS, including capacity bought up front and drawn down, a model served first-party by a cloud provider, and a multi-model marketplace invoice. In review.
- **Cost rows name who spent it.** A Principal ID column is merged; Requester Details and Credential ID are in Member review. A charge can be attributed to the person, service account, or automated agent behind it rather than landing in one pool. Partly merged
- **Model rates become readable before purchase.** A published price catalog, so a planned workload can be priced from published token rates and the rate already being paid can be tested, rather than reconstructed after the invoice. In review.
- **Prepaid tokens and credits get a consistent home.** The currency attribute is being scoped so provider-issued units such as token bundles and platform credits are handled as consumption currency instead of falling out of cost reporting. In review.

Started, not yet certain

Real work with an open question over whether it lands in 1.5 or the next release. Not promised for December.

- **Global and region-pinned serving separate.** A pricing region scope property, the one AI cost dimension that is a rate question and a data residency question at the same time. TF-2 sent it to the Open Forum of 18 September; it moves to 1.6 if it is not settled there.
- **A FinOps Foundation paper on FOCUS for AI.** The narrative case for people who will not read column definitions. On hold since August until dedicated FOCUS-for-AI staff can take it up, and not tied to the release date.

Detail in bucket 3: FR 2414 and Action Item 1857. The other AI price dimensions filed this year, reasoning tokens, cache storage, input modality, inference tier, context window, provisioned throughput, and layered subcategories, did not enter the 1.5 window and sit in bucket 4.

Everything above assumes the work clears Task Force and Member review before the 3 December ratification. The first list is the release story as it stands today; the second is open, not forecast.

Terms used here

Token

The unit AI models bill on, roughly a fragment of a word. Input tokens are what you send the model, output tokens are what it sends back, and they are usually priced differently.

SKU

The specific thing being bought, at the granularity the provider prices it. A given model at a given rate is a SKU.

SKU price detail

A set of attributes describing what a priced item actually is. Model name, family, and version live here, and the cache and direction properties in review join them, which is why none of it needed new columns.

Meter

What is being counted on a charge line, such as input tokens or output tokens. It is how a bill distinguishes two charges for the same model.

Prompt cache

A provider feature that stores part of a prompt so repeated tokens are served from cache at a lower rate. Writing to the cache and reading from it are often priced separately, and some providers also charge for holding the cache over time.

Drawdown

Capacity bought up front and consumed over time. The purchase and the usage land on different lines, which is why it needs explicit treatment.

Working draft

The live version of the specification between releases. Merged work sits there until 1.5 publishes in December.

Feature request (FR)

A proposal filed in the FOCUS repository for a change to the specification. The numbers on this page are GitHub issue and pull request numbers.

Task Force

The subteam that owns an item. TF-1 covers pricing and the SKU Price dataset, TF-2 covers AI and allocation, TF-RM covers the Requirements Model, and F2 is the FinOps Foundation.

Supported feature

A documented use case in the specification, with the columns it depends on and example queries that show the data answering it.

Operating model condition

A documented fact about how a data generator operates, such as whether it publishes unit prices, that decides whether a Conditional column or dataset must be present.

Enabler

An item on this page that is not AI-specific but that the AI story depends on. The toggle above the cards hides them.

Member review

The second review gate, where the full working group membership reviews a pull request after its Task Force has approved it. Member approval is what merges it into the working draft.

Gate schedule

FOCUS 1.4

Published

current release

Start TF review

Sep 10

passed

Start Member review

Sep 24

next gate

Member approval

Oct 8

PRs approved

Consistency review

Oct 29

then IPR review

Ratified

Dec 3

WG and SC vote

Announced

Dec

Virtual Summit

The 1.5 working draft is in its review gates now. Pull requests had to start Task Force review by 10 September, must start Member review by 24 September with one approval on their latest commit, and must complete Member approval by 8 October. A three-week consistency review follows, then a 30-day intellectual property review. The working group approves and the Steering Committee ratifies on 3 December, and the public announcement is planned for the December Virtual Summit, with the publication date confirmed in December.

**How to read the buckets.** They are sorted by release confidence, not by importance. An item in bucket 3 may matter more to FinOps Practitioners than one in bucket 1; it simply has less certainty of shipping in this release.

        Show enablers

No items match that filter.

1

## In the working draft {section=in-the-working-draft}

Merged. These ship in 1.5 unless something is pulled during the consistency review, which is rare.

Merged 20 Jul FR 2018 Detail +Detail −

Cost data can now say which model was billed and who built it.

owner Matt Cowsert group TF-2

#### What it adds

Four FOCUS-defined properties on `SkuPriceDetails`: `ModelDeveloper`, `ModelFamily`, `ModelId`, and `ModelVersion`. No new columns, and no change to the existing `SkuPriceDetails` requirements, so this is additive for every data generator.

It also lands a worked appendix example with two scenarios and backing CSV data: a model purchased directly from its developer, and the same model resold by a cloud provider as a first-party service. The second scenario is the one practitioners get wrong today, because the service provider and the model developer are different companies.

#### A deliberate omission, since revisited

The input versus output token split shipped structurally, as separate SKUs distinguished by `SkuMeter`, rather than through a dedicated property. The cached-token work in review (bucket 2) adds a `TokenDirection` property, so the split can also be declared on the price itself.

#### Why it matters

This is the piece that makes multi-provider AI spend comparable. Without it, an organization can say it spent a given amount on models last quarter but cannot break that down by model without provider-specific parsing.

FR 2018 PR 2442

Merged 10 Sep FR 2358 Detail +Detail −

Cost rows can identify the principal that drove the spend.

owner Matt Cowsert group TF-2

#### What it adds

A `PrincipalId` column on the Cost and Usage dataset, identifying the principal: the user, service account, or other entity in an identity and access management model that was granted access to the resource or service. It preserves a principal-level audit trail across PaaS, SaaS, and generative AI billing. The actor columns are delivered incrementally: Requester Details and Credential ID follow in Member review (bucket 2).

#### Why it belongs in the AI story

This is the attribution primitive behind per-user and per-agent cost. As spend shifts from provisioned infrastructure to per-call model invocations, the question changes from "which account owns this instance" to "which developer, team, or autonomous agent burned these tokens." `PrincipalId` is what makes that answerable inside billing data rather than by joining to observability. The AI billing examples in review populate it.

FR 2358 PR 2360

Merged 10 Sep Enabler FR 2377 Detail +Detail −

Service category definitions no longer assume cloud, and Compute now tells bare metal from virtual machines.

owners Shawn Alpay, Irena Jurica group TF-1

#### What it changes

In July, the `ServiceCategory` descriptions that referred to "cloud" were rewritten so they apply equally to hybrid, SaaS, and on-premises environments (Action Item 2378). In September, the Compute category description picked up physical compute and the Virtual Machines subcategory split into Bare Metal and Virtual Machines. The feature request closed as complete on 17 September. A broader expansion of the allowed values for on-premises, SaaS, and physical infrastructure (PR 2518) remains a draft and is not part of 1.5.

#### Context for AI

An "AI and Machine Learning" service category already exists, with subcategories for AI Platforms, Bots, Generative AI, Machine Learning, Natural Language Processing, and "Other (AI and Machine Learning)". This work removes the cloud-only framing around it, which mattered because a large share of AI spend now arrives from vendors that are not cloud providers, and it lets GPU capacity bought as bare metal classify apart from virtual machines. Deeper AI subcategories (FR 1943) did not enter 1.5 and sit in bucket 4.

FR 2377 PR 2379 PR 2624 Action Item 2378 PR 2518

2

## In review {section=in-review}

Open pull requests in Task Force or Member review. Expected in 1.5, and each card says what is left, including whether the approvals sit on the current commit. The next gate is 24 September, when a pull request needs one approval on its latest commit to start Member review.

Member review FR 2099 Detail +Detail −

Separate tokens served from cache from tokens processed fresh, and input from output, on the price itself.

owner Matt Cowsert group TF-2

#### The problem it answers

Cached and uncached tokens can differ in price by an order of magnitude at the same provider. Without the distinction, a rise in token cost cannot be separated from a fall in cache hit rate, so the single most actionable AI optimization lever is invisible in cost data.

#### What it adds

Two FOCUS-defined properties on `SkuPriceDetails`, each with allowed values and no new columns. `TokenCacheAction` carries "Uncached", "Read", "Write", or "Other" on SKU prices that meter tokens consumed from a request. `TokenDirection` carries "Input" or "Output" on token-metered SKU prices whose tokens share a direction, so a SKU that bills both on one meter omits it. They replace the single `TokenType` property drafted earlier and are the first FOCUS-defined properties to carry allowed values. One requirement stops a cached token being counted twice: consumed quantity on an "Uncached" row excludes tokens counted on a "Read" or "Write" row. A footnote marks the edges: reasoning tokens carry "Output", and modality, reasoning effort, cache retention duration, and context window size are not values of these properties. A glossary entry separates token as a unit of measure from token as a store of value. An "AI Prompt Caching" appendix example with two scenarios and CSV data ships with it, plus two queries under the Resource Usage supported feature: cache hit rate for token-metered SKUs, and the input-to-output token ratio by model.

#### Where it stands

The two-property shape was decided by TF-2 on 2 September and merged into the pull request on 15 September. It moved to Member review on 17 September, with an approval on its current commit and two on earlier ones. Open: the two property descriptions are being rewritten, and whether "Uncached" becomes "None" and whether output-token rows carry a cache action at all. A cache cost efficiency query drafted for the Cost Comparison supported feature came out before Member review, to return once the SKU Price dataset and these properties have been tested together.

FR 2099 PR 2606

Task Force review FR 1941 Detail +Detail −

Worked examples showing how to map token and generation billing from any AI provider into FOCUS.

owner Larry Advey group TF-2

#### The problem it answers

The gap is not the schema. FOCUS already has the columns needed to carry token consumption. The gap is that practitioners cannot tell how those columns apply to AI billing, so every provider gets normalized differently.

every single one has a different data formatBecky Canterbury, Shutterstock, on working with 20-plus AI vendors

Requested by NatWest, SLB, UK Government Digital Service, Shutterstock, Syngenta, Anglepoint, AWS, and the FinOps Foundation.

#### What it delivers

No columns are added or changed. An "AI Billing" appendix section with six scenarios, each backed by a CSV: a foundation model billed per token by its developer; capacity bought up front through a prepayment and drawn down by usage, so billed cost is zero on usage rows and effective cost reflects consumption; a foundation model invoiced through a cloud provider marketplace, which also covers cached tokens; a multi-model invoice through that marketplace; multi-model usage; and a foundation model served first-party by a cloud provider. An "AI Billing" supported feature with two example SQL queries registers alongside. Token direction is carried per SKU through `SkuMeter`, consistent with the model identity examples, and the rows populate `PrincipalId`.

#### Where it stands

TF-2 confirmed on 16 September that it stays in 1.5. Dave Moreau and Graham Murphy joined the author on it, and the work is due to finish over the following three weeks. Six findings posted in that session on the newest scenarios, including two conformance errors in the drawdown example, are being fixed. It holds one approval, on an earlier commit, and sequences behind the cached-token pull request so the examples use its property names, with a custom property allowed where the examples need to say more. The examples may keep improving during Member review as long as the data shape holds.

FR 1941 PR 2605

Member review FR 2358 Detail +Detail −

Requester Details and Credential ID complete the actor columns.

owner Matt Cowsert group TF-2

#### What it adds

Two more Cost and Usage columns beside the merged `PrincipalId`. `CredentialId` identifies the credential presented on the request that produced the charge: an identifier that references a credential, never a value that authenticates one. `RequesterDetails` is a JSON array of key-value entries carrying descriptive attributes, `Type`, `Name`, and `Email`, for the principal and the credential, with further levels such as a delegating identity as custom entries of the same shape. An entry appears only when its identifier is populated, and a published schema pins the keys.

#### The July question, resolved

The open decision on the last edition of this page, whether identity attributes ship alongside `PrincipalId` or wait, closed in August. The attributes ride in `RequesterDetails`, keyed to the identifiers, rather than in a separate identity column. The model covers a person, a service account, or an automated agent acting through one, which is the shape agentic spend takes.

#### Where it stands

Approved by four reviewers, two of them on the current commit, and in Member review since 17 September. Not in it: a Consumer ID column (PR 2495) is postponed and not part of 1.5, and scoped detail configuration, which would let practitioners choose how much actor detail a dataset carries, moved to 1.6 on 16 September (bucket 4).

FR 2358 PR 2553 PR 2495

Task Force review Enabler FR 1057 Detail +Detail −

A published price catalog, which is where model identity actually lives.

owner Shawn Alpay group TF-1

#### What it adds

A new SKU Price dataset, carrying prices independently of consumption, so a rate can be read before anyone buys, with the window it applies in and the accounts eligible for it.

#### Where it stands

Two decisions landed in September. The dataset is Conditional: a data generator must publish it only if it publishes unit prices, the same operating model condition that already governs the four Cost and Usage columns pointing into it. That was settled on 15 September. And its two unit price columns collapse into one, so a list price and a contracted price each get their own row, confirmed by TF-1 the same day. That reshape is being applied now and resets approvals, so the pull request needs fresh approval on the new head before it can start Member review. The two SKU Price supported features (PR 2595) are approved on their current commit and wait on the reshape; the consumption currency scoping (PR 2617) is the next card.

#### The connection to AI

The model-identity properties in bucket 1, and the cache and direction properties in review, all describe a SKU price rather than a usage row. This dataset is where an organization reads a provider's token rates before spending, prices a planned workload against them, and tests what a negotiated rate is worth. It is the difference between reporting on AI cost and negotiating it.

FR 1057 PR 2424 PR 2595

Member review Enabler PR 2617 Detail +Detail −

Prepaid tokens and provider credits handled as consumption currency.

owner Matt Cowsert group TF-1

#### What it does

The review of how tokens, credits, and crypto are treated as virtual currency (Action Item 2550, closed 18 August) found the `CurrencyFormat` attribute contradicting itself: it lists virtual currency as an allowed currency type while requiring an ISO 4217 code for every value, and no provider-issued unit has one. The pull request scopes the virtual currency allowance to consumption currency and carries the scoping through to the examples.

#### Where it stands

In Member review with one change request outstanding, and a review on 16 September raised one normative point: the broadened virtual currency definition would also cover cryptocurrency, which needs scoping. The glossary text is shared with the SKU Price dataset, so the two move together.

#### Why it matters for AI

A large share of AI spend is transacted in something other than a national currency. Buyers purchase token bundles or platform credits up front and draw them down. If FOCUS treats those units inconsistently, prepaid AI spend either disappears from cost reporting or double counts against the cash that bought it. This work and the prepayment drawdown example in FR 1941 address two halves of the same problem.

Action Item 2550 PR 2617

3

## Started, not yet certain {section=started-not-yet-certain}

Work has begun on these, and whether they land in 1.5 is still open. Nothing here is promised for December.

Open Forum 18 Sep FR 2414 Detail +Detail −

Distinguish globally served models from region-pinned ones.

owner Matt Cowsert group TF-2

#### The problem it answers

Global and regional serving carry different rates and different data residency characteristics. This is one of the few AI cost dimensions that is simultaneously a finance question and a compliance question, which makes it awkward to leave undeclared in billing data.

#### Where it stands

A `SkuPriceDetails` property carrying the pricing region scope. PR 2613 introduces it as `ServingScope` and holds two approvals; PR 2667, stacked on it, renames it to `RegionScope`, the name the working group's research recommended, adopted on 17 September. TF-2 sent the property to the Open Forum of 18 September; if it is not sufficiently complete after that, it moves to 1.6. Consistency with the SKU Price columns being introduced is the other check.

FR 2414 PR 2613 PR 2667

On hold Enabler Action Item 1857 Detail +Detail −

A FinOps Foundation paper on FOCUS for AI, sitting outside the specification itself.

group F2 state On hold since 4 Aug

#### What it is

Supporting content rather than a specification change. It is the narrative piece that explains the position to an audience that will not read column definitions.

#### Where it stands

On hold since 4 August. The FinOps Foundation chose to wait for the Task Force staff dedicated to FOCUS for AI to work on it, and moved its date to 31 October. It is not tied to the release date, so it may follow 1.5 rather than accompany it.

Action Item 1857

4

## Not in 1.5 {section=not-in-1-5}

Three groups live here. AI price dimensions filed this year that did not enter the 1.5 window, which fall out on timing alone and are the natural start of 1.6 scoping. Work moved to 1.6 by a decision during this cycle. And items ruled out on the merits, with reasons on the record.

Filed, not taken up in 1.5

1.6 candidate FR 2487 Detail +Detail −

Represent reasoning tokens, which are billed but never appear in the response.

Reasoning models charge for intermediate tokens the customer never sees. Finance teams reconciling an invoice against application logs find output token counts that do not match the bill, with no standard field explaining the gap.

Partly answered by the cached-token work in review, whose footnote states that reasoning tokens carry `TokenDirection` "Output", so the count reconciles as output. A property for reasoning effort is explicitly not among that work's values and remains open.

FR 2487

1.6 candidate FR 2488 Detail +Detail −

Represent the standing charge for keeping a context cache warm.

Context caching bills on two axes: the tokens processed, and the storage held over time. The second behaves like a storage charge rather than a usage charge, and it accrues whether or not the cache is read.

A contributor tabulated live prices in August on FR 2488 and showed storage and cache-read rates diverging under context tiering at the same provider, so a single meter cannot carry both. Cache retention duration is explicitly not a value of the new cache properties in review, so this stays its own piece of work.

FR 2488

1.6 candidate FR 2489 Detail +Detail −

Distinguish text, image, audio, and video inputs, which are priced on different units and rates.

Adds input modality classification along with recommended `SkuMeter` values. Multimodal traffic is billed per token, per image, per second of audio, and per frame, depending on provider and input type. Without a modality dimension, those units collapse into an aggregate that cannot be compared or forecast.

Modality is explicitly not a value of the new token properties in review. The classification and the recommended meter values are two jobs rather than one, which kept it outside the 1.5 window.

FR 2489

1.6 candidate FR 2521 Detail +Detail −

Distinguish model costs that vary by context window size.

Several providers price the same model differently above a context length threshold. The rate change is invisible in cost data today, so a cost increase driven by longer prompts is indistinguishable from one driven by more calls.

Context window size is explicitly not a value of the new token properties in review. Owner and Task Force are still unassigned.

FR 2521

1.6 candidate FR 2437 Detail +Detail −

Distinguish priority, standard, and batch inference, which carry different rates.

Batch and off-peak processing tiers are commonly discounted by half or more against real-time inference. Making the tier visible turns "move this workload to batch" from an intuition into a measurable saving, and lets an organization verify it actually happened. Confirmed in June as a standalone feature request rather than part of model identity.

FR 2437

1.6 candidate FR 2371 Detail +Detail −

Represent committed AI capacity the way other commitment discounts are represented.

Provisioned throughput is a commitment purchase, structurally similar to a reserved instance or savings plan. FOCUS already has a mature commitment discount model. The question is whether provisioned AI capacity maps onto it cleanly or needs its own treatment.

Of everything in this bucket, this is the one most likely to matter at the leadership level, because it is where committed AI dollars sit and where utilization against those commitments gets measured.

FR 2371

1.6 candidate FR 1943 Detail +Detail −

Deeper AI service subcategories, so AI spend can be analyzed in layers.

Extends the existing AI and Machine Learning subcategories to support layered analysis, separating the infrastructure an AI workload runs on from the model serving it from the application consuming it. Today those three layers can all land in one bucket, which is the reason "what did AI cost us" is hard to answer consistently across organizations. The Service Category work merged this cycle (bucket 1) removed the cloud-only framing but did not add AI layers.

FR 1943

Moved to 1.6 during the cycle

1.6 Detail +Detail −

Two actor-column follow-ons deferred by decision in September.

decided TF-2, 16 Sep 2026

- **Scoped detail configuration** (PR 2473). An extension of the Dataset Configuration attribute letting practitioners select optional, higher-cardinality detail, such as principal-level attribution, for documented areas of a dataset without every row carrying it. Moved to 1.6 with no objection; a simplified draft will be reposted for that cycle. Until then, column selection and the data generator's documentation govern how much actor detail appears.
- **`JsonObjectFormat` support for arrays** beyond what Requester Details needs: the attribute name, key uniqueness for array entries, and nesting rules become a 1.6 feature request.

PR 2473

Ruled out on the merits

Out of scope Detail +Detail −

Per-request maximum token limits alongside cost.

from FR 2018, third use case

Request-level configuration sits closer to observability than to billing, consistent with the feature request's own exclusion of telemetry. It was not routed to any of the parallel AI feature requests, so it is a deliberate stop rather than a deferral.

Out of scope Detail +Detail −

Tool or harness identity, meaning which tool produced the tokens.

decided TF-2, 8 Jul 2026

Ruled out of the first example pass. This is the one most likely to come back, because agentic tooling is where attribution questions are heading. It is a sequencing call, not a rejection of the concept. The Requester Details column in review can carry a delegating identity as a custom entry, which is the nearest home today.

Out of scope Detail +Detail −

Session and event identifiers.

decided TF-2, 8 Jul 2026

These are observability-side join signals with no FOCUS-defined home. Billing data does not carry them, and inventing a place for them inside FOCUS would put the specification in the business of describing application telemetry.

Superseded Detail +Detail −

Token type, input versus output, as a first-class column.

deferred TF-2, 15 Jul 2026 resolved TF-2, 2 Sep 2026

Deferred in July, then resolved differently. The split arrives as the `TokenDirection` property on SKU price details in the cached-token work in review, not as a column. The structural carry through separate SKUs and `SkuMeter`, which is what shipped with model identity, stays valid alongside it.

**A terminology note.** Inside the FOCUS repository, an issue prefixed "AI" is an Action Item, a unit of working-group work. It has nothing to do with artificial intelligence. Every such reference on this page is spelled out as "Action Item" to avoid the collision.

**Sources.** The FOCUS 1.5 milestone, the working-group board, merged commits on the working draft, and the Task Force 2 record of 16 September 2026. Status is live and moves weekly; this page reflects 17 September 2026 and supersedes the 28 July edition. The whole-release view, beyond AI, is the FOCUS 1.5 release scope page on focus.finops.org. Nothing here is a commitment on behalf of the working group.
