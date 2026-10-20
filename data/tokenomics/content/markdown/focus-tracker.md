---
collection: focus-tracker
count: 18
---

# FOCUS 1.5 AI tracker

## Cost data can name the AI model and who built it. {slug=fr-2018}

- bucket: done
- kind: ai-capability
- provenance.document: focus-1-5-for-ai
- provenance.section: theme-ai
- provenance.source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
- provenance.license: CC-BY-4.0

### labels

- In the working draft
- FR 2018
- PR 2442

### identifiers

- ModelDeveloper
- ModelFamily
- ModelId
- ModelVersion

### links

- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/issues/2018
- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/pull/2442

### body_md

Four recommended FOCUS-defined properties in SKU Price Details record the model behind a charge: the developer that created it, the model family, the model identifier as billed, and the version. Developer, family, and version read the same way whether the model is bought from its developer or served by a cloud provider; the model identifier is recorded as each provider bills it.

**Why it matters.** This is the piece that makes multi-provider AI spend comparable. Without it, an organization can total what it spent on models last quarter but cannot break that down by model without provider-specific parsing.

- The properties are `ModelDeveloper`, `ModelFamily`, `ModelId`, and `ModelVersion`.
- `ModelId` is the identifier as it appears in billing and can differ between providers selling the same model; family and version are as the model developer defines them.
- No columns are added and existing requirements are unchanged, so the change is additive for every data generator. Including these properties is recommended rather than required, so a conformant dataset can omit them.
- A worked example covers a model bought directly from its developer and the same model served by a cloud provider as its own service. In the second, the service provider and the model developer are different companies, and no existing participating-entity column names the developer.
- In the worked examples, input and output tokens are separate SKUs with their own meters; the token direction property below labels them on the price whatever the provider calls the meter.

## Cached tokens separate from uncached ones, and input from output, on the price itself. {slug=fr-2099}

- bucket: done
- kind: ai-capability
- provenance.document: focus-1-5-for-ai
- provenance.section: theme-ai
- provenance.source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
- provenance.license: CC-BY-4.0

### labels

- In the working draft
- FR 2099
- PR 2606

### identifiers

- TokenCacheAction
- TokenDirection

### links

- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/issues/2099
- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/pull/2606

### body_md

Two recommended FOCUS-defined properties label token prices: how the tokens interacted with a prompt cache, and whether they went into the model or came out of it. They normalize cache and token meter names that differ from one provider to the next.

**Why it matters.** Cached input tokens often cost a fraction of uncached ones at the same provider; in the specification's worked example, a cache read costs a tenth of the input price. Without a common label, separating a fall in cache hit rate from a rise in traffic means matching each provider's meter names by hand, so one of the most actionable AI optimization levers is hard to track across providers.

- `TokenCacheAction` takes "Uncached", "Read", "Write", or "Other" on prices that meter only tokens consumed from a request. `TokenDirection` takes "Input" or "Output" on prices that meter tokens in one direction. A price that bills several kinds of tokens on one meter omits the property that would misdescribe them.
- They are the first FOCUS-defined SKU Price Details properties with a fixed set of allowed values. Including them is recommended rather than required.
- A cached token counted on a "Read" or "Write" row is not counted again on another row, so token totals do not double count.
- Reasoning tokens metered separately carry "Output". Modality, reasoning effort, cache retention duration, and context window size are not values of either property.
- A worked example shows two providers that meter caching differently: one charges to write to the cache, the other charges to keep content in it. Charges for keeping cached content carry neither property.
- Two example queries join the Resource Usage supported feature: cache hit rate for token-metered SKUs by model, and the ratio of input to output tokens by model.
- The glossary adds AI model, prompt cache, and token, and separates a token as a unit of measure from a token as a store of value.

## Worked examples for mapping AI model billing into FOCUS. {slug=fr-1941}

- bucket: review
- kind: ai-capability
- provenance.document: focus-1-5-for-ai
- provenance.section: theme-ai
- provenance.source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
- provenance.license: CC-BY-4.0

### labels

- In final review
- FR 1941
- PR 2605

### identifiers

(none)

### links

- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/issues/1941
- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/pull/2605

### body_md

Six worked scenarios, each with sample data, showing how token billing maps onto existing FOCUS columns, plus an AI Model Billing supported feature with example queries. No columns are added: FOCUS already has the columns to carry token consumption, and the gap these close is applying them the same way.

