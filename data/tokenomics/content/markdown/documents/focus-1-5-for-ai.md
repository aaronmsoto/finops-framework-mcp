---
author: Matt Cowsert
kind: project
license: CC-BY-4.0
modified: 2026-10-07
slug: focus-1-5-for-ai
source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
status: 1.5 ratification 3 Dec 2026
status_date: 3 Dec 2026
status_source: page
title: What FOCUS 1.5 does for AI cost, and what it does not
word_count: 3941
---

# What FOCUS 1.5 does for AI cost, and what it does not

## Overview {section=overview}

FOCUS Working Group / Release 1.5

Every AI-related capability in FOCUS 1.5: what it lets you see in AI billing data, why it matters, and where it stands, followed by the AI cost dimensions that are not in this release. FOCUS, the FinOps Open Cost and Usage Specification, is an open specification supported by the FinOps Foundation that normalizes billing data from cloud, SaaS, AI, and other technology providers. The specification and its adoption resources are at focus.finops.org.

**Current published version** FOCUS 1.4 **1.5 ratification** 3 Dec 2026 **Public announcement** December 2026

The questions 1.5 helps answer

- Which models did we spend on, across providers?

  Cost data can name the model, its developer, family, and version, whether it was bought direct or through a cloud provider. Model identity

   In the working draft
- Is a rising AI bill more traffic, or a falling cache hit rate?

  Token prices can be labeled as read from cache, written to it, or uncached, and as input or output. Cache and direction

   In the working draft
- Which user, service account, or API key made the calls behind this spend?

  Cost rows can carry the principal and the credential on the request, with their published names and types. Requester attribution

   In the working draft
- Where do provider-issued credits show up?

  Credits and billing units a provider issues can be recorded as a consumption currency rather than forced into a national currency code. Consumption currency

   In the working draft
- How does a given provider's token bill map into FOCUS?

  Six worked scenarios with sample data, and an AI Model Billing supported feature with example queries. Billing examples

   In final review
- What would a planned AI workload cost at published rates?

  A SKU Price dataset publishes list and negotiated prices with their dates and tiers, before anything is consumed. Model identity reaches a catalog price through the Cost and Usage rows billed at it. SKU Price dataset

   In final review

**Not in 1.5:** region scope on prices, reasoning tokens as their own dimension, a dedicated treatment for cache storage, input modality, context window size, inference tiers, provisioned throughput, and deeper AI subcategories. What is not in 1.5, and why

How to read the status

In the working draft

Merged into the 1.5 working draft. Expected in the release; the consistency review can still make editorial changes, and the release is final at ratification.

In final review

An open pull request in Member review, the last review step. It joins the working draft when Members approve it. Work not approved by the 8 October Member approval deadline moves to the next release.

Not in 1.5

Postponed during this cycle, filed and not taken up, or set aside. Listed so the gaps are explicit.

Development timeline

1. Scope

  Oct 2025 to Apr 2026

  Feature requests prioritized for the release.
2. Development and review

  Apr to 8 Oct 2026

  Pull requests drafted, then reviewed by Task Forces and Members. Member approval closes on 8 October.
3. Consistency review

  8 to 29 Oct 2026

  Three weeks reading the full draft for consistency.
4. IP rights review

  2 Nov to 1 Dec 2026

  At least 30 days, during which members can exclude essential patent claims from their licensing commitments.
5. Approval and ratification

  3 Dec 2026

  The working group approves and the Steering Committee ratifies the same day.
6. Public announcement

  December 2026

  Publication date confirmed in December.

Terms used here

Token

The unit AI models bill on, a small piece of the content a model reads or writes. Each model decides how much content a token represents, so token counts do not compare directly across models.

Prompt cache

A provider feature that reuses previously processed input across requests. Reading from the cache, writing to it, and keeping content in it can each be priced differently.

SKU and SKU price

A SKU is the thing being bought, at the granularity the provider prices it, such as a model's input tokens. A SKU price is one price for it; a SKU can have several, such as a list price and a negotiated one.

