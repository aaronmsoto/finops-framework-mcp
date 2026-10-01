---
collection: personas
count: 12
---

# Tokenomics personas

## Engineering {slug=engineering}

- core: true
- responsibility: Platform-layer costs, model lifecycle, RAG pipelines
- provenance.document: personas-operating-model
- provenance.section: wp-personas
- provenance.source_url: https://www.tokeneconomics.com/personas-and-operating-model-map/
- provenance.license: CC-BY-4.0

### stages

- production
- consumption

### signals

- Tokens per second
- GPU hours per million tokens
- Cache hit rate
- Platform-layer overhead as % of AI spend
- Request-to-call ratio

### description_md

Designs, builds, and manages AI infrastructure for cost-effectiveness, performance, and reliability.

More details

Who this is

Platform and infrastructure engineering, ML platform and MLOps, inference and model-serving teams, SRE, data and RAG-pipeline teams. In most organizations, several teams rather than one role.

Sub-area · ML / Data Pipeline

RAG pipelines, retrieval systems, data preprocessing, and evaluation infrastructure sit under Engineering’s platform-layer ownership. Many organizations treat them as a distinct function worth naming and budgeting separately.

What this persona owns

- Owns the platform layer and the Total Cost of AI (TCA): orchestration, routing, gateways, observability. Platform-layer spend can exceed raw token cost; tokens are 8–27% of total agent run costs [9].
- GPU utilization and model serving: KV cache grows with context length and concurrent users until, on long-context workloads, it can cost more than serving the model itself.
- Model lifecycle: frontier models replaced within months; infrastructure commitments outlive model shelf life.
- Effective cost is a systems property. IBM Research: Claude Sonnet 4.6 cost roughly half of GPT-4.1 across 417 tasks despite higher list prices, because cache-read pricing interacted with context reuse [10]. Engineering owns the serving conditions that produce results like this.

Key decisions

Model serving targets, platform trade-offs (throughput vs. context window), concurrency limits, gateway and observability architecture, and routing policy. The constraint is capturing routing savings without breaking the prefix caching that makes those savings real.

## FinOps Practitioner {slug=finops-practitioner}

- core: true
- responsibility: Track and allocate AI cost and usage
- provenance.document: personas-operating-model
- provenance.section: wp-personas
- provenance.source_url: https://www.tokeneconomics.com/personas-and-operating-model-map/
- provenance.license: CC-BY-4.0

### stages

- consumption

### signals

- % of AI spend attributed
- Anomaly detection coverage
- Budget utilization by value category
- Share of spend on FOCUS-conformant data

### description_md

Bridges business, engineering, and finance; enables evidence-based decisions on AI spend through cost and usage visibility and attribution.

More details

- Pricing is non-linear: tokenizers, caching, context windows, and routing move effective price by large multiples. Model choice alone swings cost 9.1x for identical workloads [9].
- Anomaly detection shifts from spend spikes to complexity shifts: agent loops, runaway sessions, prompt injection attacks.
- Visibility into opaque spend: SaaS vendors bundling AI costs, multi-provider routing, credit-based pricing. FOCUS 1.2 added virtual-currency columns for this [11], and 1.5 goes considerably further: model developer, family, ID, and version are merged into the working draft, so AI spend can be broken out by model without vendor-specific parsing, and a principal identifier is in flight to attribute a charge to a person, team, or automated agent [12]. One thing 1.5 does not settle: separating cache-served tokens from freshly processed ones is still under consideration rather than committed, so the cache hit rate that drives much of the cost may not appear in billing data this release.
- Change management: the questions the rest of the organization needs asked about why AI does not behave like traditional cloud compute. Forecast variance is expected when consumption moves this fast; the answer is agility, re-forecasting frequently as usage patterns shift, not a more accurate single forecast.

Key decisions

Budget thresholds for non-linear pricing, governance for agent depth and session budgets, cost attribution including model family and tier, FOCUS adoption path for AI spend.

## AI End User {slug=ai-end-user}

- core: true
- responsibility: Generates the demand; the surfaces where services are consumed and value is realized or not
- provenance.document: personas-operating-model
- provenance.section: wp-personas
- provenance.source_url: https://www.tokeneconomics.com/personas-and-operating-model-map/
- provenance.license: CC-BY-4.0

