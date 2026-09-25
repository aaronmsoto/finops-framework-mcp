---
kind: project
license: CC-BY-4.0
modified: 2026-09-21
slug: personas-operating-model
source_url: https://www.tokeneconomics.com/personas-and-operating-model-map/
status: Release Candidate 2
status_date: 2026-09-04
status_source: page
title: AI Tokenomics Personas and Operating Model
word_count: 4975
---

# AI Tokenomics Personas and Operating Model

## Overview {section=overview}

Whitepaper

Tokenomics Foundation · Release Candidate 2 · Last updated 2026-09-04

Primary reader The person responsible for AI spend decisions who needs to understand both AI economics and organizational structure to connect the two. Traditional FinOps can assume an AI expert already exists somewhere in the organization. Tokenomics, by contrast, is for all the individuals building that expertise. The personas below map responsibilities and stakeholders they need to coordinate with.

01 · Scope

## What this is {section=wp-what}

Who inside an enterprise makes decisions that affect AI spend, and whose work consumes the services the rest of the map plans and governs. This map starts from what the AI value chain actually requires, not from an existing persona catalog. Reconciling this set with the FinOps Framework’s persona catalog is a deliberate next step, not attempted here.

These are stakeholder archetypes, not job titles. One person may span multiple personas; one persona may be a team. The AI end user is the broadest of them: in most organizations it spans the whole company, because the persona is everyone whose job now runs through AI tools, whatever their title.

02 · Model

## The three stages {section=wp-stages}

| Stage | Scope | Key question |
| --- | --- | --- |
| Production | The supply side of AI. Energy, capital resources, and the economics of building and running AI in production. How capacity is planned, costed, and brought online. | How is the AI factory built? |
| Consumption | Owns delivering AI services: how much is consumed, by whom, where the waste lives, and how to serve efficiently without degrading outcomes. | How are AI services consumed, and by whom? |
| Value | Owns the last part of Tokenomics, measuring the business value AI produces, so AI investment can be judged on the outcomes it delivers rather than cost alone. | What value does AI produce? |

**Energy & capital**power, silicon, data centers

**AI services**served, routed, consumed

**Intelligence**output, quality, outcomes

**Business value**ROI, growth, margin

Loss at each conversion →

The chain

The chain runs energy and capital, to AI services, to intelligence, to business value, with loss at each conversion. The AI end user is the link at which intelligence is actually used: the person, or the agent acting for the person, doing the work. That is where the business value is realized, and where a growing share of the spend is generated. Every persona below owns part of minimizing that loss.

03 · Context

## Where the enterprise sits {section=wp-where}

The personas below all live inside one box: the enterprise consuming AI. It helps to see what surrounds that box, because most of the cost structure is set by parties the enterprise does not control.

**On the supply side:**

**Energy and data center capacity**

Power, cooling, buildings. Long build timelines make this the binding constraint on ecosystem growth.

**Silicon and hardware**

Memory capacity and bandwidth shape real cost before any price list does.

**Cloud platforms and capacity marketplaces**

Set commitment terms, regions, and pricing models.

**Specialized inference providers**

A newer category that expands sourcing options and pressures pricing.

**Model labs**

The direct producers and the source of most pricing signals the rest of the ecosystem reacts to.

**The platform and tooling layer**

Orchestration, routing, gateways, observability, evaluation, memory, and retrieval. A large share of real AI spend accumulates here, and so does most of the day-to-day work of managing it.

**On the consumer side, alongside the enterprise:**

*Software vendors packaging AI-enabled value-add features*, who embed model cost inside a SaaS price and make attribution difficult for the buyer.

Inside the box, the demand that pulls the chain is the enterprise’s own AI end users: the employees consuming the services through whatever surface their organization has provisioned, or has not.

Physical scarcity

AI is expensive because the things that produce it are physically scarce: power, land, memory. The largest cost line is usually not the model call.

04 · Map

## The personas {section=wp-personas}

| Persona | Stage | Core responsibility in the AI chain |
| --- | --- | --- |
| Engineering | Production Consumption | Platform-layer costs, model lifecycle, RAG pipelines |
| FinOps Practitioner | Consumption | Track and allocate AI cost and usage |
| **AI End User** | Consumption Value | Generates the demand; the surfaces where services are consumed and value is realized or not |
| Finance | Value | Product AI vs. Internal AI budgets, forecasting for compounding demand |
| Product | Value | Quality floors and model spectrum matching |
| Procurement | Production Consumption | Physical scarcity, model expiry, consumption-rate commitments |
| Leadership | Value Spans all | Investment posture, capital-scale commitments, value mandate |
| **Capacity** | Production | Physical supply constraints: securing capacity before anyone can consume it |

