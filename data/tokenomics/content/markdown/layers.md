---
collection: layers
count: 7
---

# The Seven-Layer Tokenomics Stack

## Energy {slug=l0}

- number: 0
- table_label: L0 Energy
- multiplier_effect: No, sets the price and supply of power
- moves_multiplier: false
- key_metric: Energy per token, PUE
- provenance.document: seven-layer-stack-paper
- provenance.section: l0
- provenance.source_url: https://www.tokeneconomics.com/projects/the-seven-layer-tokenomics-stack-paper/
- provenance.license: CC-BY-4.0

### primary_levers

- Site by delivered power price and capacity
- contract supply
- shift deferrable work in time

### description_md

Energy is the electricity and water a data center takes in: the power that runs the accelerators and the facility around them, and the water that cooling consumes. The boundary is the point of entry. L0 starts where power and water arrive at the facility, and covers what supply is contracted, what it costs, when it is available, and how much the connection can deliver. Electricity and water are the physical constraints on how much AI can be produced and where. Carbon is an attribute of the delivered supply. It is a derived coefficient rather than a physical quantity, and its value depends on the accounting method used to count it.

The measures that matter are energy per token and per completion, facility power usage effectiveness (PUE), water usage effectiveness (WUE), accelerator power draw against utilization, the price of delivered power by site and hour, and the carbon intensity of that power. Energy per token is a rate, not a verdict. It holds within one serving configuration and does not compare across models or environments, because model size, precision, batching, and hardware all change it. The unit the discipline needs is energy per outcome, which depends on defining the outcome and cannot yet be measured consistently.

Siting comes first: placing capacity where delivered power is available and priced well, on supply terms that fit the organization's carbon commitments. Deferrable work, such as batch inference and evaluation runs, shifts to the hours when power is cheaper or cleaner, the time-based counterpart to filling troughs at L2.

How much of this you control depends on how you access capacity. Each step away from owning the facility hands more of the energy decision to someone else, and folds more of the energy cost into a price they set.

### components

```json
[
  {
    "name": "Power Supply",
    "items": [
      "Utility feed & connection capacity",
      "Delivered power by site & hour",
      "Backup power"
    ]
  },
  {
    "name": "Price & Procurement",
    "items": [
      "Tariffs & time-of-use pricing",
      "Power purchase agreements",
      "Regional price differentials"
    ]
  },
  {
    "name": "Facility Efficiency",
    "items": [
      "PUE",
      "Cooling overhead",
      "Heat reuse"
    ]
  },
  {
    "name": "Water",
    "items": [
      "Cooling water draw",
      "Water availability by site",
      "WUE"
    ]
  },
  {
    "name": "Carbon",
    "items": [
      "Intensity of delivered power",
      "Contracted supply attributes",
      "Location- & market-based accounting"
    ]
  }
]
```

### tooling_md

| Access model | Who contracts the energy | Your energy levers | Energy visibility |
| --- | --- | --- | --- |
| Own data center | You, with the utility or through power purchase agreements | Site, tariff, supply contracts, facility efficiency, time-shifting | Full metered consumption and price |
| Colocation | You or the operator, depending on the agreement; power charged on committed capacity or metered use | Facility choice, committed capacity, agreement terms | Power for your space; facility efficiency as the operator discloses it |
| Rented equipment | The provider; energy bundled into the rental price | Provider and location choice; time-shifting where pricing varies | What the provider discloses |
| Cloud | The provider; energy baked into the rate card | Region and provider choice; scheduling | What the provider discloses |

## Physical infrastructure {slug=l1}

- number: 1
- table_label: L1 Physical infrastructure
- multiplier_effect: No, sets cost per token
- moves_multiplier: false
- key_metric: Dollars per token, performance per watt
- provenance.document: seven-layer-stack-paper
- provenance.section: l1
- provenance.source_url: https://www.tokeneconomics.com/projects/the-seven-layer-tokenomics-stack-paper/
- provenance.license: CC-BY-4.0