SKU Price Details

A Cost and Usage column carrying properties that describe what a price is for. The model and token properties in 1.5 live here, which is why none of them needed new columns.

Meter

What a charge counts, such as input tokens or cached input tokens. Meter names vary by provider, which the 1.5 token properties normalize.

Principal and credential

A principal is the identity granted access, such as a user or service account. A credential is what authenticated a request, such as an API key or a session.

Drawdown

Capacity or credit bought up front and consumed over time. The purchase and the usage land on different rows.

Member review

The last review step, where the working group's Members review a pull request. Member approval merges it into the working draft.

Feature request and pull request

A feature request (FR) proposes a change to the specification; a pull request (PR) carries the proposed text. Both are public on GitHub and linked in each card's additional details.

Supported feature

A use case documented in the specification, with the columns it depends on and example queries that show the data answering it.

No capabilities match that filter.

## What 1.5 lets you see in AI billing data {section=theme-ai}

Token counts are not new: every version since FOCUS 1.0 carries them in Consumed Quantity and Consumed Unit. What 1.5 adds is the labeling that makes AI spend comparable across providers, attributable to whoever drove it, and recorded in the unit a provider prices it in.

In the working draft

### Cost data can name the AI model and who built it.

Four recommended FOCUS-defined properties in SKU Price Details record the model behind a charge: the developer that created it, the model family, the model identifier as billed, and the version. Developer, family, and version read the same way whether the model is bought from its developer or served by a cloud provider; the model identifier is recorded as each provider bills it.

**Why it matters.** This is the piece that makes multi-provider AI spend comparable. Without it, an organization can total what it spent on models last quarter but cannot break that down by model without provider-specific parsing.

Additional details

- The properties are `ModelDeveloper`, `ModelFamily`, `ModelId`, and `ModelVersion`.
- `ModelId` is the identifier as it appears in billing and can differ between providers selling the same model; family and version are as the model developer defines them.
- No columns are added and existing requirements are unchanged, so the change is additive for every data generator. Including these properties is recommended rather than required, so a conformant dataset can omit them.
- A worked example covers a model bought directly from its developer and the same model served by a cloud provider as its own service. In the second, the service provider and the model developer are different companies, and no existing participating-entity column names the developer.
- In the worked examples, input and output tokens are separate SKUs with their own meters; the token direction property below labels them on the price whatever the provider calls the meter.

FR 2018 PR 2442

In the working draft

### Cached tokens separate from uncached ones, and input from output, on the price itself.

Two recommended FOCUS-defined properties label token prices: how the tokens interacted with a prompt cache, and whether they went into the model or came out of it. They normalize cache and token meter names that differ from one provider to the next.

**Why it matters.** Cached input tokens often cost a fraction of uncached ones at the same provider; in the specification's worked example, a cache read costs a tenth of the input price. Without a common label, separating a fall in cache hit rate from a rise in traffic means matching each provider's meter names by hand, so one of the most actionable AI optimization levers is hard to track across providers.

Additional details

- `TokenCacheAction` takes "Uncached", "Read", "Write", or "Other" on prices that meter only tokens consumed from a request. `TokenDirection` takes "Input" or "Output" on prices that meter tokens in one direction. A price that bills several kinds of tokens on one meter omits the property that would misdescribe them.
- They are the first FOCUS-defined SKU Price Details properties with a fixed set of allowed values. Including them is recommended rather than required.
- A cached token counted on a "Read" or "Write" row is not counted again on another row, so token totals do not double count.
- Reasoning tokens metered separately carry "Output". Modality, reasoning effort, cache retention duration, and context window size are not values of either property.
- A worked example shows two providers that meter caching differently: one charges to write to the cache, the other charges to keep content in it. Charges for keeping cached content carry neither property.
- Two example queries join the Resource Usage supported feature: cache hit rate for token-metered SKUs by model, and the ratio of input to output tokens by model.
- The glossary adds AI model, prompt cache, and token, and separates a token as a unit of measure from a token as a store of value.

