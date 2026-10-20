---
kind: paper
license: CC-BY-4.0
modified: 2026-10-16
slug: seven-layer-stack-paper
source_url: https://www.tokeneconomics.com/projects/the-seven-layer-tokenomics-stack-paper/
status: Release Candidate (projects index label)
status_source: registry
title: The Seven-Layer Tokenomics Stack
word_count: 5020
---

# The Seven-Layer Tokenomics Stack

## Overview {section=overview}

Tokenomics in the generation and consumption of tokens

How the AI stack and the consumption spectrum determine the cost of AI

Published by Tokenomics Foundation

Tokenomics is a stack discipline rather than a token discipline. The token is the unit of account, not the object of study, and the leverage sits in decisions about energy, physical infrastructure, its management, serving software, models, access and control, and demand, along with the governance, identity, observability, and cost management that cut across all of them. This paper sets out those decisions as seven layers. Two structures organize them: the layers themselves, where optimization is applied, and the spectrum of consumption, where architectural choices land a workload. Big-T notation names the classes on that spectrum and is taken as given here. The paper covers the generation and consumption of AI; the value that consumption creates, along with the pricing, monetization, and product decisions that follow from it, is addressed separately.

L6Demand + entry pointsDemand source, interface, use case, request inputs

L5AI access + controlAdmission, proxy, routing, guardrails, attribution

L4Model management + selectionCatalog, selection, runtime configuration, adapters

L3Inference stackContext and memory, tools, engines, runtime safety, agent iteration

L2Infrastructure managementControl plane, compute management, memory and storage pools

L1Physical infrastructureAccelerators, interconnect, cooling, regions, availability

L0EnergyPower supply and price, grid capacity, water, carbon intensity

**Figure 1.** The seven-layer stack. Builds on The Five-Layer Cake of Tokenomics: How Pinterest Thinks About AI Efficiency by Ambud Sharma (Pinterest).

The seven layers rest on one another, and the order is load bearing. Energy is the power and water everything draws on; physical infrastructure is the equipment and location that turn that energy into tokens; infrastructure management determines how much of that hardware is usable and how well it is used; the inference stack decides how efficiently each request runs; the model layer fixes what runs and how it is configured; access and control governs every request that enters the stack; demand and entry points set what is asked for in the first place. Each layer inherits the cost and availability of the ones beneath, so gains compound upward. Cutting across all seven are the capabilities that make the stack operable: governance and security, identity and access, observability, and cost management. They are not optimization levers in the way a caching strategy is, but they are why a token can be attributed, a budget enforced, or a quality regression caught. Each is dealt with where it does its work: governance appears at L5 as budgets, quotas, and circuit breakers; observability and cost management underwrite the measurement section below; identity sits beneath both, since a token cannot be attributed to a team, tenant, or feature the stack cannot name. Their absence is what turns an efficient architecture into an unverifiable one.

The bottom-up sequence applies to anyone who chooses how their models are served, not only those who own hardware; on a cloud, selecting GPU, TPU, CPU, or a managed service is itself a lower-layer decision. The exception is the organization that only calls a frontier API, with no access below the inference stack, whose levers concentrate in model choice, routing, and caching at the top.

## The consumption spectrum {section=spectrum}