Umbrellas, not seats

Each of these is an umbrella, not a seat. **Engineering** already reads that way to most people: nobody expects one engineer. **Capacity** is the same kind of word and should be read the same way. It’s a function spanning several teams, not a capacity planner with a job title. Physical supply, power, and long-horizon capacity require an owner regardless of what any existing framework names, which is why Capacity is on this map. **AI End User** is the widest umbrella on the map: in many organizations it is the entire workforce, and its subtypes are the consumption surfaces, not departments.

### Why this set and not the FinOps persona catalog

Four of the assumptions cloud-era cost management rests on break under AI. Each break moves a decision to a different part of the organization, which is why this map has a different shape.

**Supply has to be secured before it can be negotiated.** When capacity is physically constrained, sourcing moves from the first step to the second. Something now happens before Procurement can do its job, and Capacity is the function that owns it.

**Governance moved up the stack.** Cloud governance lives in the account: budgets, tags, policies on resources. AI governance lives in the application, in agent depth and session budgets, which puts the control points where the FinOps Practitioner and Engineering meet rather than where Finance sets a limit.

**Commitment horizons outran technology governance.** Five-to-ten-year power, land, and supply agreements sit outside normal technology review, which is why Legal appears here as a structural participant rather than an occasional one.

**Account-level controls used to reach whatever consumed capacity.** In cloud, the consumer of capacity was a workload, and budgets, tags, and policies on resources reached it. In AI, a large share of consumption happens in individual workflows and inside the agents those workflows launch, in spend the account-level controls never reach. That break puts the AI end user on this map in its own right: Engineering builds and runs the platform, but it no longer controls, let alone represents, the consumption riding on it.

### Engineering

Production Consumption

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

Signals and metrics

Tokens per second GPU hours per million tokens Cache hit rate Platform-layer overhead as % of AI spend Request-to-call ratio

### FinOps Practitioner

Consumption

Bridges business, engineering, and finance; enables evidence-based decisions on AI spend through cost and usage visibility and attribution.

More details

- Pricing is non-linear: tokenizers, caching, context windows, and routing move effective price by large multiples. Model choice alone swings cost 9.1x for identical workloads [9].
- Anomaly detection shifts from spend spikes to complexity shifts: agent loops, runaway sessions, prompt injection attacks.
- Visibility into opaque spend: SaaS vendors bundling AI costs, multi-provider routing, credit-based pricing. FOCUS 1.2 added virtual-currency columns for this [11], and 1.5 goes considerably further: model developer, family, ID, and version are merged into the working draft, so AI spend can be broken out by model without vendor-specific parsing, and a principal identifier is in flight to attribute a charge to a person, team, or automated agent [12]. One thing 1.5 does not settle: separating cache-served tokens from freshly processed ones is still under consideration rather than committed, so the cache hit rate that drives much of the cost may not appear in billing data this release.
- Change management: the questions the rest of the organization needs asked about why AI does not behave like traditional cloud compute. Forecast variance is expected when consumption moves this fast; the answer is agility, re-forecasting frequently as usage patterns shift, not a more accurate single forecast.

Key decisions

Budget thresholds for non-linear pricing, governance for agent depth and session budgets, cost attribution including model family and tier, FOCUS adoption path for AI spend.

Guardrails

Guardrails here have to be tight enough to keep spend accountable but loose enough that useful experiments still happen. Where that becomes a policy question rather than a threshold, it belongs to Leadership.

Signals and metrics

% of AI spend attributed Anomaly detection coverage Budget utilization by value category Share of spend on FOCUS-conformant data

### AI End User

Consumption Value

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

Signals and metrics

Adoption and retention by tool Interactive vs. agentic share of usage Re-prompt and correction rate Outputs used as-is vs. discarded Off-platform spend by team Cost per user by surface

### Finance

Value

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

Wrong twice over

A forecast built on falling per-token prices fails on both sides: the price premise is wrong (what falls is the cost of clearing a quality bar, not the list price), and the volume premise is wrong (cheaper output brings more demand, not less spend).

Key decisions

Budget allocation between Product AI and Internal AI, ROI measurement connecting AI spend to output quality, forecasting for compounding demand, experimental-spend budget lines with their own success criteria.

Signals and metrics

Value per dollar by category Forecast variance: price / volume / mix Experimental vs. production spend ratio Product AI margin trajectory

### Product

Value

Drives business value by defining AI requirements, prioritizing initiatives, setting quality and cost trade-offs, and determining the pricing model for AI-enabled products.

