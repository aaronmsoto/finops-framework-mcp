---
collection: layers
count: 5
---

# The Five-Layer Tokenomics Stack

## Silicon {slug=l1}

- number: 1
- table_label: L1 Silicon
- multiplier_effect: No, sets cost per token
- moves_multiplier: false
- key_metric: Dollars and watts per token
- provenance.document: five-layer-stack-paper
- provenance.section: l1
- provenance.source_url: https://www.tokeneconomics.com/projects/the-five-layer-tokenomics-stack/the-five-layer-tokenomics-stack-paper/
- provenance.license: CC-BY-4.0

### primary_levers

- Match silicon class to workload
- adopt newer generations

### description_md

Silicon is the physical substrate: the accelerator and its generation, along with the memory, interconnect, and system power it ships with. It converts energy into tokens, and it sets the floor on cost per token and energy per token for everything above it. Newer generations push both down along a decay curve, and not all tokens are equal: a low-latency token on a general-purpose GPU can cost more than the same token on purpose-built silicon. What this layer covers is what you select; how that hardware is powered, placed, and used is a capacity decision, so interconnect and power appear here as components and again at L2 as choices.

The measures that matter are cost per token in dollars and in watts, tokens per second per accelerator, price performance in dollars per million tokens, efficiency as TOPS per watt, and the mix of hardware generations across the fleet.

