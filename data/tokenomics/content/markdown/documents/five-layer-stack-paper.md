---
kind: paper
license: CC-BY-4.0
modified: 2026-08-04
slug: five-layer-stack-paper
source_url: https://www.tokeneconomics.com/projects/the-five-layer-tokenomics-stack/the-five-layer-tokenomics-stack-paper/
status: Draft paper (projects index label)
status_source: registry
title: The five-layer Tokenomics stack
word_count: 3716
---

# The five-layer Tokenomics stack

## Overview {section=overview}

Tokenomics in the generation and consumption of tokens

How the AI serving stack and the consumption spectrum determine the cost of a token

Published by the Tokenomics Foundation

Tokenomics is a stack discipline rather than a token discipline. The token is the unit of account, not the object of study, and the leverage sits in decisions about silicon, capacity, serving software, models, and routing, along with the governance, identity, observability, and cost management that cut across all of them. This paper sets out those decisions as five layers. Two structures organize them: the layers themselves, where optimization is applied, and the spectrum of consumption, where architectural choices land a workload. Big-T notation names the classes on that spectrum and is taken as given here. The scope is the generation and consumption of tokens; the value that consumption creates, along with the pricing, monetization, and product decisions that follow from it, is addressed separately.

L5Routing + governanceRequest routing, budgets, agent caps

L4Model + quantizationRight model, right precision

L3Inference stackRight engine, caching, batching

L2CapacityRight hardware, right regions

L1SiliconChip generation, hardware architecture

**Figure 1.** The five-layer stack. After The Five-Layer Cake of Tokenomics: How Pinterest Thinks About AI Efficiency by Ambud Sharma (Pinterest).

The five layers rest on one another, and the order is load bearing. Silicon sets the floor on what a token costs; capacity determines how much of that silicon is usable and how well it is used; the inference stack decides how efficiently each request runs; the model layer fixes what runs and at what precision; routing and governance form the control plane over all of it. Each layer inherits the cost and availability of the ones beneath, so gains compound upward. Cutting across all five are the capabilities that make the stack operable: governance and security, identity and access, observability, and cost management. They are not optimization levers in the way a caching strategy is, but they are why a token can be attributed, a budget enforced, or a quality regression caught. Each is dealt with where it does its work: governance appears at L5 as budgets, quotas, and circuit breakers; observability and cost management underwrite the measurement section below; identity sits beneath both, since a token cannot be attributed to a team, tenant, or feature the stack cannot name. Their absence is what turns an efficient architecture into an unverifiable one.

The bottom-up sequence applies to anyone who chooses how their models are served, not only those who own hardware; on a cloud, selecting GPU, TPU, CPU, or a managed service is itself a lower-layer decision. The exception is the organization that only calls a frontier API, with no access below the inference stack, whose levers concentrate in model choice, routing, and caching at the top.

## The consumption spectrum {section=spectrum}