FR 2099 PR 2606

In final review

### Worked examples for mapping AI model billing into FOCUS.

Six worked scenarios, each with sample data, showing how token billing maps onto existing FOCUS columns, plus an AI Model Billing supported feature with example queries. No columns are added: FOCUS already has the columns to carry token consumption, and the gap these close is applying them the same way.

every single one has a different data formatA FinOps practitioner managing 20-plus AI providers

**Why it matters.** When FinOps Practitioners cannot tell how existing columns apply to AI billing, every provider gets normalized differently. Shared examples give data generators and practitioners one reference for the arrangements they meet most.

Additional details

#### The scenarios

- A model developer billing per token, directly.
- Several models on one invoice, each priced separately.
- Cached tokens bought through a cloud provider's marketplace, where the model developer is the seller and the cloud provider hosts and invoices.
- A cloud provider billing for its own service that serves a third-party model.
- A prepayment drawn down by token usage, the only scenario with committed-price usage rows.
- A multi-model invoice through a cloud marketplace, with cache meters.

#### How the rows are built

Consumed Quantity and Consumed Unit carry the raw token count; Pricing Quantity and Pricing Unit carry the same consumption in the block the provider prices against, such as per million tokens. SKU ID identifies the priced model offering and SKU Meter the token type. The rows use the model identity and token properties, and the requester columns where a principal or credential applies. The AI Model Billing supported feature adds two queries: effective cost per million tokens by SKU, token direction, and cache action, and token consumption over time.

Requested by NatWest, SLB, UK Government Digital Service, Shutterstock, Syngenta, Anglepoint, AWS, and the FinOps Foundation.

FR 1941 PR 2605

In the working draft

### Cost rows can name the principal and the credential behind an AI charge.

Three new Cost and Usage columns. Principal ID identifies the user, service account, or other identity granted access. Credential ID identifies the credential presented on the request, such as an API key or a session. Requester Details carries the attributes a provider publishes for each, such as a display name, type, and email address.

**Why it matters.** As spend shifts from provisioned infrastructure to per-call model invocations, the question changes from which account owns an instance to which developer, team, or automated agent used the tokens. These columns answer it inside billing data rather than by joining to observability.

Additional details

- Principal ID is the attribution dimension: grouping by it combines a user's or workload's charges however each request was credentialed. Credential ID is the audit dimension: it isolates the spend driven by one key or session.
- Neither ID column may contain a value that authenticates a request, such as the key string itself, and each is empty when the provider publishes no identifier.
- Neither column identifies who benefits from a charge. A shared workload, a gateway, or an embedded assistant can act for people who never appear in billing data.
- An agent appears when it acts under its own service account or key. Further levels, such as a delegating identity or a client application, can be carried as custom entries in Requester Details.
- A worked example walks through 14 scenarios, including a generative AI API key owned by a user, a key issued to a service account, a pipeline that opens a new session on every run, seat-based SaaS with per-token AI usage, and a provider whose keys are themselves the identity.
- The columns are `PrincipalId`, `CredentialId`, and `RequesterDetails`. All three are Conditional, governed by a new operating model condition for requester attribution.

FR 2358 PR 2360, Principal ID PR 2553, Credential ID and Requester Details

In the working draft

### Provider-issued credits can be recorded as a consumption currency.

The currency rules now recognize a consumption currency: a provider-issued unit such as platform credits or normalized billing units. ISO 4217 currency codes are reserved for national currencies.

**Why it matters.** Much AI usage is priced in a provider's own credits or billing units. The price can now be recorded in that unit, alongside the billed cost in national currency. Prepaid spend in a national currency is a different case. The worked examples in final review show one such arrangement: a token prepayment recorded as a commitment and drawn down by usage.

Additional details

The `CurrencyFormat` attribute previously allowed virtual currency while also requiring an ISO 4217 code on every value, which no provider-issued unit has. Now ISO 4217 applies when a value represents a national currency, and a column must not use an ISO 4217 code for anything else. A SaaS example shows a consumption currency pricing model.