Optimization begins with matching the silicon class to the workload rather than buying one general-purpose part for everything. Latency-critical and real-time work favors inference-specialized silicon; large mixture-of-experts models favor rack-scale systems with high-bandwidth interconnect. Adopting the newest generation pays off when its price performance justifies the move, and steady, high-volume inference is often a candidate for custom accelerators.

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
    "name": "System & Power",
    "items": [
      "Rack & enclosure",
      "Power & cooling",
      "System board"
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

## Capacity {slug=l2}

- number: 2
- table_label: L2 Capacity
- multiplier_effect: No, sets effective cost per token
- moves_multiplier: false
- key_metric: Utilization, idle hours
- provenance.document: five-layer-stack-paper
- provenance.section: l2
- provenance.source_url: https://www.tokeneconomics.com/projects/the-five-layer-tokenomics-stack/the-five-layer-tokenomics-stack-paper/
- provenance.license: CC-BY-4.0

### primary_levers

- Batch the troughs
- autoscale
- place by region

### description_md

Capacity is the decision layer over the substrate beneath it: how much of it you hold, where it sits, how it is powered and connected, and how much of it does useful work. Reserved or on-demand, one region or another, scaled up or scaled to zero, all of it decided against a traffic shape that rarely matches the commitment. Silicon that cannot be powered, or that sits idle, produces expensive tokens, because idle capacity raises the effective per-token cost of the work that does run.

Utilization is the central measure: productive hours against idle hours, reserved capacity against actual use, power draw and data-center efficiency, regional cost differentials, queue and wait times, and the share of batchable work actually run during demand troughs.

Idle capacity is best filled with batch and asynchronous inference during off-peak hours. Autoscaling and scale-to-zero absorb spiky traffic; a blend of reserved, on-demand, and spot capacity matches the traffic shape; and workloads move to cheaper or greener regions where data residency allows. Disaggregating prefill and decode lets each run on the capacity that suits it, and rack-scale interconnect serves large and mixture-of-experts models.

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
  },
  {
    "name": "Regions & Capacity",
    "items": [
      "Regions / AZs",
      "Network & egress",
      "Load balancing",
      "SLA & reliability"
    ]
  }
]
```

### tooling_md

| Category | Common options | Notes |
| --- | --- | --- |
| Cloud and neoclouds | AWS, GCP, Azure; CoreWeave, Lambda, Nebius, Crusoe | Neoclouds often differentiate on easier billing and availability |
| GPU scheduling and pooling | Kubernetes with KubeRay, Slurm, NVIDIA Run:ai | Share and reclaim accelerators across teams |

## Inference stack {slug=l3}

- number: 3
- table_label: L3 Inference stack
- multiplier_effect: Yes, toward T(1) and T(log n)
- moves_multiplier: true
- key_metric: Cache hit rate, time to first token, throughput
- provenance.document: five-layer-stack-paper
- provenance.section: l3
- provenance.source_url: https://www.tokeneconomics.com/projects/the-five-layer-tokenomics-stack/the-five-layer-tokenomics-stack-paper/
- provenance.license: CC-BY-4.0

### primary_levers

- Right engine
- prefix and KV cache
- disaggregation

### description_md

The inference stack is the serving software: the engine, key-value (KV) cache management, batching, and the split between prefill and decode. It is usually the single largest source of optimization, and the first layer where consumption is actively suppressed rather than merely priced.

Useful signals include GPU utilization, throughput in tokens and requests per second, time to first token, inter-token latency, KV cache hit rate and prefix-reuse percentage, batch efficiency, and tail latency at the 50th and 95th percentiles.

The first decision is choosing an engine that fits the workload. From there, prefix caching is enabled and the KV cache is extended beyond GPU memory, tiered across GPU, CPU memory, and NVMe, with cached blocks reused across queries. Speculative decoding adds a small draft model, and continuous batching lets new requests join the running batch as slots free. Disaggregating prefill and decode is decided here and provisioned at L2; the engine supports the split, the capacity layer supplies workers suited to each half.

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
- table_label: L4 Model and quantization
- multiplier_effect: Yes, T(n·k) toward T(n)
- moves_multiplier: true
- key_metric: Cost per task, quality per dollar
- provenance.document: five-layer-stack-paper
- provenance.section: l4
- provenance.source_url: https://www.tokeneconomics.com/projects/the-five-layer-tokenomics-stack/the-five-layer-tokenomics-stack-paper/
- provenance.license: CC-BY-4.0

### primary_levers

- Right-size the model
- quantize
- adapt

### description_md

This layer fixes which model runs, at what numeric precision, and with what adapted weights. Running a frontier-scale model for a trivial task is the classic waste; quantization reduces memory and compute with limited quality loss, and distillation and pruning go further.

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

## Routing and governance {slug=l5}

- number: 5
- table_label: L5 Routing and governance
- multiplier_effect: Yes, bounds T(n·k·a) and T(∞)
- moves_multiplier: true
- key_metric: Per-route cost, fan-out and retries
- provenance.document: five-layer-stack-paper
- provenance.section: l5
- provenance.source_url: https://www.tokeneconomics.com/projects/the-five-layer-tokenomics-stack/the-five-layer-tokenomics-stack-paper/
- provenance.license: CC-BY-4.0

### primary_levers

- Complexity routing
- budgets
- agent caps

### description_md

Routing and governance is the control plane in front of everything else: which model or deployment serves each request, caching at the gateway, budgets and quotas, fallbacks, and the guardrails that bound agent fan-out and retries. It is the only layer that can decide whether a request needs no model at all, and the only one that can stop a workload consuming without limit.

Measurement centers on per-request and per-route cost attribution; cost per feature, team, customer, or tenant; the model-mix distribution; semantic cache hit rate; the share of requests routed to cheaper models; budget burn-down; fan-out width per task; and retry, iteration, and agent-step counts.

Requests are routed by complexity, so simple prompts reach cheap or local models and only hard prompts reach frontier models, with cascading where it helps. Semantic caching sits at the gateway. Per-team and per-tenant token budgets are enforced, with routes demoted as budgets are hit. Agentic behavior is bounded by fan-out limits, recursion and iteration caps, and circuit breakers, while fallbacks and load balancing provide resilience.

This is the primary lever for the amplifying classes. Routing pulls multiplicative work toward linear by sending it somewhere cheaper; caps and circuit breakers are what keep agent-multiplicative work from becoming unbounded. The distinction matters, because the first is an optimization and the second is a containment: a workload with no ceiling has no worst case, and no amount of efficiency in the layers beneath compensates for that.

### components

```json
[
  {
    "name": "Clients & Entry Points",
    "items": [
      "Web / Mobile / API",
      "AI Harnesses",
      "MCP Clients"
    ]
  },
  {
    "name": "Prompt Routing",
    "items": [
      "Intent detection",
      "Routing",
      "Policy enforcement"
    ]
  },
  {
    "name": "Policy & Guardrails",
    "items": [
      "Pre-flight guardrails",
      "Compliance",
      "Response validation"
    ]
  },
  {
    "name": "Provider Router (Proxy)",
    "items": [
      "Provider routing",
      "Fallbacks & retries",
      "Unified API"
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