Token consumption is not flat. The same useful task can consume almost nothing or scale without bound depending on how it is architected, and Big-T notation names the classes that range spans: `T(1)` where a cache hit avoids generation entirely, `T(log n)` where deterministic work strips the input before the model sees it, `T(n)` as the honest linear baseline, `T(n·k)` where one activity becomes many calls, `T(n·k·a)` where that fans across an agent tree, and `T(∞)` where an autonomous loop has no ceiling. The classes, the evidence behind them, and the argument for why a higher class is a decision rather than a failure are set out in the [Big-T paper](https://www.tokeneconomics.com/projects/big-t-notation/) and taken as given here.

What the spectrum does not tell you is where to act. That is what the layers are for, and the two answer different questions: the layers are where optimization is applied, the classes are what that optimization achieves. The distinction matters because the layers do not all work the same way. Silicon and capacity set what a token costs, in dollars and in watts, but they cannot move a workload between classes. A poorly utilized fleet makes every token more expensive than it needs to be at whatever class the workload already occupies.

The upper three layers change how many tokens are consumed, which means they can move a workload down. Caching and reuse in the inference stack turn repeated work into `T(1)` and `T(log n)`. Right-sizing a model pulls `T(n·k)` work back toward `T(n)`. Budgets, caps, and circuit breakers in the routing layer are what keep an agent out of `T(∞)`.

The layers are the tools that move a workload into a lower class, and then hold it there.

Set side by side, the layers divide cleanly into those that set the cost of a token and those that move a workload between tiers.

| Layer | Moves the multiplier? | Key metric | Primary lever |
| --- | --- | --- | --- |
| L1 Silicon | No, sets cost per token | Dollars and watts per token | Match silicon class to workload; adopt newer generations |
| L2 Capacity | No, sets effective cost per token | Utilization, idle hours | Batch the troughs; autoscale; place by region |
| L3 Inference stack | Yes, toward `T(1)` and `T(log n)` | Cache hit rate, time to first token, throughput | Right engine; prefix and KV cache; disaggregation |
| L4 Model and quantization | Yes, `T(n·k)` toward `T(n)` | Cost per task, quality per dollar | Right-size the model; quantize; adapt |
| L5 Routing and governance | Yes, bounds `T(n·k·a)` and `T(∞)` | Per-route cost, fan-out and retries | Complexity routing; budgets; agent caps |

### Tokenomics Layers: from request to silicon

Each layer makes key decisions that shape cost, performance, and outcomes.

L5Routing & Governance

#### Clients & Entry Points

- Web / Mobile / API
- AI Harnesses
- MCP Clients

#### Prompt Routing

- Intent detection
- Routing
- Policy enforcement

#### Policy & Guardrails

- Pre-flight guardrails
- Compliance
- Response validation

#### Provider Router (Proxy)

- Provider routing
- Fallbacks & retries
- Unified API

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

L2Capacity Layer

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

#### Regions & Capacity

- Regions / AZs
- Network & egress
- Load balancing
- SLA & reliability

L1Silicon Layer

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

#### System & Power

- Rack & enclosure
- Power & cooling
- System board

**Figure 2.** Mapping AI components to the five-layer stack.

## L1 Silicon {section=l1}

Silicon is the physical substrate: the accelerator and its generation, along with the memory, interconnect, and system power it ships with. It converts energy into tokens, and it sets the floor on cost per token and energy per token for everything above it. Newer generations push both down along a decay curve, and not all tokens are equal: a low-latency token on a general-purpose GPU can cost more than the same token on purpose-built silicon. What this layer covers is what you select; how that hardware is powered, placed, and used is a capacity decision, so interconnect and power appear here as components and again at L2 as choices.

The measures that matter are cost per token in dollars and in watts, tokens per second per accelerator, price performance in dollars per million tokens, efficiency as TOPS per watt, and the mix of hardware generations across the fleet.

Optimization begins with matching the silicon class to the workload rather than buying one general-purpose part for everything. Latency-critical and real-time work favors inference-specialized silicon; large mixture-of-experts models favor rack-scale systems with high-bandwidth interconnect. Adopting the newest generation pays off when its price performance justifies the move, and steady, high-volume inference is often a candidate for custom accelerators.

| Category | Common options | Notes |
| --- | --- | --- |
| NVIDIA GPU | Hopper (H100, H200); Blackwell (B200, GB200 NVL72); Blackwell Ultra (B300, GB300 NVL72) | Rack-scale NVL72 with all-to-all topology suits MoE and autoregressive inference |
| AMD GPU | Instinct MI300X, MI325X, MI355X | Strong memory capacity and bandwidth for inference |
| Cloud ASIC | Google TPU (Trillium, Ironwood); AWS Trainium2 and Trainium3, Inferentia; Microsoft Maia | Best performance per watt for steady workloads; cloud locked |
| Inference specialist | Groq LPU, Cerebras WSE, SambaNova RDU | Sub-millisecond latency per-token or ultra-large models; on prem or first-party cloud |
| Edge | Hailo, NVIDIA Jetson | Device-level and local inference |
| Workstation and local | NVIDIA DGX Spark, AMD Ryzen AI Max, Mac Minis | Large unified memory at low power; development, prototyping, and small-scale private inference rather than fleet serving |

## L2 Capacity {section=l2}

Capacity is the decision layer over the substrate beneath it: how much of it you hold, where it sits, how it is powered and connected, and how much of it does useful work. Reserved or on-demand, one region or another, scaled up or scaled to zero, all of it decided against a traffic shape that rarely matches the commitment. Silicon that cannot be powered, or that sits idle, produces expensive tokens, because idle capacity raises the effective per-token cost of the work that does run.

Utilization is the central measure: productive hours against idle hours, reserved capacity against actual use, power draw and data-center efficiency, regional cost differentials, queue and wait times, and the share of batchable work actually run during demand troughs.

Idle capacity is best filled with batch and asynchronous inference during off-peak hours. Autoscaling and scale-to-zero absorb spiky traffic; a blend of reserved, on-demand, and spot capacity matches the traffic shape; and workloads move to cheaper or greener regions where data residency allows. Disaggregating prefill and decode lets each run on the capacity that suits it, and rack-scale interconnect serves large and mixture-of-experts models.

| Category | Common options | Notes |
| --- | --- | --- |
| Cloud and neoclouds | AWS, GCP, Azure; CoreWeave, Lambda, Nebius, Crusoe | Neoclouds often differentiate on easier billing and availability |
| GPU scheduling and pooling | Kubernetes with KubeRay, Slurm, NVIDIA Run:ai | Share and reclaim accelerators across teams |

## L3 Inference stack {section=l3}

The inference stack is the serving software: the engine, key-value (KV) cache management, batching, and the split between prefill and decode. It is usually the single largest source of optimization, and the first layer where consumption is actively suppressed rather than merely priced.

Useful signals include GPU utilization, throughput in tokens and requests per second, time to first token, inter-token latency, KV cache hit rate and prefix-reuse percentage, batch efficiency, and tail latency at the 50th and 95th percentiles.

The first decision is choosing an engine that fits the workload. From there, prefix caching is enabled and the KV cache is extended beyond GPU memory, tiered across GPU, CPU memory, and NVMe, with cached blocks reused across queries. Speculative decoding adds a small draft model, and continuous batching lets new requests join the running batch as slots free. Disaggregating prefill and decode is decided here and provisioned at L2; the engine supports the split, the capacity layer supplies workers suited to each half.

Cache hit rate is the number that matters most, and it is won largely through prompt and prefix stability. This is the layer that turns repeated work into `T(1)` and `T(log n)`.

| Category | Common options | Notes |
| --- | --- | --- |
| Inference engines | vLLM (general default, OpenAI compatible), SGLang (prefix heavy and structured output via RadixAttention), TensorRT-LLM (max throughput on NVIDIA), LMDeploy TurboMind, llama.cpp and Ollama (local) | All mainstream engines now do continuous batching, paged KV cache, and FP8 |
| KV cache layer | LMCache (GPU, DRAM, NVMe, Redis, S3 tiers; non-prefix reuse), Mooncake, InfiniStore | Maps to hot, warm, cold tiering; cuts time to first token on long context, RAG, and multi-turn |
| Orchestration | NVIDIA Dynamo, NVIDIA Triton Inference Server | Disaggregation and multi-model serving above the engines |
| Managed serving | BentoML, Baseten, Modal, Fireworks, Together | Hosted versions of the above |

## L4 Model management and selection {section=l4}

This layer fixes which model runs, at what numeric precision, and with what adapted weights. Running a frontier-scale model for a trivial task is the classic waste; quantization reduces memory and compute with limited quality loss, and distillation and pruning go further.

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

## L5 Routing and governance {section=l5}

Routing and governance is the control plane in front of everything else: which model or deployment serves each request, caching at the gateway, budgets and quotas, fallbacks, and the guardrails that bound agent fan-out and retries. It is the only layer that can decide whether a request needs no model at all, and the only one that can stop a workload consuming without limit.

Measurement centers on per-request and per-route cost attribution; cost per feature, team, customer, or tenant; the model-mix distribution; semantic cache hit rate; the share of requests routed to cheaper models; budget burn-down; fan-out width per task; and retry, iteration, and agent-step counts.

Requests are routed by complexity, so simple prompts reach cheap or local models and only hard prompts reach frontier models, with cascading where it helps. Semantic caching sits at the gateway. Per-team and per-tenant token budgets are enforced, with routes demoted as budgets are hit. Agentic behavior is bounded by fan-out limits, recursion and iteration caps, and circuit breakers, while fallbacks and load balancing provide resilience.

This is the primary lever for the amplifying classes. Routing pulls multiplicative work toward linear by sending it somewhere cheaper; caps and circuit breakers are what keep agent-multiplicative work from becoming unbounded. The distinction matters, because the first is an optimization and the second is a containment: a workload with no ceiling has no worst case, and no amount of efficiency in the layers beneath compensates for that.

| Category | Common options | Notes |
| --- | --- | --- |
| Gateways and routers | LiteLLM (open source, self-hosted), Portkey, Bifrost, Cloudflare AI Gateway, Kong AI Gateway, OpenRouter, Vercel AI Gateway, TrueFoundry, Inworld Router, Microsoft Foundry model router | One OpenAI-compatible endpoint over many providers, plus routing, fallbacks, and budgets |
| Semantic caching | Gateway-native caches backed by Redis or Qdrant; GPTCache | Matches on meaning, not exact text; the similarity threshold needs validation against real traffic |
| Token budgeting | Per-tenant budget primitives in Bifrost and similar; budget-aware routing | Budgeting on tokens, not only dollar caps |
| Agent governance | Quotas, iteration caps, circuit breakers; MCP and agent gateways | The lever for agent-multiplicative and unbounded work |

## Measuring across the stack {section=measuring}

Measurement here is diagnostic rather than decisional. In classic FinOps the measurement gates a discretionary choice: here is the spend, and the question is whether an optimization is worth acting on. In tokenomics the optimization is built into how the workload runs, so measurement instead reports whether the discipline is holding and where it is degrading.

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

The stack and the spectrum turn token cost from a single number into a set of architectural decisions with known levers. Silicon sets the lower limit on what a token costs. Capacity decides how much of that silicon does useful work. The inference stack is where repeated work stops being generated at all. The model layer fixes what runs and at what precision. Routing and governance decide whether a request needs a model in the first place, and whether an agent has a ceiling. The lower two layers set what a token costs; the upper three move a workload between classes, and then hold it there.

The stack says where to act; the spectrum says what the action is worth. The discipline is keeping the two aligned, so that every unit of work runs on the optimal class its value can justify, and every token in that class is as efficient as the layers beneath it can produce it.

None of that is one person's job. The decisions are distributed across the stack by construction, which means the discipline is too, and an organization gets good at it the way it gets good at security: not by appointing someone, but by enough of the people making those decisions understanding what their layer costs.

The five layers are a starting model, not a finished standard. They exist to establish a shared vocabulary to refine and extend; the boundaries, the metrics, and the tooling that fills them will move as the field does. Some of that movement is already visible. As local and on-premise generation gains more attention, tokens may leave the metered economy altogether, which changes the shape of the cost rather than removing it. And value, how token cost feeds pricing, monetization, and product decisions, is what turns efficiency into business outcome. Consumption is treated first because it is where the engineering leverage is most concrete today, not because it is the whole of tokenomics.