Action Item 2550 PR 2617

In the working draft

### Common unit names for multimodal and agentic usage.

The recommended unit names now include Character, Image, Job, Message, Page, and Session alongside Token and Request, each with a description.

**Why it matters.** Without common names, providers describe multimodal and agentic usage in their own strings, so unit costs cannot be compared without mapping each one by hand.

Additional details

These are recommended values in the Unit Format attribute, which governs how units are written in columns such as Consumed Unit and Pricing Unit. Classifying input modality itself is separate work that 1.5 did not take up.

FR 2363 PR 2362

Enablers: not AI-specific, but the AI story depends on them

In final review

### A SKU Price dataset publishes token rates before anyone spends.

A new dataset carrying a provider's prices on their own, separate from consumption: list and negotiated token prices, the dates each applies, quantity tiers, and the accounts eligible for a price. Each price connects to the cost rows billed at it through the SKU Price ID that Cost and Usage already carries.

**Why it matters.** This is where an organization reads a provider's published token rates, prices a planned workload against them, and tests what a negotiated rate is worth. For a model not yet used, the rate is found by the provider's SKU ID or description; the normalized model properties reach a catalog price only through usage already billed.

Additional details

- The dataset does not carry the model and token properties itself. A catalog price reaches them through the SKU Price ID on the Cost and Usage rows billed at that price.
- Each record carries one unit price and says what kind of price it is, such as a public list price, a list price fixed for a contract, usually when it starts, or another contracted rate. Contract ID is empty for a price that is not specific to a contract and identifies the contract for one that is.
- It is delivered as a snapshot of the current price list, and a data generator includes it when its operating model includes unit pricing.
- Two supported features come with it: Catalog Discovery and Price Estimation, and Rate Optimization and Contract Evaluation.

FR 1057 PR 2424, the dataset PR 2595, the supported features

In the working draft

### Service categories that no longer assume cloud, with bare metal apart from virtual machines.

Service Category descriptions are rewritten to apply to any technology provider, and a new Bare Metal subcategory separates physical servers from virtual machines.

**Why it matters.** AI spend often arrives from providers that are not clouds, and GPU capacity is often bought as bare metal. Service categories now describe those providers, and bare metal classifies apart from virtual machines.

Additional details

An AI and Machine Learning category already exists, with subcategories for AI Platforms, Bots, Generative AI, Machine Learning, Natural Language Processing, and Other. Deeper AI subcategories are not part of 1.5.

FR 2377 PR 2379 PR 2624

## What is not in 1.5, and why {section=theme-out}

Three groups: work moved to the next release during this cycle, AI cost dimensions filed this year that 1.5 did not take up, and signals set aside because they belong to observability rather than billing. The first two remain open for the next release's scoping.

Postponed during this cycle

Postponed

### Distinguishing globally served models from region-pinned ones.

A property for the region scope of a price: whether it applies to global serving or to a specific region. Postponed in September, with its name and its relationship to the SKU Price dataset still open.

**Why it matters.** Global and regional serving carry different rates and different data residency characteristics, so this is a finance question and a compliance question at once.

Additional details

The draft property was renamed to `RegionScope` during review. Choosing a specific region over the global price was cited in Task Force discussion as raising the price by about 10%, a smaller gap than between cached and uncached tokens.

FR 2414 PR 2613

Postponed

### Two follow-ons to the requester columns.

Scoped detail configuration, letting a practitioner choose optional, higher-cardinality detail such as principal-level attribution for parts of a dataset, and a Consumer ID column.

Additional details

Selecting requester detail for only parts of a dataset remains open for a later release.

PR 2473, scoped detail PR 2495, Consumer ID

Filed, not taken up in 1.5

Not taken up

### Reasoning tokens, which are billed but never appear in the response.