More details

- Each use case maps to a spectrum: smaller models with short context at modest speed through larger models with long context generating quickly. Over- or under-specifying is waste in both directions.
- Quality floor per task type: define the minimum acceptable output, then optimize cost within that constraint. Agree that floor with Engineering and hold it per task, not on average.
- Different metrics per initiative: growth for product-facing AI, efficiency for internal tools.
- Pricing the output is now a product decision. The market is converging on outcome-denominated pricing for agents precisely because per-token and per-action pricing pushed forecasting risk onto buyers [7] [8].

Key decisions

Quality thresholds per workload, model tier selection for features vs. tools, latency-quality-cost trade-offs for customer-facing AI, the pricing unit for AI-enabled offerings.

Signals and metrics

Quality floor pass rate per workload Cost per successful outcome Adoption and retention for AI features Latency at p95, customer-facing paths

### Procurement

Production Consumption

Sources AI capabilities across vendors; optimizes vendor relationships and ensures cost-effective engagements.

Procurement spans two stages: sourcing production capacity, and negotiating the rates and commitments under which services are consumed.

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

Signals and metrics

Reservation coverage and utilization Idle allocated capacity Effective vs. list price per M tokens by vendor Spend under commitments expiring after the model generation they were bought for

### Leadership

Value Spans all

Sets and promotes business and technical objectives; empowers organizational alignment; drives a culture of accountability and value-based decision making.

More details

- AI spend is reaching capital-allocation scale. Hyperscaler capex guidance of ~$725B for 2026 signals that compute posture is now a board-level topic even for consumers of AI [5].
- Leadership owns the Product AI vs. Internal AI split at the portfolio level: how much of the AI budget is a growth bet vs. an efficiency program, and what evidence would change the mix.
- The value mandate: the market is broadly “doing AI” rather than solving named business problems. Leadership forces the naming, because you cannot measure value until you name the business problem.
- Commitment horizons stretch beyond normal technology governance: multi-year capacity, power, and vendor agreements need executive and Legal engagement early, not at signature.

Key decisions

Portfolio allocation across postures; AI investment council structure and cadence; risk appetite for capacity commitments; which value categories the organization reports on.

Signals and metrics

Portfolio-level value per dollar by category Share of AI spend tied to named business problems Commitment exposure by horizon Competitive benchmark of AI capability per dollar

### Capacity

Production

Why this is a distinct function

The AI chain starts with a question cost management has not had to ask before: *where does the capacity come from, and how is it physically made?* Someone has to own that question directly, ahead of everything Procurement and Engineering do downstream.

The closest analogy is corporate real estate for compute: finding the land, securing the power, and making the long-term agreements before anyone else can build on it.

More details

Who this is

Read this the way you read Engineering, as an umbrella over several teams rather than a title. In practice the work is split across AI infrastructure leadership, compute and capacity strategy, corporate real estate, energy and sustainability strategy, on-prem and data center engineering, and the parts of Legal and Procurement that live on long-horizon agreements. There is still no settled title for the work as a whole: the constituent teams all exist, but the function that coordinates them usually does not.

What this persona owns

- Capacity roadmaps vs. demand waves. Demand: token volumes growing 7x YoY at the largest operators, enterprise generative-AI spend roughly tripling YoY in 2025 [3] [4].
- GPU memory supply constraints and fabrication timelines. HBM and DRAM allocation reserved years ahead [1] [2].
- Data center power availability as the binding constraint on growth. Data center electricity is projected to roughly double to ~945 TWh by 2030, and grid-connection queues are already delaying projects [6].
- Supply forecasting that accounts for physical scarcity, region, and hardware generation. Pinterest estimates Hopper-to-Blackwell at roughly 30x in token economics [14].
- Energy procurement and legal agreements locking in capacity, including power purchase agreements. Technology companies are now among the largest corporate buyers of renewable power.

How it differs from Procurement

Where Procurement negotiates commitment terms for one-to-three-year cloud deals, Capacity looks at five-to-ten-year agreements for land, power, and hardware supply: real assets, regulatory processes, utility counterparties. Legal involved from day one.

Where it sits

Production stage. Feeds Procurement (commitment terms), Engineering (serving capacity), and everything downstream.

Signals and metrics

Committed capacity vs. demand forecast by region and quarter Power secured vs. required Hardware-generation mix Lead time on the critical path

05 · Periphery

## Allied personas {section=wp-allied}

The end-to-end AI supply chain also touches roles that sit outside the personas above: Security, Sustainability, ITAM/ITFM, and Legal.

**Security & Compliance**