every single one has a different data formatA FinOps practitioner managing 20-plus AI providers

**Why it matters.** When FinOps Practitioners cannot tell how existing columns apply to AI billing, every provider gets normalized differently. Shared examples give data generators and practitioners one reference for the arrangements they meet most.

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

## Cost rows can name the principal and the credential behind an AI charge. {slug=fr-2358}

- bucket: done
- kind: ai-capability
- provenance.document: focus-1-5-for-ai
- provenance.section: theme-ai
- provenance.source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
- provenance.license: CC-BY-4.0

### labels

- In the working draft
- FR 2358
- PR 2360, Principal ID
- PR 2553, Credential ID and Requester Details

### identifiers

- CredentialId
- PrincipalId
- RequesterDetails

### links

- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/issues/2358
- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/pull/2360
- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/pull/2553

### body_md

Three new Cost and Usage columns. Principal ID identifies the user, service account, or other identity granted access. Credential ID identifies the credential presented on the request, such as an API key or a session. Requester Details carries the attributes a provider publishes for each, such as a display name, type, and email address.

**Why it matters.** As spend shifts from provisioned infrastructure to per-call model invocations, the question changes from which account owns an instance to which developer, team, or automated agent used the tokens. These columns answer it inside billing data rather than by joining to observability.

- Principal ID is the attribution dimension: grouping by it combines a user's or workload's charges however each request was credentialed. Credential ID is the audit dimension: it isolates the spend driven by one key or session.
- Neither ID column may contain a value that authenticates a request, such as the key string itself, and each is empty when the provider publishes no identifier.
- Neither column identifies who benefits from a charge. A shared workload, a gateway, or an embedded assistant can act for people who never appear in billing data.
- An agent appears when it acts under its own service account or key. Further levels, such as a delegating identity or a client application, can be carried as custom entries in Requester Details.
- A worked example walks through 14 scenarios, including a generative AI API key owned by a user, a key issued to a service account, a pipeline that opens a new session on every run, seat-based SaaS with per-token AI usage, and a provider whose keys are themselves the identity.
- The columns are `PrincipalId`, `CredentialId`, and `RequesterDetails`. All three are Conditional, governed by a new operating model condition for requester attribution.

## Provider-issued credits can be recorded as a consumption currency. {slug=pr-2617}

- bucket: done
- kind: ai-capability
- provenance.document: focus-1-5-for-ai
- provenance.section: theme-ai
- provenance.source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
- provenance.license: CC-BY-4.0

### labels

- In the working draft
- Action Item 2550
- PR 2617

### identifiers

- CurrencyFormat

### links

- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/issues/2550
- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/pull/2617

### body_md

The currency rules now recognize a consumption currency: a provider-issued unit such as platform credits or normalized billing units. ISO 4217 currency codes are reserved for national currencies.

**Why it matters.** Much AI usage is priced in a provider's own credits or billing units. The price can now be recorded in that unit, alongside the billed cost in national currency. Prepaid spend in a national currency is a different case. The worked examples in final review show one such arrangement: a token prepayment recorded as a commitment and drawn down by usage.

The `CurrencyFormat` attribute previously allowed virtual currency while also requiring an ISO 4217 code on every value, which no provider-issued unit has. Now ISO 4217 applies when a value represents a national currency, and a column must not use an ISO 4217 code for anything else. A SaaS example shows a consumption currency pricing model.

## Common unit names for multimodal and agentic usage. {slug=fr-2363}

- bucket: done
- kind: ai-capability
- provenance.document: focus-1-5-for-ai
- provenance.section: theme-ai
- provenance.source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
- provenance.license: CC-BY-4.0

### labels

- In the working draft
- FR 2363
- PR 2362

### identifiers

(none)

### links

- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/issues/2363
- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/pull/2362

### body_md

The recommended unit names now include Character, Image, Job, Message, Page, and Session alongside Token and Request, each with a description.

**Why it matters.** Without common names, providers describe multimodal and agentic usage in their own strings, so unit costs cannot be compared without mapping each one by hand.

These are recommended values in the Unit Format attribute, which governs how units are written in columns such as Consumed Unit and Pricing Unit. Classifying input modality itself is separate work that 1.5 did not take up.

## A SKU Price dataset publishes token rates before anyone spends. {slug=fr-1057}

- bucket: review
- kind: enablers
- provenance.document: focus-1-5-for-ai
- provenance.section: theme-ai
- provenance.source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
- provenance.license: CC-BY-4.0