Reasoning models charge for intermediate tokens the customer never sees, so output token counts in application logs do not match the invoice. Partly answered in 1.5: a separately metered reasoning token carries token direction "Output", so it is counted with output tokens. A dedicated treatment, including reasoning effort, remains open.

Additional details

FR 2487

Not taken up

### The standing charge for keeping a context cache.

Context caching can bill on two axes: the tokens processed, and the content held over time. The second behaves like a storage charge and accrues whether or not the cache is read. In 1.5 these charges carry neither token property; a dedicated treatment remains open.

Additional details

FR 2488

Not taken up

### Input modality: text, image, audio, and video.

Multimodal traffic is billed per token, per image, per second of audio, or per frame, depending on provider and input. 1.5 adds common unit names for several of these, but a modality classification and recommended meter values remain open.

Additional details

FR 2489

Not taken up

### Prices that change with context window size.

Several providers price the same model differently above a context length threshold. Without the distinction, a cost increase driven by longer prompts looks the same as one driven by more calls.

Additional details

FR 2521

Not taken up

### Priority, standard, and batch inference tiers.

Batch and off-peak processing is commonly discounted by about half against real-time inference. Making the tier visible would turn "move this workload to batch" into a measurable saving.

Additional details

FR 2437

Not taken up

### Provisioned throughput as a commitment.

Committed AI capacity is structurally similar to a reserved instance or savings plan. The open question is whether it maps onto the existing commitment discount model cleanly or needs its own treatment. It is where committed AI dollars sit and where utilization against them is measured.

Additional details

FR 2371

Not taken up

### Deeper AI service subcategories, including Agentic AI.

Layered subcategories would separate the infrastructure an AI workload runs on from the model serving it and the application consuming it. Today those layers can land in one subcategory, which is why "what did AI cost us" is hard to answer the same way across organizations.

Additional details

FR 1943

Set aside: observability, not billing

Set aside

### Tool or harness identity, application session and event identifiers, and per-request token limits.

Set aside during the AI billing examples and model identity work. Per-request token limits are request configuration rather than billing data, and application session and event identifiers are observability join signals with no home in FOCUS; they are distinct from the authenticated session that Credential ID can carry. Tool or harness identity was left out of the first pass of examples.

Additional details

Requester Details can carry a client application as a custom entry where a provider publishes one.

FR 1941 FR 2018

## Common questions {section=common-questions}

Is token usage new in FOCUS 1.5?

No. Every version since FOCUS 1.0 carries token counts in Consumed Quantity and Consumed Unit, with Token a listed unit since that release. FOCUS 1.5 adds what makes those counts usable across providers: which model, which kind of token, and who drove the usage. Token counts still do not compare directly across models, because each model decides how much content a token represents.

Why are model and token details properties rather than new columns?

They describe what is being priced, the role SKU Price Details already plays for attributes such as instance type and storage class. As FOCUS-defined properties they carry common names across providers, and they apply only where a price is for an AI model, so data generators that do not sell AI are unaffected.

Can FOCUS 1.5 data show cost per agent or per API key?

Where the provider publishes the identifiers, yes. Principal ID and Credential ID attribute a charge to the identity and credential on the request, and an agent appears when it acts under its own service account or key. They do not show who benefited from the work, and they carry only what the provider publishes.

**Where to go next.** The published specification, currently FOCUS 1.4, is at focus.finops.org, with every column in the Column Library. The whole-release view, beyond AI, is the FOCUS 1.5 release overview. The 1.5 working draft is public on GitHub, and anyone can comment on the open pull requests.

**A terminology note.** In the FOCUS repository, an issue prefixed "AI" is an Action Item, a unit of working-group work, unrelated to artificial intelligence. This page spells out "Action Item" wherever it links to one.

**Sources.** The working group's public records: the 1.5 milestone, the working-group board, merged commits on the working draft, Task Force records, and the 1.5 release plan. Updated October 2026, superseding the 17 September edition. Nothing here is a commitment on behalf of the working group; the release is final when the Steering Committee ratifies it.