Token consumption is not flat. The same useful task can consume almost nothing or scale without bound depending on how it is architected, and Big-T notation names the classes that range spans: `T(1)` where a cache hit avoids generation entirely, `T(log n)` where deterministic work strips the input before the model sees it, `T(n)` as the honest linear baseline, `T(n·k)` where one activity becomes many calls, `T(n·k·a)` where that fans across an agent tree, and `T(∞)` where an autonomous loop has no ceiling. The classes, the evidence behind them, and the argument for why a higher class is a decision rather than a failure are set out in the [Big-T paper](https://www.tokeneconomics.com/projects/big-t-notation/) and taken as given here.

What the spectrum does not tell you is where to act. That is what the layers are for, and the two answer different questions: the layers are where optimization is applied, the classes are what that optimization achieves. The distinction matters because the layers do not all work the same way. The lower three layers set what a token costs, in dollars and in watts, but they cannot move a workload between classes. A poorly utilized fleet makes every token more expensive than it needs to be at whatever class the workload already occupies.

The upper four layers change how many tokens are consumed, which means they can move a workload down. Caching and reuse in the inference stack turn repeated work into `T(1)` and `T(log n)`. Right-sizing a model pulls `T(n·k)` work back toward `T(n)`. Budgets, caps, and circuit breakers in the access and control layer are what keep an agent out of `T(∞)`. The requirements set at the entry point decide which class the work needs in the first place.

The layers are the tools that move a workload into a lower class, and then hold it there.

Set side by side, the layers divide cleanly into those that set the cost of a token and those that move a workload between tiers.

| Layer | Moves the multiplier? | Key metric | Primary lever |
| --- | --- | --- | --- |
| L0 Energy | No, sets the price and supply of power | Energy per token, PUE | Site by delivered power price and capacity; contract supply; shift deferrable work in time |
| L1 Physical infrastructure | No, sets cost per token | Dollars per token, performance per watt | Match accelerator class to workload; adopt newer generations; place by region |
| L2 Infrastructure management | No, sets effective cost per token | Utilization, idle hours | Batch the troughs; autoscale; pool and share GPUs |
| L3 Inference stack | Yes, toward `T(1)` and `T(log n)` | Cache hit rate, time to first token, throughput | Right engine; prefix, KV, and semantic cache; disaggregation |
| L4 Model management and selection | Yes, `T(n·k)` toward `T(n)` | Cost per task, quality per dollar | Right-size the model; quantize; configure the runtime; adapt |
| L5 AI access and control | Yes, bounds `T(n·k·a)` and `T(∞)` | Per-route cost, fan-out and retries | Complexity routing; budgets; agent caps |
| L6 Demand and entry points | Yes, sets the class a workload requires | Request frequency, context volume | Set requirements per use case; trim and reuse context |

### Tokenomics Layers: from demand to energy

Each layer makes key decisions that shape cost, performance, and outcomes.

L6Demand & Entry Points

#### Demand Source & Pattern

- Human, application, agent, or third-party product
- Interactive, scheduled, or event-driven
- Request frequency and concurrency
- Expected session or workflow duration

#### Interface & Entry Point

- Web, mobile, and chat
- APIs, SDKs, and MCP clients
- Harnesses, assistants, and IDE tools
- Direct, embedded, or mediated access

#### Use Case & Requirements

- Task or workflow being performed
- Output, quality, latency, & availability requirements
- Permitted autonomy and operating limits
- Business owner or initiative

#### Request Inputs & Context

- User-supplied prompts, media, & documents
- Connected data & tool sources
- Context volume and freshness
- Sensitivity, classification, residency, & reuse

L5AI Access & Control

#### Access & Admission

- Governed AI entry points
- Authentication & authorization
- Traffic blocking & kill switches

#### Proxy (Pass-Through)

- Transparent pass-through
- Rate limits, bounded retries, timeouts
- Fallbacks across providers
- Unified API surface

#### Router (Selection)

- Intent and complexity detection
- Model and provider selection
- Routing by data classification
- Cache, rules, & no-model routes

#### Policy & Guardrails

- Pre-flight guardrails & compliance
- Response validation
- Request, token, & budget limits
- Agent fan-out & tool limits

#### Attribution Capture

- Capture source metadata from L6
- Validate user, app, agent, & team
- Stamp use case & initiative
- Enforce and propagate metadata

L4Model Management & Selection

#### Model Catalog (Registry)

- Capabilities & context window
- Pricing & cost
- Latency & quality
- Versions & providers

#### Model Selection

- Policy, cost, latency
- Best model for task
- Best provider / region
- Trade-off decisions

#### Runtime Configuration

- System prompt & templates
- Sampling & parameters
- Tools policy
- Tool choice & limits

#### Adapters (Weight-Level)

- LoRA / PEFT
- Adapters
- Weight merging

L3Inference Stack

#### Context & Memory

- Semantic cache
- KV cache
- Vector DB
- Session memory

#### Tools & Actions

- MCP (outbound)
- Function calling
- Web search
- Databases

#### Inference Engines

- vLLM
- TensorRT-LLM
- SGLang
- TGI, etc.

#### Runtime Safety

- PII detection
- Moderation
- Content safety
- Output validation

#### Agent Iteration

- Tools
- Observes
- Plans
- Calls again

L2Infrastructure Management

#### Control Plane

- Service discovery
- Configuration
- Cluster orchestration
- Secrets management

#### Compute Management

- Scheduling & queues
- Autoscaling
- GPU pools
- Quotas & multi-tenancy

#### Memory & Storage Pools

- Shared memory pools
- Ephemeral storage
- Checkpoint storage
- Cache storage

L1Physical Infrastructure

#### Accelerators

- GPU / TPU / NPU
- ASIC / Custom
- Accelerator cards

#### Memory

- HBM / HBM4
- DRAM
- CXL

#### Interconnect

- NVLink / NVSwitch
- PCIe
- Ethernet / InfiniBand

#### Cooling & Density

- Rack & enclosure
- Power delivery & cooling
- System board

#### Availability & Capacity

- Regions / AZs
- Network & egress
- Load balancing
- SLA & reliability
- DR & Capacity Planning

L0Energy

#### Power Supply

- Utility feed & connection capacity
- Delivered power by site & hour
- Backup power

#### Price & Procurement

- Tariffs & time-of-use pricing
- Power purchase agreements
- Regional price differentials

#### Facility Efficiency

- PUE
- Cooling overhead
- Heat reuse

#### Water

- Cooling water draw
- Water availability by site
- WUE

#### Carbon

- Intensity of delivered power
- Contracted supply attributes
- Location- & market-based accounting

**Figure 2.** Mapping AI components to the seven-layer stack. Refined through working group feedback gathered by Tara Urso (Kion).

## L0 Energy {section=l0}

Energy is the electricity and water a data center takes in: the power that runs the accelerators and the facility around them, and the water that cooling consumes. The boundary is the point of entry. L0 starts where power and water arrive at the facility, and covers what supply is contracted, what it costs, when it is available, and how much the connection can deliver. Electricity and water are the physical constraints on how much AI can be produced and where. Carbon is an attribute of the delivered supply. It is a derived coefficient rather than a physical quantity, and its value depends on the accounting method used to count it.

The measures that matter are energy per token and per completion, facility power usage effectiveness (PUE), water usage effectiveness (WUE), accelerator power draw against utilization, the price of delivered power by site and hour, and the carbon intensity of that power. Energy per token is a rate, not a verdict. It holds within one serving configuration and does not compare across models or environments, because model size, precision, batching, and hardware all change it. The unit the discipline needs is energy per outcome, which depends on defining the outcome and cannot yet be measured consistently.

Siting comes first: placing capacity where delivered power is available and priced well, on supply terms that fit the organization's carbon commitments. Deferrable work, such as batch inference and evaluation runs, shifts to the hours when power is cheaper or cleaner, the time-based counterpart to filling troughs at L2.

How much of this you control depends on how you access capacity. Each step away from owning the facility hands more of the energy decision to someone else, and folds more of the energy cost into a price they set.

| Access model | Who contracts the energy | Your energy levers | Energy visibility |
| --- | --- | --- | --- |
| Own data center | You, with the utility or through power purchase agreements | Site, tariff, supply contracts, facility efficiency, time-shifting | Full metered consumption and price |
| Colocation | You or the operator, depending on the agreement; power charged on committed capacity or metered use | Facility choice, committed capacity, agreement terms | Power for your space; facility efficiency as the operator discloses it |
| Rented equipment | The provider; energy bundled into the rental price | Provider and location choice; time-shifting where pricing varies | What the provider discloses |
| Cloud | The provider; energy baked into the rate card | Region and provider choice; scheduling | What the provider discloses |

Measuring energy at L0 draws on facility metrics, power telemetry, and carbon data.

| Category | Common options | Notes |
| --- | --- | --- |
| Facility efficiency metrics | PUE and WUE (The Green Grid) | Facility overhead and water per unit of IT energy; they say nothing about how productively that energy is used |
| Power telemetry | NVIDIA DCGM, Kepler (Kubernetes) | Accelerator and workload power, the numerator for energy per token |
| Grid carbon intensity data | Electricity Maps, WattTime | Location and time signals about the power arriving at a site, for carbon-aware siting and scheduling |
| Carbon accounting | GHG Protocol Scope 2 location-based and market-based methods; Green Software Foundation SCI | The method changes the number; state which one is used |

## L1 Physical infrastructure {section=l1}

This layer is the physical equipment and location everything above it runs on: the accelerator and its generation, the memory, interconnect, cooling, and density it ships with, and the regions and availability zones it sits in. It converts energy into tokens. Newer generations push cost and energy per token down along a decay curve, and not all tokens are equal: a low-latency token on a general-purpose GPU can cost more than the same token on purpose-built silicon. What this layer covers is what you select and where it sits; the power it draws is an energy decision at L0, and how that hardware is orchestrated, scheduled, and shared is an infrastructure management decision at L2.

The measures that matter are cost per token, tokens per second per accelerator, price performance in dollars per million tokens, efficiency as TOPS per watt, regional cost differentials, and the mix of hardware generations across the fleet.

Optimization begins with matching the accelerator class to the workload rather than buying one general-purpose part for everything. Latency-critical and real-time work favors inference-specialized silicon; large mixture-of-experts models favor rack-scale systems with high-bandwidth interconnect. Adopting the newest generation pays off when its price performance justifies the move, and steady, high-volume inference is often a candidate for custom accelerators. Workloads move to cheaper regions where data residency allows.

| Category | Common options | Notes |
| --- | --- | --- |
| NVIDIA GPU | Hopper (H100, H200); Blackwell (B200, GB200 NVL72); Blackwell Ultra (B300, GB300 NVL72) | Rack-scale NVL72 with all-to-all topology suits MoE and autoregressive inference |
| AMD GPU | Instinct MI300X, MI325X, MI355X | Strong memory capacity and bandwidth for inference |
| Cloud ASIC | Google TPU (Trillium, Ironwood); AWS Trainium2 and Trainium3, Inferentia; Microsoft Maia | Best performance per watt for steady workloads; cloud locked |
| Inference specialist | Groq LPU, Cerebras WSE, SambaNova RDU | Sub-millisecond latency per-token or ultra-large models; on prem or first-party cloud |
| Edge | Hailo, NVIDIA Jetson | Device-level and local inference |
| Workstation and local | NVIDIA DGX Spark, AMD Ryzen AI Max, Mac Minis | Large unified memory at low power; development, prototyping, and small-scale private inference rather than fleet serving |
| Cloud and neoclouds | AWS, GCP, Azure; CoreWeave, Lambda, Nebius, Crusoe | Neoclouds often differentiate on easier billing and availability |

## L2 Infrastructure management {section=l2}

Infrastructure management is the decision layer over the hardware beneath it: how it is orchestrated, scheduled, pooled, and shared, and how much of it does useful work. Reserved or on-demand, scaled up or scaled to zero, all of it decided against a traffic shape that rarely matches the commitment. Hardware that sits idle produces expensive tokens, because idle capacity raises the effective per-token cost of the work that does run.

Utilization is the central measure: productive hours against idle hours, reserved capacity against actual use, queue and wait times, and the share of batchable work actually run during demand troughs.

Idle capacity is best filled with batch and asynchronous inference during off-peak hours. Autoscaling and scale-to-zero absorb spiky traffic; a blend of reserved, on-demand, and spot capacity matches the traffic shape; and GPU pools and quotas let teams share and reclaim accelerators. Disaggregating prefill and decode lets each run on the capacity that suits it.

| Category | Common options | Notes |
| --- | --- | --- |
| GPU scheduling and pooling | Kubernetes with KubeRay, Slurm, NVIDIA Run:ai | Share and reclaim accelerators across teams |

## L3 Inference stack {section=l3}

The inference stack is the serving software: the engine, key-value (KV) cache management, batching, and the split between prefill and decode. It also covers the runtime around the engine: semantic caches, vector stores, and session memory; tool calls over MCP and function calling; runtime safety checks; and the agent loop that plans, calls a tool, observes, and calls again. It is usually the single largest source of optimization, and the first layer where consumption is actively suppressed rather than merely priced.

Useful signals include GPU utilization, throughput in tokens and requests per second, time to first token, inter-token latency, KV cache hit rate and prefix-reuse percentage, batch efficiency, and tail latency at the 50th and 95th percentiles.

The first decision is choosing an engine that fits the workload. From there, prefix caching is enabled and the KV cache is extended beyond GPU memory, tiered across GPU, CPU memory, and NVMe, with cached blocks reused across queries. Speculative decoding adds a small draft model, and continuous batching lets new requests join the running batch as slots free. Disaggregating prefill and decode is decided here and provisioned at L2; the engine supports the split, and infrastructure management supplies workers suited to each half.

Cache hit rate is the number that matters most, and it is won largely through prompt and prefix stability. This is the layer that turns repeated work into `T(1)` and `T(log n)`.

| Category | Common options | Notes |
| --- | --- | --- |
| Inference engines | vLLM (general default, OpenAI compatible), SGLang (prefix heavy and structured output via RadixAttention), TensorRT-LLM (max throughput on NVIDIA), LMDeploy TurboMind, llama.cpp and Ollama (local) | All mainstream engines now do continuous batching, paged KV cache, and FP8 |
| KV cache layer | LMCache (GPU, DRAM, NVMe, Redis, S3 tiers; non-prefix reuse), Mooncake, InfiniStore | Maps to hot, warm, cold tiering; cuts time to first token on long context, RAG, and multi-turn |
| Orchestration | NVIDIA Dynamo, NVIDIA Triton Inference Server | Disaggregation and multi-model serving above the engines |
| Managed serving | BentoML, Baseten, Modal, Fireworks, Together | Hosted versions of the above |

## L4 Model management and selection {section=l4}

This layer fixes which model runs, from which provider and region, under what runtime configuration, at what numeric precision, and with what adapted weights. Running a frontier-scale model for a trivial task is the classic waste; quantization reduces memory and compute with limited quality loss, and distillation and pruning go further.

The right measures are cost per task or outcome rather than cost per token alone, quality per dollar expressed as an evaluation score against spend, VRAM footprint, throughput at a given precision, and the accuracy change after quantization, checked against a held-out set so regressions surface before release.

Models are right-sized to the task, with sub-steps routed to smaller models, and quantized to the precision the hardware supports well. FP8 is near-lossless on current hardware; FP4 formats such as NVFP4 and MXFP4 offer more throughput but need validation and often quantization-aware tuning; INT4 with AWQ or GPTQ suits older and consumer GPUs; and GGUF suits CPU and edge.

Calibrating quantization on real traffic, distilling task-specific small models, and pruning where quality holds complete the toolkit. Adapters such as LoRA are the third option between right-sizing and escalating back to a frontier model: task-specific weights applied over one frozen base, so many variants share a single deployment.

Right-sizing is what pulls multiplicative work back toward linear; precision and adapter strategy set what each token costs once the class is settled.

| Category | Common options | Notes |
| --- | --- | --- |
| Open model families | Llama, Qwen, Kimi, DeepSeek, Mistral, Gemma | Strong candidates for right-sizing and self-hosting |
| Quantization tooling | NVIDIA TensorRT Model Optimizer, AutoAWQ, GPTQ, llama.cpp GGUF, Intel Neural Compressor, TorchAO | Cover FP8, FP4, INT4, and calibration |
| Adapters | LoRA and PEFT tooling; adapter serving in vLLM and SGLang; weight merging | Many task variants from one base model |
| Techniques | SmoothQuant, SpinQuant, SVDQuant; SparseGPT and Wanda pruning | Recover accuracy at low precision or shrink further |
| Quality gates | DeepEval and Confident AI, Arize Phoenix, lm-eval-harness | Precondition for any precision or model change, not an after-the-fact report |

## L5 AI access and control {section=l5}

AI access and control is the governed entry point in front of every model: admission and authentication, which model or deployment serves each request, caching at the gateway, budgets and quotas, fallbacks, the guardrails that bound agent fan-out and retries, and the attribution metadata captured from L6 and propagated with each request. It is the only layer that can decide whether a request needs no model at all, and the only one that can stop a workload consuming without limit.

Measurement centers on per-request and per-route cost attribution; cost per feature, team, customer, or tenant; the model-mix distribution; semantic cache hit rate; the share of requests routed to cheaper models; budget burn-down; fan-out width per task; and retry, iteration, and agent-step counts.

Requests are routed by complexity, so simple prompts reach cheap or local models and only hard prompts reach frontier models, with cascading where it helps. Semantic caching sits at the gateway. Per-team and per-tenant token budgets are enforced, with routes demoted as budgets are hit. Agentic behavior is bounded by fan-out limits, recursion and iteration caps, and circuit breakers, while fallbacks and load balancing provide resilience.

This is the primary lever for the amplifying classes. Routing pulls multiplicative work toward linear by sending it somewhere cheaper; caps and circuit breakers are what keep agent-multiplicative work from becoming unbounded. The distinction matters, because the first is an optimization and the second is a containment: a workload with no ceiling has no worst case, and no amount of efficiency in the layers beneath compensates for that.

| Category | Common options | Notes |
| --- | --- | --- |
| Gateways and routers | LiteLLM (open source, self-hosted), Portkey, Bifrost, Cloudflare AI Gateway, Kong AI Gateway, OpenRouter, Vercel AI Gateway, TrueFoundry, Inworld Router, Microsoft Foundry model router | One OpenAI-compatible endpoint over many providers, plus routing, fallbacks, and budgets |
| Semantic caching | Gateway-native caches backed by Redis or Qdrant; GPTCache | Matches on meaning, not exact text; the similarity threshold needs validation against real traffic |
| Token budgeting | Per-tenant budget primitives in Bifrost and similar; budget-aware routing | Budgeting on tokens, not only dollar caps |
| Agent governance | Quotas, iteration caps, circuit breakers; MCP and agent gateways | The lever for agent-multiplicative and unbounded work |

## L6 Demand and entry points {section=l6}

Demand and entry points is where consumption starts: who or what is asking, through which interface, for which use case, and with what inputs. The source may be a person, an application, an agent, or a third-party product; the pattern may be interactive, scheduled, or event-driven; and the request may arrive directly, embedded in another product, or mediated through a harness, assistant, or MCP client. Each combination produces a different request frequency, concurrency, and session length against the same model.

The use case sets what the work requires: output quality, latency, availability, and how much autonomy is permitted. The request carries the prompts, documents, media, and connected data that become context, along with their volume, freshness, sensitivity, and residency. Every layer beneath serves the demand this one creates.

The measures that matter are request frequency and concurrency per use case, session and workflow duration, context volume per request, and the share of demand that can be traced to a business owner or initiative.

Optimization here is a requirements decision. Stating the quality, latency, and autonomy a use case actually needs sets the class the workload should occupy before any layer beneath acts on it. Trimming and reusing context reduces what every request carries, and stable prompts and inputs are what make caching at L3 and L5 effective. This is also where the source metadata originates that L5 validates and attributes; a request that arrives without a user, application, or use case cannot be costed against the value it was meant to create.

## Measuring across the stack {section=measuring}

Measurement here is diagnostic rather than decisional. The optimization is built into how the workload runs, so measurement reports whether the discipline is holding and where it is degrading.

The signal worth watching is drift up the consumption spectrum without a matching rise in value, a workload that was linear quietly becoming multiplicative or agent-multiplicative. Drift is rarely a decision anyone made; it arrives through a model upgrade that enables extended thinking by default, a feature that adds a tool-use loop, an agent given one more level of delegation. The class changed and nothing in the request looks different. Measurement is the only way that surfaces before the invoice does.

When it does surface, the question is whether the new class is justified by what the workload now returns, and that is a question for whoever owns the workload rather than for the measurement layer itself. The budgets, quotas, and circuit breakers at L5 do not answer it either; they hold a workload inside agreed bounds while the answer is worked out.

Token cost data arrives from three categories of tooling, which is part of why a shared definition of conformant, token-level cost data matters.

| Category | What it does | Common options | Best for |
| --- | --- | --- | --- |
| Gateway and proxy | Intercepts every request in real time, meters tokens and cost, enables routing and budgets | LiteLLM, Helicone, Portkey, Bifrost, Cloudflare AI Gateway | Real-time control and request-level attribution |
| Trace level | Instruments code to capture per-call and per-chain traces with step-level cost | Langfuse, LangSmith, Arize Phoenix, Braintrust, Datadog LLM, OpenTelemetry and OpenLLMetry | Linking an agent's many calls into one trace, where multiplicative and agent drift surfaces |
| Billing and FinOps | Ingests provider invoices and cloud spend, allocates and forecasts | Tools across the FinOps Landscape | Allocation, budgeting, and anomaly detection alongside cloud spend |

Two details deserve standardization. Usage now divides into more than input and output: cached tokens, reasoning tokens, and audio and image tokens each price differently, so token-level data should carry the usage type. Without it, the reasoning multiplier that moves a workload between classes is invisible in the billing record, which is precisely the drift this section is about catching.

The second is granularity. FOCUS data at the token level rather than the invoice level is what makes any of this comparable across providers, models, and teams. Measurement across a stack this heterogeneous depends on the data arriving in a shape that can be compared at all.

## Conclusion {section=conclusion}

The stack and the spectrum turn token cost from a single number into a set of architectural decisions with known levers. Energy is what everything draws on. Physical infrastructure turns that energy into tokens. Infrastructure management decides how much of that hardware does useful work. The inference stack is where repeated work stops being generated at all. The model layer fixes what runs and how it is configured. Access and control decides whether a request needs a model in the first place, and whether an agent has a ceiling. Demand and entry points decide what is asked for, and what the answer needs to be. The lower three layers set what a token costs; the middle three move a workload between classes, and then hold it there; the top layer sets the demand they all serve.

The stack says where to act; the spectrum says what the action is worth. The discipline is keeping the two aligned, so that every unit of work runs on the optimal class its value can justify, and every token in that class is as efficient as the layers beneath it can produce it.

None of that is one person's job. The decisions are distributed across the stack by construction, which means the discipline is too, and an organization gets good at it the way it gets good at security: not by appointing someone, but by enough of the people making those decisions understanding what their layer costs.

The layers exist to establish a shared vocabulary to refine and extend; the boundaries, the metrics, and the tooling that fills them will move as the field does. Some of that movement is already visible. As local and on-premise generation gains more attention, tokens may leave the metered economy altogether, which changes the shape of the cost rather than removing it. And value, how token cost feeds pricing, monetization, and product decisions, is what turns efficiency into business outcome. Consumption is treated first because it is where the engineering leverage is most concrete today, not because it is the whole of tokenomics.