### stages

- consumption
- value

### signals

- Adoption and retention by tool
- Interactive vs. agentic share of usage
- Re-prompt and correction rate
- Outputs used as-is vs. discarded
- Off-platform spend by team
- Cost per user by surface

### description_md

Generates the demand every other persona on this map plans, governs, and measures. Every AI service terminates in an end user’s workflow, and the business value is realized there or not at all.

More details

Who this is

The broadest umbrella on the map, and deliberately not a job title. In many organizations it is the entire workforce: developers on coding assistants, support agents on summarization tools, marketers on drafting copilots, analysts on research and retrieval tools, product teams on evaluation workflows. The unit is the work, not the role: anyone whose workflow consumes AI services is an AI end user, developer or not.

The subtypes are **consumption surfaces, not departments**. The same person moves between surfaces in a day:

- **Interactive prompt:** a human in the loop on every turn: drafting, Q&A, review. Spend scales with seats and habits.
- **Agentic:** the user initiates a task and the agent runs, sometimes in parallel sub-agents, sometimes for extended periods. Spend scales with task depth rather than headcount, and the failure mode is a loop or a runaway session, not a bad prompt.
- **Embedded:** AI baked into tools the user already uses: autocomplete, drafts, search. Invisible to the user, and through bundled SaaS pricing often to the organization as well.

Two further axes split the same user: who provisions the surface (a platform or IT-managed seat, a department-managed tool, a personal subscription the organization never saw), and whether the AI is Internal (augmenting the user’s own work) or Product (embedded in what the user delivers to customers). The tools, the providers, and the spend profiles differ across all three axes.

What this persona owns

- Demand: adoption, usage patterns, and the interactive vs. agentic mix are the demand signal that every forecast, reservation, and capacity plan on this map runs against.
- Quality floors in use: the floor Product or Engineering sets is only as real as whether the user’s actual task clears it. Re-prompts, corrections, discarded outputs, and workarounds are the cheapest quality data in the stack, and they sit with the user.
- Off-platform spend: personal keys, personal subscriptions, consumer tools pointed at work data. The spend that FOCUS-conformant data never sees, and where a material share of the data risk sits.
- Value realization: intelligence becomes business value at the point of use, so usage is the first value signal you get. When a tool sits unused, the value case, the quality floor, or the tool itself is wrong somewhere.

Key decisions

Which tool and model tier to use within what is provisioned; when a task is worth the agentic offload; what to escalate to a human, to Product, or to Security; reporting loops, quality degradation, and off-platform use.

## Finance {slug=finance}

- core: true
- responsibility: Product AI vs. Internal AI budgets, forecasting for compounding demand
- provenance.document: personas-operating-model
- provenance.section: wp-personas
- provenance.source_url: https://www.tokeneconomics.com/personas-and-operating-model-map/
- provenance.license: CC-BY-4.0

### stages

- value

### signals

- Value per dollar by category
- Forecast variance: price / volume / mix
- Experimental vs. production spend ratio
- Product AI margin trajectory

### description_md

Quantifies business value of AI spending; supports forecasts, budgets, and ROI measurement.

More details

Sub-area · SaaS product pricing

Pricing novel AI-enabled services where usage-based cost varies per user. Agent pricing has moved from per-conversation to credits to per-seat to per-resolution within roughly eighteen months [7] [8].

What this persona owns

- Unit-cost forecasting does not apply, but not for the reason usually given. Frontier list prices are broadly flat year over year; what falls is the cost of clearing a given quality bar, as cheaper tiers become good enough and caching and routing improve. Cheaper useful output then pulls in more demand, and the total climbs. A forecast built on falling per-token prices will be wrong twice over.
- **Product AI** (growth and margin) vs. **Internal AI** (cost reduction): budgets, hurdle rates, and review cadences should differ by posture.
- Value chain: energy and capital to intelligence, to business value, with loss at each stage. Finance owns quantifying the last conversion.
- Reasoning and agentic workloads shift the consumption mix underneath any forecast; the same feature can consume an order of magnitude more tokens after a model change, with no procurement event to flag it.
- The token line is not the whole bill. Platform tooling, evaluation, retrieval infrastructure, and the engineering and review effort required to make output usable all belong in the AI business case, and a case built on model pricing alone will understate cost and overstate return.