### primary_levers

- Match accelerator class to workload
- adopt newer generations
- place by region

### description_md

This layer is the physical equipment and location everything above it runs on: the accelerator and its generation, the memory, interconnect, cooling, and density it ships with, and the regions and availability zones it sits in. It converts energy into tokens. Newer generations push cost and energy per token down along a decay curve, and not all tokens are equal: a low-latency token on a general-purpose GPU can cost more than the same token on purpose-built silicon. What this layer covers is what you select and where it sits; the power it draws is an energy decision at L0, and how that hardware is orchestrated, scheduled, and shared is an infrastructure management decision at L2.

The measures that matter are cost per token, tokens per second per accelerator, price performance in dollars per million tokens, efficiency as TOPS per watt, regional cost differentials, and the mix of hardware generations across the fleet.

Optimization begins with matching the accelerator class to the workload rather than buying one general-purpose part for everything. Latency-critical and real-time work favors inference-specialized silicon; large mixture-of-experts models favor rack-scale systems with high-bandwidth interconnect. Adopting the newest generation pays off when its price performance justifies the move, and steady, high-volume inference is often a candidate for custom accelerators. Workloads move to cheaper regions where data residency allows.

### components

```json
[
  {
    "name": "Accelerators",
    "items": [
      "GPU / TPU / NPU",
      "ASIC / Custom",
      "Accelerator cards"
    ]
  },
  {
    "name": "Memory",
    "items": [
      "HBM / HBM4",
      "DRAM",
      "CXL"
    ]
  },
  {
    "name": "Interconnect",
    "items": [
      "NVLink / NVSwitch",
      "PCIe",
      "Ethernet / InfiniBand"
    ]
  },
  {
    "name": "Cooling & Density",
    "items": [
      "Rack & enclosure",
      "Power delivery & cooling",
      "System board"
    ]
  },
  {
    "name": "Availability & Capacity",
    "items": [
      "Regions / AZs",
      "Network & egress",
      "Load balancing",
      "SLA & reliability",
      "DR & Capacity Planning"
    ]
  }
]
```

### tooling_md

| Category | Common options | Notes |
| --- | --- | --- |
| NVIDIA GPU | Hopper (H100, H200); Blackwell (B200, GB200 NVL72); Blackwell Ultra (B300, GB300 NVL72) | Rack-scale NVL72 with all-to-all topology suits MoE and autoregressive inference |
| AMD GPU | Instinct MI300X, MI325X, MI355X | Strong memory capacity and bandwidth for inference |
| Cloud ASIC | Google TPU (Trillium, Ironwood); AWS Trainium2 and Trainium3, Inferentia; Microsoft Maia | Best performance per watt for steady workloads; cloud locked |
| Inference specialist | Groq LPU, Cerebras WSE, SambaNova RDU | Sub-millisecond latency per-token or ultra-large models; on prem or first-party cloud |
| Edge | Hailo, NVIDIA Jetson | Device-level and local inference |
| Workstation and local | NVIDIA DGX Spark, AMD Ryzen AI Max, Mac Minis | Large unified memory at low power; development, prototyping, and small-scale private inference rather than fleet serving |
| Cloud and neoclouds | AWS, GCP, Azure; CoreWeave, Lambda, Nebius, Crusoe | Neoclouds often differentiate on easier billing and availability |

## Infrastructure management {slug=l2}

- number: 2
- table_label: L2 Infrastructure management
- multiplier_effect: No, sets effective cost per token
- moves_multiplier: false
- key_metric: Utilization, idle hours
- provenance.document: seven-layer-stack-paper
- provenance.section: l2
- provenance.source_url: https://www.tokeneconomics.com/projects/the-seven-layer-tokenomics-stack-paper/
- provenance.license: CC-BY-4.0

### primary_levers

- Batch the troughs
- autoscale
- pool and share GPUs

### description_md