### labels

- In final review
- FR 1057
- PR 2424, the dataset
- PR 2595, the supported features

### identifiers

(none)

### links

- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/issues/1057
- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/pull/2424
- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/pull/2595

### body_md

A new dataset carrying a provider's prices on their own, separate from consumption: list and negotiated token prices, the dates each applies, quantity tiers, and the accounts eligible for a price. Each price connects to the cost rows billed at it through the SKU Price ID that Cost and Usage already carries.

**Why it matters.** This is where an organization reads a provider's published token rates, prices a planned workload against them, and tests what a negotiated rate is worth. For a model not yet used, the rate is found by the provider's SKU ID or description; the normalized model properties reach a catalog price only through usage already billed.

- The dataset does not carry the model and token properties itself. A catalog price reaches them through the SKU Price ID on the Cost and Usage rows billed at that price.
- Each record carries one unit price and says what kind of price it is, such as a public list price, a list price fixed for a contract, usually when it starts, or another contracted rate. Contract ID is empty for a price that is not specific to a contract and identifies the contract for one that is.
- It is delivered as a snapshot of the current price list, and a data generator includes it when its operating model includes unit pricing.
- Two supported features come with it: Catalog Discovery and Price Estimation, and Rate Optimization and Contract Evaluation.

## Service categories that no longer assume cloud, with bare metal apart from virtual machines. {slug=fr-2377}

- bucket: done
- kind: enablers
- provenance.document: focus-1-5-for-ai
- provenance.section: theme-ai
- provenance.source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
- provenance.license: CC-BY-4.0

### labels

- In the working draft
- FR 2377
- PR 2379
- PR 2624

### identifiers

(none)

### links

- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/issues/2377
- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/pull/2379
- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/pull/2624

### body_md

Service Category descriptions are rewritten to apply to any technology provider, and a new Bare Metal subcategory separates physical servers from virtual machines.

**Why it matters.** AI spend often arrives from providers that are not clouds, and GPU capacity is often bought as bare metal. Service categories now describe those providers, and bare metal classifies apart from virtual machines.

An AI and Machine Learning category already exists, with subcategories for AI Platforms, Bots, Generative AI, Machine Learning, Natural Language Processing, and Other. Deeper AI subcategories are not part of 1.5.

## Distinguishing globally served models from region-pinned ones. {slug=fr-2414}

- bucket: out
- kind: postponed-during-this-cycle
- provenance.document: focus-1-5-for-ai
- provenance.section: theme-out
- provenance.source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
- provenance.license: CC-BY-4.0

### labels

- Postponed
- FR 2414
- PR 2613

### identifiers

- RegionScope

### links

- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/issues/2414
- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/pull/2613

### body_md

A property for the region scope of a price: whether it applies to global serving or to a specific region. Postponed in September, with its name and its relationship to the SKU Price dataset still open.

**Why it matters.** Global and regional serving carry different rates and different data residency characteristics, so this is a finance question and a compliance question at once.

The draft property was renamed to `RegionScope` during review. Choosing a specific region over the global price was cited in Task Force discussion as raising the price by about 10%, a smaller gap than between cached and uncached tokens.

## Two follow-ons to the requester columns. {slug=pr-2473-scoped-detail}

- bucket: out
- kind: postponed-during-this-cycle
- provenance.document: focus-1-5-for-ai
- provenance.section: theme-out
- provenance.source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
- provenance.license: CC-BY-4.0

### labels

- Postponed
- PR 2473, scoped detail
- PR 2495, Consumer ID

### identifiers

(none)

### links

- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/pull/2473
- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/pull/2495

### body_md

Scoped detail configuration, letting a practitioner choose optional, higher-cardinality detail such as principal-level attribution for parts of a dataset, and a Consumer ID column.

Selecting requester detail for only parts of a dataset remains open for a later release.

## Reasoning tokens, which are billed but never appear in the response. {slug=fr-2487}

- bucket: out
- kind: filed-not-taken-up-in-1-5
- provenance.document: focus-1-5-for-ai
- provenance.section: theme-out
- provenance.source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
- provenance.license: CC-BY-4.0

### labels

- Not taken up
- FR 2487

### identifiers

(none)

### links

- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/issues/2487

### body_md

Reasoning models charge for intermediate tokens the customer never sees, so output token counts in application logs do not match the invoice. Partly answered in 1.5: a separately metered reasoning token carries token direction "Output", so it is counted with output tokens. A dedicated treatment, including reasoning effort, remains open.