Key decisions

Budget allocation between Product AI and Internal AI, ROI measurement connecting AI spend to output quality, forecasting for compounding demand, experimental-spend budget lines with their own success criteria.

## Product {slug=product}

- core: true
- responsibility: Quality floors and model spectrum matching
- provenance.document: personas-operating-model
- provenance.section: wp-personas
- provenance.source_url: https://www.tokeneconomics.com/personas-and-operating-model-map/
- provenance.license: CC-BY-4.0

### stages

- value

### signals

- Quality floor pass rate per workload
- Cost per successful outcome
- Adoption and retention for AI features
- Latency at p95, customer-facing paths

### description_md

Drives business value by defining AI requirements, prioritizing initiatives, setting quality and cost trade-offs, and determining the pricing model for AI-enabled products.

More details

- Each use case maps to a spectrum: smaller models with short context at modest speed through larger models with long context generating quickly. Over- or under-specifying is waste in both directions.
- Quality floor per task type: define the minimum acceptable output, then optimize cost within that constraint. Agree that floor with Engineering and hold it per task, not on average.
- Different metrics per initiative: growth for product-facing AI, efficiency for internal tools.
- Pricing the output is now a product decision. The market is converging on outcome-denominated pricing for agents precisely because per-token and per-action pricing pushed forecasting risk onto buyers [7] [8].

Key decisions

Quality thresholds per workload, model tier selection for features vs. tools, latency-quality-cost trade-offs for customer-facing AI, the pricing unit for AI-enabled offerings.

## Procurement {slug=procurement}

- core: true
- responsibility: Physical scarcity, model expiry, consumption-rate commitments
- provenance.document: personas-operating-model
- provenance.section: wp-personas
- provenance.source_url: https://www.tokeneconomics.com/personas-and-operating-model-map/
- provenance.license: CC-BY-4.0

### stages

- production
- consumption

### signals

- Reservation coverage and utilization
- Idle allocated capacity
- Effective vs. list price per M tokens by vendor
- Spend under commitments expiring after the model generation they were bought for

### description_md

Sources AI capabilities across vendors; optimizes vendor relationships and ensures cost-effective engagements.

More details

Sub-area · Energy & Infrastructure

Long-lead GPU capacity agreements, power procurement, and data center land deals sit between Procurement and the Capacity function.

What this persona owns

- Multiple sourcing channels: direct from model labs, cloud marketplaces, specialized inference providers, bundled credits. No single hyperscaler offers reservations across all top-tier models, so multi-source is structural.
- Physical scarcity: HBM and DRAM effectively sold out through 2026, fabrication capacity short, data center power as the binding constraint [1] [2] [6].
- Model expiry does not match commitment terms: you cannot commit for three years to something with a six-month shelf life. Provisioned capacity can cost more per token than pay-as-you-go even at full utilization. See the FinOps Navigating GenAI Capacity Options paper for vendor breakdown [13].
- Credit and virtual-currency billing complicates comparison shopping; demand FOCUS-conformant billing data as a contract term where possible. FOCUS 1.5 is adding a SKU price dataset that carries prices independently of consumption, which is what lets you compare model rates across vendors before committing rather than reconstructing the comparison from invoices afterward [12].

Key decisions

Sourcing strategy (direct vs. marketplace vs. inference provider), commitment terms sized to model lifecycle, break-even utilization analysis before any reservation, cost visibility requirements in vendor contracts.

## Leadership {slug=leadership}

- core: true
- responsibility: Investment posture, capital-scale commitments, value mandate
- provenance.document: personas-operating-model
- provenance.section: wp-personas
- provenance.source_url: https://www.tokeneconomics.com/personas-and-operating-model-map/
- provenance.license: CC-BY-4.0

### stages

- value
- spans

### signals

- Portfolio-level value per dollar by category
- Share of AI spend tied to named business problems
- Commitment exposure by horizon
- Competitive benchmark of AI capability per dollar

### description_md

Sets and promotes business and technical objectives; empowers organizational alignment; drives a culture of accountability and value-based decision making.

More details