Infrastructure management is the decision layer over the hardware beneath it: how it is orchestrated, scheduled, pooled, and shared, and how much of it does useful work. Reserved or on-demand, scaled up or scaled to zero, all of it decided against a traffic shape that rarely matches the commitment. Hardware that sits idle produces expensive tokens, because idle capacity raises the effective per-token cost of the work that does run.

Utilization is the central measure: productive hours against idle hours, reserved capacity against actual use, queue and wait times, and the share of batchable work actually run during demand troughs.

Idle capacity is best filled with batch and asynchronous inference during off-peak hours. Autoscaling and scale-to-zero absorb spiky traffic; a blend of reserved, on-demand, and spot capacity matches the traffic shape; and GPU pools and quotas let teams share and reclaim accelerators. Disaggregating prefill and decode lets each run on the capacity that suits it.

### components

```json
[
  {
    "name": "Control Plane",
    "items": [
      "Service discovery",
      "Configuration",
      "Cluster orchestration",
      "Secrets management"
    ]
  },
  {
    "name": "Compute Management",
    "items": [
      "Scheduling & queues",
      "Autoscaling",
      "GPU pools",
      "Quotas & multi-tenancy"
    ]
  },
  {
    "name": "Memory & Storage Pools",
    "items": [
      "Shared memory pools",
      "Ephemeral storage",
      "Checkpoint storage",
      "Cache storage"
    ]
  }
]
```

### tooling_md

| Category | Common options | Notes |
| --- | --- | --- |
| GPU scheduling and pooling | Kubernetes with KubeRay, Slurm, NVIDIA Run:ai | Share and reclaim accelerators across teams |

## Inference stack {slug=l3}

- number: 3
- table_label: L3 Inference stack
- multiplier_effect: Yes, toward T(1) and T(log n)
- moves_multiplier: true
- key_metric: Cache hit rate, time to first token, throughput
- provenance.document: seven-layer-stack-paper
- provenance.section: l3
- provenance.source_url: https://www.tokeneconomics.com/projects/the-seven-layer-tokenomics-stack-paper/
- provenance.license: CC-BY-4.0

### primary_levers

- Right engine
- prefix, KV, and semantic cache
- disaggregation

### description_md

The inference stack is the serving software: the engine, key-value (KV) cache management, batching, and the split between prefill and decode. It also covers the runtime around the engine: semantic caches, vector stores, and session memory; tool calls over MCP and function calling; runtime safety checks; and the agent loop that plans, calls a tool, observes, and calls again. It is usually the single largest source of optimization, and the first layer where consumption is actively suppressed rather than merely priced.

Useful signals include GPU utilization, throughput in tokens and requests per second, time to first token, inter-token latency, KV cache hit rate and prefix-reuse percentage, batch efficiency, and tail latency at the 50th and 95th percentiles.

The first decision is choosing an engine that fits the workload. From there, prefix caching is enabled and the KV cache is extended beyond GPU memory, tiered across GPU, CPU memory, and NVMe, with cached blocks reused across queries. Speculative decoding adds a small draft model, and continuous batching lets new requests join the running batch as slots free. Disaggregating prefill and decode is decided here and provisioned at L2; the engine supports the split, and infrastructure management supplies workers suited to each half.

Cache hit rate is the number that matters most, and it is won largely through prompt and prefix stability. This is the layer that turns repeated work into `T(1)` and `T(log n)`.

### components

```json
[
  {
    "name": "Context & Memory",
    "items": [
      "Semantic cache",
      "KV cache",
      "Vector DB",
      "Session memory"
    ]
  },
  {
    "name": "Tools & Actions",
    "items": [
      "MCP (outbound)",
      "Function calling",
      "Web search",
      "Databases"
    ]
  },
  {
    "name": "Inference Engines",
    "items": [
      "vLLM",
      "TensorRT-LLM",
      "SGLang",
      "TGI, etc."
    ]
  },
  {
    "name": "Runtime Safety",
    "items": [
      "PII detection",
      "Moderation",
      "Content safety",
      "Output validation"
    ]
  },
  {
    "name": "Agent Iteration",
    "items": [
      "Tools",
      "Observes",
      "Plans",
      "Calls again"
    ]
  }
]
```