Data residency and PII handling; model governance and approved-model lists; access controls. Routing and gateway layers are where security constraints get enforced. A task may route to a costlier approved model for compliance reasons. Security requirements are a first-class routing input.

**Legal**

Five-to-ten-year power, land, and supply agreements; liability and IP terms for model outputs; data processing agreements across multi-provider routing mesh.

**Sustainability**

The energy-to-intelligence chain gives Sustainability a direct line into tokenomics: intelligence per watt is a shared metric. Data center electricity growth projections make AI workloads a material line in corporate energy and emissions accounting [6].

**ITAM / ITFM**

Model and license inventory extends asset practices to model versions, fine-tunes, and credit balances; ITFM connects AI spend into broader technology financial reporting via FOCUS-conformant data [11].

06 · RACI

## Responsibility by lifecycle stage {section=wp-raci}

RACI: **Responsible** executes, **Accountable** owns the outcome (highlighted), **Consulted** and **Informed** as listed.

### Production: how AI factories are built and run

| Lifecycle stage | Responsible | Accountable | Consulted | Informed |
| --- | --- | --- | --- | --- |
| Capacity and power strategy | Capacity | Leadership | Legal, Procurement | Engineering, Finance |
| Vendor sourcing and commitments | Procurement | Procurement | Capacity, FinOps Practitioner, Legal | Finance, Engineering, Leadership |
| Platform and serving architecture | Engineering | Engineering | Product, FinOps Practitioner | All |
| Model selection and replacement | Engineering | Product | Procurement, Capacity, FinOps Practitioner | Finance, Leadership |

### Consumption: how AI services deliver intelligence

| Lifecycle stage | Responsible | Accountable | Consulted | Informed |
| --- | --- | --- | --- | --- |
| Routing, caching, optimization | Engineering | Engineering | Product, FinOps Practitioner, Security | Finance |
| Cost attribution and budgets | FinOps Practitioner | Finance | Engineering | Leadership |
| Forecasting and variance | FinOps Practitioner | Finance | Engineering, Capacity, Product | Leadership |
| Cost anomaly detection and response | FinOps Practitioner | FinOps Practitioner | Engineering, Security | Finance, Leadership |
| Service incident response and recovery | Engineering | Engineering | FinOps Practitioner, Product, Security | Leadership |
| Adoption, usage patterns, and agentic offload | AI End User | Product | FinOps Practitioner, Engineering, Security | Finance, Leadership |
| Off-platform and shadow usage | AI End User | FinOps Practitioner | Security, Procurement | Finance |
| Governance and policy | FinOps Practitioner | Leadership | Engineering, Legal, Security | All |

### Value: what AI produces

| Lifecycle stage | Responsible | Accountable | Consulted | Informed |
| --- | --- | --- | --- | --- |
| Quality floors and use-case fit | Product | Product | Engineering, Finance | Leadership |
| Pricing and monetization of AI output | Product | Finance | FinOps Practitioner, Leadership | Engineering |
| Value measurement and ROI | Finance | Finance | Product, FinOps Practitioner | Leadership |
| Value realization: adoption, outputs used or discarded | AI End User | Product | Finance | FinOps Practitioner, Leadership |
| Portfolio posture (Product vs. Internal) | Finance | Leadership | Product | All |

A structural gap

AI Platform teams are building or reinventing cost tracking as new tools arrive. They lack the end-to-end visibility that a mature FinOps practice provides. That is why this map keeps cost governance in FinOps, not with the function that owns the platform.

Organizations are already improvising around this. Many cap AI tool spend by team or role, or set a weekly per-person budget that rises with seniority: for the AI end user, a cap is often the entire financial control in existence. But a budget only records what was permitted, and the team holding it is often not the team that could change the outcome. Adjusting investment level to measured return is the better long-term process, and the one you cannot implement without measuring value first.

07 · Walkthrough

## The operating model in motion {section=wp-motion}

