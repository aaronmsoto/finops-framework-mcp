---
kind: project
license: CC-BY-4.0
modified: 2026-08-25
slug: five-layer-stack
source_url: https://www.tokeneconomics.com/projects/the-five-layer-tokenomics-stack/
status: Draft paper (projects index label)
status_source: registry
title: The Five-Layer Tokenomics Stack
word_count: 950
---

# The Five-Layer Tokenomics Stack

## Overview {section=overview}

Introducing

What a token **costs** is decided in the lower layers.
How many tokens you spend is decided in the upper ones.

L1 · L2 · L3 · L4 · L5

**silicon**the floor on cost per token

**capacity**how much of it does useful work

**inference stack**caching, batching, reuse

**model**right-size and quantize

**routing + governance**budgets, caps, circuit breakers

Published by the Tokenomics Foundation

What it is

## Tokenomics is an AI stack discipline, not a token discipline. {section=what-it-is}

The token is the unit of account, not the object of study. What AI costs is the output of a chain of architectural decisions, each one inheriting the cost of the decisions beneath it. Those decisions divide into five layers.

The lower two layers set what AI costs. The upper three move a workload between classes, and then hold it there. Tokenomics in the Generation and Consumption of AI

The stack says where to act; the spectrum says what the action is worth. Keeping the two aligned is the discipline: every unit of work running on the optimal class its value can justify, and every token in that class as efficient as the layers beneath it can produce it.

The scope is the generation and consumption of tokens. The value that consumption creates, and the pricing and product decisions that follow from it, are addressed separately. The five layers are a starting model, not a finished standard.

The stack

## The five layers rest on one another. {section=stack}

L5Routing + governanceRequest routing, budgets, agent caps

L4Model + quantizationRight model, right precision

L3Inference stackRight engine, caching, batching

L2CapacityRight hardware, right regions

L1SiliconChip generation, hardware architecture

**Figure 1.** The five-layer stack.

The order is load bearing. Each layer inherits the cost and availability of the ones beneath, so gains compound upward. Cutting across all five are governance, identity, observability, and cost management: not levers in the way a caching strategy is, but the reason a token can be attributed, a budget enforced, or a quality regression caught.

At a glance

## Which layers set the cost, and which move the class {section=table}

| Layer | Moves the multiplier? | Key metric | Primary lever |
| --- | --- | --- | --- |
| L1 Silicon | No, sets cost per token | Dollars and watts per token | Match silicon class to workload; adopt newer generations |
| L2 Capacity | No, sets effective cost per token | Utilization, idle hours | Batch the troughs; autoscale; place by region |
| L3 Inference stack | Yes, toward `T(1)` and `T(log n)` | Cache hit rate, time to first token, throughput | Right engine; prefix and KV cache; disaggregation |
| L4 Model and quantization | Yes, `T(n·k)` toward `T(n)` | Cost per task, quality per dollar | Right-size the model; quantize; adapt |
| L5 Routing and governance | Yes, bounds `T(n·k·a)` and `T(∞)` | Per-route cost, fan-out and retries | Complexity routing; budgets; agent caps |

**Figure 2.** The layers divide cleanly into those that set the cost of a token and those that move a workload between tiers.

The five layers

## Where the decisions sit {section=layers}

L1

### Silicon

Sets cost per token

The accelerator and its generation, with the memory, interconnect, and power it ships with. It converts energy into tokens and sets the floor on cost per token for everything above it. Not all tokens are equal: a low-latency token on a general-purpose GPU can cost more than the same token on purpose-built silicon.

L2

### Capacity

Sets effective cost

How much silicon you hold, where it sits, and how much of it does useful work. Reserved or on-demand, one region or another, scaled up or scaled to zero, all decided against a traffic shape that rarely matches the commitment. Idle capacity raises the effective cost of the work that does run.

L3

### Inference stack

Suppresses repeated work

The serving software: engine, KV cache management, batching, and the prefill and decode split. Usually the single largest source of optimization, and the first layer where consumption is suppressed rather than merely priced. Cache hit rate is the number that matters most, and it is won largely through prompt and prefix stability.

L4

### Model + quantization

Right-sizes what runs

Which model runs, at what numeric precision, and with what adapted weights. Running a frontier-scale model for a trivial task is the classic waste. Right-sizing is what pulls multiplicative work back toward linear; precision and adapter strategy set what each token costs once the class is settled.

L5

### Routing and governance

Bounds fan-out and retries

The control plane in front of everything else: which model serves each request, caching at the gateway, budgets and quotas, and the guardrails that bound agent fan-out and retries. It is the only layer that can decide a request needs no model at all, and the only one that can stop a workload consuming without limit. Routing is an optimization; a circuit breaker is a containment. A workload with no ceiling has no worst case.

Go deeper

## Further resources {section=resources}

The layers are a shared vocabulary to refine and extend. The full paper goes further at each one: the measures that matter, the tooling categories that fill them, and the measurement practice that catches a workload drifting up the consumption spectrum.

Available

### Tokenomics in the Generation and Consumption of Tokens

The full paper: the five layers, the measures that matter at each, the tooling categories that fill them, and the measurement practice that catches drift.

  [Read paper](https://www.tokeneconomics.com/projects/the-five-layer-tokenomics-stack/the-five-layer-tokenomics-stack-paper/)

Available

### Big-T Notation

The consumption spectrum: the classes a workload can occupy, the evidence behind them, and the argument for why a higher class is a decision rather than a failure.

[Read explainer](https://www.tokeneconomics.com/projects/big-t-notation/)