### tooling_md

| Category | Common options | Notes |
| --- | --- | --- |
| Inference engines | vLLM (general default, OpenAI compatible), SGLang (prefix heavy and structured output via RadixAttention), TensorRT-LLM (max throughput on NVIDIA), LMDeploy TurboMind, llama.cpp and Ollama (local) | All mainstream engines now do continuous batching, paged KV cache, and FP8 |
| KV cache layer | LMCache (GPU, DRAM, NVMe, Redis, S3 tiers; non-prefix reuse), Mooncake, InfiniStore | Maps to hot, warm, cold tiering; cuts time to first token on long context, RAG, and multi-turn |
| Orchestration | NVIDIA Dynamo, NVIDIA Triton Inference Server | Disaggregation and multi-model serving above the engines |
| Managed serving | BentoML, Baseten, Modal, Fireworks, Together | Hosted versions of the above |

## Model management and selection {slug=l4}

- number: 4
- table_label: L4 Model management and selection
- multiplier_effect: Yes, T(n·k) toward T(n)
- moves_multiplier: true
- key_metric: Cost per task, quality per dollar
- provenance.document: seven-layer-stack-paper
- provenance.section: l4
- provenance.source_url: https://www.tokeneconomics.com/projects/the-seven-layer-tokenomics-stack-paper/
- provenance.license: CC-BY-4.0

### primary_levers

- Right-size the model
- quantize
- configure the runtime
- adapt

### description_md

This layer fixes which model runs, from which provider and region, under what runtime configuration, at what numeric precision, and with what adapted weights. Running a frontier-scale model for a trivial task is the classic waste; quantization reduces memory and compute with limited quality loss, and distillation and pruning go further.

The right measures are cost per task or outcome rather than cost per token alone, quality per dollar expressed as an evaluation score against spend, VRAM footprint, throughput at a given precision, and the accuracy change after quantization, checked against a held-out set so regressions surface before release.

Models are right-sized to the task, with sub-steps routed to smaller models, and quantized to the precision the hardware supports well. FP8 is near-lossless on current hardware; FP4 formats such as NVFP4 and MXFP4 offer more throughput but need validation and often quantization-aware tuning; INT4 with AWQ or GPTQ suits older and consumer GPUs; and GGUF suits CPU and edge.

Calibrating quantization on real traffic, distilling task-specific small models, and pruning where quality holds complete the toolkit. Adapters such as LoRA are the third option between right-sizing and escalating back to a frontier model: task-specific weights applied over one frozen base, so many variants share a single deployment.

Right-sizing is what pulls multiplicative work back toward linear; precision and adapter strategy set what each token costs once the class is settled.

### components

```json
[
  {
    "name": "Model Catalog (Registry)",
    "items": [
      "Capabilities & context window",
      "Pricing & cost",
      "Latency & quality",
      "Versions & providers"
    ]
  },
  {
    "name": "Model Selection",
    "items": [
      "Policy, cost, latency",
      "Best model for task",
      "Best provider / region",
      "Trade-off decisions"
    ]
  },
  {
    "name": "Runtime Configuration",
    "items": [
      "System prompt & templates",
      "Sampling & parameters",
      "Tools policy",
      "Tool choice & limits"
    ]
  },
  {
    "name": "Adapters (Weight-Level)",
    "items": [
      "LoRA / PEFT",
      "Adapters",
      "Weight merging"
    ]
  }
]
```

### tooling_md