- AI spend is reaching capital-allocation scale. Hyperscaler capex guidance of ~$725B for 2026 signals that compute posture is now a board-level topic even for consumers of AI [5].
- Leadership owns the Product AI vs. Internal AI split at the portfolio level: how much of the AI budget is a growth bet vs. an efficiency program, and what evidence would change the mix.
- The value mandate: the market is broadly “doing AI” rather than solving named business problems. Leadership forces the naming, because you cannot measure value until you name the business problem.
- Commitment horizons stretch beyond normal technology governance: multi-year capacity, power, and vendor agreements need executive and Legal engagement early, not at signature.

Key decisions

Portfolio allocation across postures; AI investment council structure and cadence; risk appetite for capacity commitments; which value categories the organization reports on.

## Capacity {slug=capacity}

- core: true
- responsibility: Physical supply constraints: securing capacity before anyone can consume it
- provenance.document: personas-operating-model
- provenance.section: wp-personas
- provenance.source_url: https://www.tokeneconomics.com/personas-and-operating-model-map/
- provenance.license: CC-BY-4.0

### stages

- production

### signals

- Committed capacity vs. demand forecast by region and quarter
- Power secured vs. required
- Hardware-generation mix
- Lead time on the critical path

### description_md

More details

Who this is

Read this the way you read Engineering, as an umbrella over several teams rather than a title. In practice the work is split across AI infrastructure leadership, compute and capacity strategy, corporate real estate, energy and sustainability strategy, on-prem and data center engineering, and the parts of Legal and Procurement that live on long-horizon agreements. There is still no settled title for the work as a whole: the constituent teams all exist, but the function that coordinates them usually does not.

What this persona owns

- Capacity roadmaps vs. demand waves. Demand: token volumes growing 7x YoY at the largest operators, enterprise generative-AI spend roughly tripling YoY in 2025 [3] [4].
- GPU memory supply constraints and fabrication timelines. HBM and DRAM allocation reserved years ahead [1] [2].
- Data center power availability as the binding constraint on growth. Data center electricity is projected to roughly double to ~945 TWh by 2030, and grid-connection queues are already delaying projects [6].
- Supply forecasting that accounts for physical scarcity, region, and hardware generation. Pinterest estimates Hopper-to-Blackwell at roughly 30x in token economics [14].
- Energy procurement and legal agreements locking in capacity, including power purchase agreements. Technology companies are now among the largest corporate buyers of renewable power.

## Security & Compliance {slug=security-and-compliance}

- core: false
- responsibility: Allied persona
- provenance.document: personas-operating-model
- provenance.section: wp-allied
- provenance.source_url: https://www.tokeneconomics.com/personas-and-operating-model-map/
- provenance.license: CC-BY-4.0

### stages

(none)

### signals

(none)

### description_md

Data residency and PII handling; model governance and approved-model lists; access controls. Routing and gateway layers are where security constraints get enforced. A task may route to a costlier approved model for compliance reasons. Security requirements are a first-class routing input.

## Legal {slug=legal}

- core: false
- responsibility: Allied persona
- provenance.document: personas-operating-model
- provenance.section: wp-allied
- provenance.source_url: https://www.tokeneconomics.com/personas-and-operating-model-map/
- provenance.license: CC-BY-4.0

### stages

(none)

### signals

(none)

### description_md

Five-to-ten-year power, land, and supply agreements; liability and IP terms for model outputs; data processing agreements across multi-provider routing mesh.

## Sustainability {slug=sustainability}

- core: false
- responsibility: Allied persona
- provenance.document: personas-operating-model
- provenance.section: wp-allied
- provenance.source_url: https://www.tokeneconomics.com/personas-and-operating-model-map/
- provenance.license: CC-BY-4.0

### stages

(none)

### signals

(none)

### description_md

The energy-to-intelligence chain gives Sustainability a direct line into tokenomics: intelligence per watt is a shared metric. Data center electricity growth projections make AI workloads a material line in corporate energy and emissions accounting [6].

## ITAM / ITFM {slug=itam-itfm}

- core: false
- responsibility: Allied persona
- provenance.document: personas-operating-model
- provenance.section: wp-allied
- provenance.source_url: https://www.tokeneconomics.com/personas-and-operating-model-map/
- provenance.license: CC-BY-4.0

### stages

(none)

### signals

(none)

### description_md

Model and license inventory extends asset practices to model versions, fine-tunes, and credit balances; ITFM connects AI spend into broader technology financial reporting via FOCUS-conformant data [11].