## The standing charge for keeping a context cache. {slug=fr-2488}

- bucket: out
- kind: filed-not-taken-up-in-1-5
- provenance.document: focus-1-5-for-ai
- provenance.section: theme-out
- provenance.source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
- provenance.license: CC-BY-4.0

### labels

- Not taken up
- FR 2488

### identifiers

(none)

### links

- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/issues/2488

### body_md

Context caching can bill on two axes: the tokens processed, and the content held over time. The second behaves like a storage charge and accrues whether or not the cache is read. In 1.5 these charges carry neither token property; a dedicated treatment remains open.

## Input modality: text, image, audio, and video. {slug=fr-2489}

- bucket: out
- kind: filed-not-taken-up-in-1-5
- provenance.document: focus-1-5-for-ai
- provenance.section: theme-out
- provenance.source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
- provenance.license: CC-BY-4.0

### labels

- Not taken up
- FR 2489

### identifiers

(none)

### links

- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/issues/2489

### body_md

Multimodal traffic is billed per token, per image, per second of audio, or per frame, depending on provider and input. 1.5 adds common unit names for several of these, but a modality classification and recommended meter values remain open.

## Prices that change with context window size. {slug=fr-2521}

- bucket: out
- kind: filed-not-taken-up-in-1-5
- provenance.document: focus-1-5-for-ai
- provenance.section: theme-out
- provenance.source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
- provenance.license: CC-BY-4.0

### labels

- Not taken up
- FR 2521

### identifiers

(none)

### links

- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/issues/2521

### body_md

Several providers price the same model differently above a context length threshold. Without the distinction, a cost increase driven by longer prompts looks the same as one driven by more calls.

## Priority, standard, and batch inference tiers. {slug=fr-2437}

- bucket: out
- kind: filed-not-taken-up-in-1-5
- provenance.document: focus-1-5-for-ai
- provenance.section: theme-out
- provenance.source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
- provenance.license: CC-BY-4.0

### labels

- Not taken up
- FR 2437

### identifiers

(none)

### links

- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/issues/2437

### body_md

Batch and off-peak processing is commonly discounted by about half against real-time inference. Making the tier visible would turn "move this workload to batch" into a measurable saving.

## Provisioned throughput as a commitment. {slug=fr-2371}

- bucket: out
- kind: filed-not-taken-up-in-1-5
- provenance.document: focus-1-5-for-ai
- provenance.section: theme-out
- provenance.source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
- provenance.license: CC-BY-4.0

### labels

- Not taken up
- FR 2371

### identifiers

(none)

### links

- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/issues/2371

### body_md

Committed AI capacity is structurally similar to a reserved instance or savings plan. The open question is whether it maps onto the existing commitment discount model cleanly or needs its own treatment. It is where committed AI dollars sit and where utilization against them is measured.

## Deeper AI service subcategories, including Agentic AI. {slug=fr-1943}

- bucket: out
- kind: filed-not-taken-up-in-1-5
- provenance.document: focus-1-5-for-ai
- provenance.section: theme-out
- provenance.source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
- provenance.license: CC-BY-4.0

### labels

- Not taken up
- FR 1943

### identifiers

(none)

### links

- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/issues/1943

### body_md

Layered subcategories would separate the infrastructure an AI workload runs on from the model serving it and the application consuming it. Today those layers can land in one subcategory, which is why "what did AI cost us" is hard to answer the same way across organizations.

## Tool or harness identity, application session and event identifiers, and per-request token limits. {slug=fr-1941-tool-or-harness-identity}

- bucket: out
- kind: set-aside
- provenance.document: focus-1-5-for-ai
- provenance.section: theme-out
- provenance.source_url: https://www.tokeneconomics.com/projects/what-1-5-does-for-ai-cost-and-what-it-does-not/
- provenance.license: CC-BY-4.0

### labels

- Set aside
- FR 1941
- FR 2018

### identifiers

(none)

### links

- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/issues/1941
- https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec/issues/2018

### body_md

Set aside during the AI billing examples and model identity work. Per-request token limits are request configuration rather than billing data, and application session and event identifiers are observability join signals with no home in FOCUS; they are distinct from the authenticated session that Credential ID can carry. Tool or harness identity was left out of the first pass of examples.

Requester Details can carry a client application as a custom entry where a provider publishes one.