| Category | Common options | Notes |
| --- | --- | --- |
| Open model families | Llama, Qwen, Kimi, DeepSeek, Mistral, Gemma | Strong candidates for right-sizing and self-hosting |
| Quantization tooling | NVIDIA TensorRT Model Optimizer, AutoAWQ, GPTQ, llama.cpp GGUF, Intel Neural Compressor, TorchAO | Cover FP8, FP4, INT4, and calibration |
| Adapters | LoRA and PEFT tooling; adapter serving in vLLM and SGLang; weight merging | Many task variants from one base model |
| Techniques | SmoothQuant, SpinQuant, SVDQuant; SparseGPT and Wanda pruning | Recover accuracy at low precision or shrink further |
| Quality gates | DeepEval and Confident AI, Arize Phoenix, lm-eval-harness | Precondition for any precision or model change, not an after-the-fact report |

## AI access and control {slug=l5}

- number: 5
- table_label: L5 AI access and control
- multiplier_effect: Yes, bounds T(n·k·a) and T(∞)
- moves_multiplier: true
- key_metric: Per-route cost, fan-out and retries
- provenance.document: seven-layer-stack-paper
- provenance.section: l5
- provenance.source_url: https://www.tokeneconomics.com/projects/the-seven-layer-tokenomics-stack-paper/
- provenance.license: CC-BY-4.0

### primary_levers

- Complexity routing
- budgets
- agent caps

### description_md

AI access and control is the governed entry point in front of every model: admission and authentication, which model or deployment serves each request, caching at the gateway, budgets and quotas, fallbacks, the guardrails that bound agent fan-out and retries, and the attribution metadata captured from L6 and propagated with each request. It is the only layer that can decide whether a request needs no model at all, and the only one that can stop a workload consuming without limit.

Measurement centers on per-request and per-route cost attribution; cost per feature, team, customer, or tenant; the model-mix distribution; semantic cache hit rate; the share of requests routed to cheaper models; budget burn-down; fan-out width per task; and retry, iteration, and agent-step counts.

Requests are routed by complexity, so simple prompts reach cheap or local models and only hard prompts reach frontier models, with cascading where it helps. Semantic caching sits at the gateway. Per-team and per-tenant token budgets are enforced, with routes demoted as budgets are hit. Agentic behavior is bounded by fan-out limits, recursion and iteration caps, and circuit breakers, while fallbacks and load balancing provide resilience.

This is the primary lever for the amplifying classes. Routing pulls multiplicative work toward linear by sending it somewhere cheaper; caps and circuit breakers are what keep agent-multiplicative work from becoming unbounded. The distinction matters, because the first is an optimization and the second is a containment: a workload with no ceiling has no worst case, and no amount of efficiency in the layers beneath compensates for that.

### components

```json
[
  {
    "name": "Access & Admission",
    "items": [
      "Governed AI entry points",
      "Authentication & authorization",
      "Traffic blocking & kill switches"
    ]
  },
  {
    "name": "Proxy (Pass-Through)",
    "items": [
      "Transparent pass-through",
      "Rate limits, bounded retries, timeouts",
      "Fallbacks across providers",
      "Unified API surface"
    ]
  },
  {
    "name": "Router (Selection)",
    "items": [
      "Intent and complexity detection",
      "Model and provider selection",
      "Routing by data classification",
      "Cache, rules, & no-model routes"
    ]
  },
  {
    "name": "Policy & Guardrails",
    "items": [
      "Pre-flight guardrails & compliance",
      "Response validation",
      "Request, token, & budget limits",
      "Agent fan-out & tool limits"
    ]
  },
  {
    "name": "Attribution Capture",
    "items": [
      "Capture source metadata from L6",
      "Validate user, app, agent, & team",
      "Stamp use case & initiative",
      "Enforce and propagate metadata"
    ]
  }
]
```

### tooling_md