| Task and Persona | Product AI · customer-facing support summaries | Internal AI · coding assistant for 2,000 developers |
| --- | --- | --- |
| Set the quality floorProduct, or the consuming function | Grounded summaries, p95 under two seconds | PR reviews that catch real defects. The developers hold this floor |
| Pricing unitProduct, accountable to Finance | Per resolved conversation | None. Internal chargeback only |
| Capacity and regionCapacity | A third region ruled out on grid-connection queue, not price | Committed headroom covers 2,000 seats. No new commitment |
| SourcingProcurement | Pay-as-you-go against a reservation, token-level billing as a contract term | Reservation at 60% break-even, term inside the model generation |
| Model approvalFollows the floor owner | Product approves mid-tier, escalate on low confidence | Engineering approves. Cheap on diffs, frontier on reviews |
| Data boundarySecurity | Transcripts constrain the region set and the approved-model list | Repo context leaves the boundary. No training on input |
| BuildEngineering | Gateway routing, prefix cache on the system prompt | Rule-based routing, prefix cache on repo context |
| ConsumeAI End User | Support agents use the summaries in live tickets. A summary that is not grounded or not fast stops being used; re-prompts and escalations are the quality signal Product watches | Developers prompt interactively and hand reviews to agents. The agentic share of sessions is the demand signal, and the loop risk FinOps watches |
| InstrumentFinOps Practitioner | Session budgets, anomaly thresholds, showback from day one | Adoption rate, request-to-call ratio and sub-agent depth tracked, attribution by dev, team and feature |
| PolicyLeadership | A named problem and a value metric before expanding rollout of customer-facing agents | Seat budgets by measured return, not by org level |
| MeasureFinance | Value per resolved conversation, margin trajectory | Cost per PR reviewed, contractor hours offset |
| Six months onAll hands | A cheaper model launches which clears the floor. Product re-approves, Procurement checks purchasing implications, Engineering ships it as config | Thirty percent of sessions run more unbounded subagent parallelism. FinOps flags it, Engineering tightens the default sub-agent fanout guardrail to 3 |

What changes with the value category

Four rows change based on the value category: the quality floor, model approval, the consumption mix of interactive and agentic usage, and the measurement. When developers themselves are AI end users, the Internal AI column has no product-defined quality floor.

These walkthroughs are illustrative, not case studies. The Tokenomics Foundation is looking to replace them with real-world stories from organizations.

08 · Citations

## References {section=wp-refs}

Tap any numbered citation in the text to open the full reference.

1. TechSpot, “SK Hynix sells out DRAM, NAND, and HBM capacity into 2026 amid AI frenzy,” October 2025. techspot.com/news/110058
2. Tom’s Hardware, “Samsung and SK hynix warn AI-driven memory shortages could last until 2027 and beyond,” April 2026. tomshardware.com
3. Sundar Pichai, Google I/O 2026 opening keynote, May 2026. blog.google/innovation-and-ai/sundar-pichai-io-2026
4. Menlo Ventures, “2025: The State of Generative AI in the Enterprise,” December 2025. menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise
5. Yahoo Finance / Goldman Sachs, “Meta, Microsoft, Amazon, and Alphabet are about to spend a shocking amount of money,” June 2026. finance.yahoo.com
6. IEA, “Energy and AI,” 2025. iea.org/reports/energy-and-ai
7. Monetizely, “The Doomed Evolution of Salesforce’s Agentforce Pricing,” January 2026. getmonetizely.com/blogs/the-doomed-evolution-of-salesforces-agentforce-pricing
8. SalesforceDevops.net, “Agentforce Help Agent: Strong on Setup, Better on Pricing,” June 2026. salesforcedevops.net/index.php/2026/06/25/agentforce-help-agent-pay-per-resolution
9. Digital Applied, “The AI Agent Build & Run Cost Index 2026,” July 3, 2026. digitalapplied.com/blog/ai-agent-build-run-cost-index-2026
10. IBM Research, “Model Routing Is Simple, Until It Isn’t,” Hugging Face blog, July 15, 2026. huggingface.co/blog/ibm-research/model-routing-is-simple-until-it-isnt
11. FinOps Foundation, “Introducing FOCUS 1.2: SaaS/PaaS Support, Invoice Reconciliation, and Deeper Cloud Allocation.” finops.org/insights/focus-1-2-available
12. Tokenomics Foundation, “What 1.5 does for AI cost, and what it does not,” July 2026. [tokeneconomics.com/what-1-5-does-for-ai-cost-and-what-it-does-not](https://www.tokeneconomics.com/what-1-5-does-for-ai-cost-and-what-it-does-not/)
13. FinOps Foundation Working Group, “Navigating GenAI Capacity Options,” February 2026. finops.org/wg/genai-capacity-options
14. Ambud Sharma (Pinterest), “The AI Layer Cake,” FinOps X 2026 Day 2 keynote. youtu.be/yLZ1EqiPAuI

Published by the Tokenomics Foundation as an open, vendor-neutral research resource. CC BY 4.0.

Thanks to all of the members of the Definitions, Personas, and Framework Working Group for Sprint 1: Andrew Feig, Anthony "TJ" Johnson, Eric Driscoll, Hassan Khajeh-Hosseini, Keenan Dolan, Michelle Dupuis, Soumya Kapoor, and Tatum Tummins.