| Category | Common options | Notes |
| --- | --- | --- |
| Gateways and routers | LiteLLM (open source, self-hosted), Portkey, Bifrost, Cloudflare AI Gateway, Kong AI Gateway, OpenRouter, Vercel AI Gateway, TrueFoundry, Inworld Router, Microsoft Foundry model router | One OpenAI-compatible endpoint over many providers, plus routing, fallbacks, and budgets |
| Semantic caching | Gateway-native caches backed by Redis or Qdrant; GPTCache | Matches on meaning, not exact text; the similarity threshold needs validation against real traffic |
| Token budgeting | Per-tenant budget primitives in Bifrost and similar; budget-aware routing | Budgeting on tokens, not only dollar caps |
| Agent governance | Quotas, iteration caps, circuit breakers; MCP and agent gateways | The lever for agent-multiplicative and unbounded work |

## Demand and entry points {slug=l6}

- number: 6
- table_label: L6 Demand and entry points
- multiplier_effect: Yes, sets the class a workload requires
- moves_multiplier: true
- key_metric: Request frequency, context volume
- provenance.document: seven-layer-stack-paper
- provenance.section: l6
- provenance.source_url: https://www.tokeneconomics.com/projects/the-seven-layer-tokenomics-stack-paper/
- provenance.license: CC-BY-4.0

### primary_levers

- Set requirements per use case
- trim and reuse context

### description_md

Demand and entry points is where consumption starts: who or what is asking, through which interface, for which use case, and with what inputs. The source may be a person, an application, an agent, or a third-party product; the pattern may be interactive, scheduled, or event-driven; and the request may arrive directly, embedded in another product, or mediated through a harness, assistant, or MCP client. Each combination produces a different request frequency, concurrency, and session length against the same model.

The use case sets what the work requires: output quality, latency, availability, and how much autonomy is permitted. The request carries the prompts, documents, media, and connected data that become context, along with their volume, freshness, sensitivity, and residency. Every layer beneath serves the demand this one creates.

The measures that matter are request frequency and concurrency per use case, session and workflow duration, context volume per request, and the share of demand that can be traced to a business owner or initiative.

Optimization here is a requirements decision. Stating the quality, latency, and autonomy a use case actually needs sets the class the workload should occupy before any layer beneath acts on it. Trimming and reusing context reduces what every request carries, and stable prompts and inputs are what make caching at L3 and L5 effective. This is also where the source metadata originates that L5 validates and attributes; a request that arrives without a user, application, or use case cannot be costed against the value it was meant to create.

### components

```json
[
  {
    "name": "Demand Source & Pattern",
    "items": [
      "Human, application, agent, or third-party product",
      "Interactive, scheduled, or event-driven",
      "Request frequency and concurrency",
      "Expected session or workflow duration"
    ]
  },
  {
    "name": "Interface & Entry Point",
    "items": [
      "Web, mobile, and chat",
      "APIs, SDKs, and MCP clients",
      "Harnesses, assistants, and IDE tools",
      "Direct, embedded, or mediated access"
    ]
  },
  {
    "name": "Use Case & Requirements",
    "items": [
      "Task or workflow being performed",
      "Output, quality, latency, & availability requirements",
      "Permitted autonomy and operating limits",
      "Business owner or initiative"
    ]
  },
  {
    "name": "Request Inputs & Context",
    "items": [
      "User-supplied prompts, media, & documents",
      "Connected data & tool sources",
      "Context volume and freshness",
      "Sensitivity, classification, residency, & reuse"
    ]
  }
]
```

### tooling_md

| Category | What it does | Common options | Best for |
| --- | --- | --- | --- |
| Gateway and proxy | Intercepts every request in real time, meters tokens and cost, enables routing and budgets | LiteLLM, Helicone, Portkey, Bifrost, Cloudflare AI Gateway | Real-time control and request-level attribution |
| Trace level | Instruments code to capture per-call and per-chain traces with step-level cost | Langfuse, LangSmith, Arize Phoenix, Braintrust, Datadog LLM, OpenTelemetry and OpenLLMetry | Linking an agent's many calls into one trace, where multiplicative and agent drift surfaces |
| Billing and FinOps | Ingests provider invoices and cloud spend, allocates and forecasts | Tools across the FinOps Landscape | Allocation, budgeting, and anomaly detection alongside cloud spend |
