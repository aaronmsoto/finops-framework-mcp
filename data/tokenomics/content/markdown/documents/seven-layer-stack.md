---
kind: project
license: CC-BY-4.0
modified: 2026-10-17
slug: seven-layer-stack
source_url: https://www.tokeneconomics.com/projects/the-seven-layer-tokenomics-stack/
status: Release Candidate (projects index label)
status_source: registry
title: The Seven-Layer Tokenomics Stack
word_count: 1301
---

# The Seven-Layer Tokenomics Stack

## Overview {section=overview}

Introducing

What a token **costs** is decided in the lower layers.
How many tokens you spend is decided in the upper ones.

L0 · L1 · L2 · L3 · L4 · L5 · L6

**energy**the power and water it all draws on

**physical**the equipment and where it sits

**infrastructure**how much of it does useful work

**inference stack**caching, tools, agent iteration

**model**select, configure, adapt

**access + control**routing, guardrails, attribution

**demand**who asks, how, and for what

Published by Tokenomics Foundation

What it is

## Tokenomics is an AI stack discipline, not a token discipline. {section=what-it-is}

The token is the unit of account, not the object of study. What AI costs is the output of a chain of architectural decisions, each one inheriting the cost of the decisions beneath it. Those decisions divide into seven layers.

The lower three layers set what AI costs. The middle three move a workload between classes, and then hold it there. The top layer sets the demand they all serve.

The stack says where to act; the spectrum says what the action is worth. Keeping the two aligned is the discipline: every unit of work running on the optimal class its value can justify, and every token in that class as efficient as the layers beneath it can produce it.

The stack covers the generation and consumption of AI. The value that consumption creates, and the pricing and product decisions that follow from it, are addressed separately.

The stack

## The seven layers rest on one another. {section=stack}

L6Demand + entry pointsDemand source, interface, use case, request inputs

L5AI access + controlAdmission, proxy, routing, guardrails, attribution

L4Model management + selectionCatalog, selection, runtime configuration, adapters

L3Inference stackContext and memory, tools, engines, runtime safety, agent iteration

L2Infrastructure managementControl plane, compute management, memory and storage pools

L1Physical infrastructureAccelerators, interconnect, cooling, regions, availability

L0EnergyPower supply and price, grid capacity, water, carbon intensity

**Figure 1.** The seven-layer stack.

The order is load bearing. Each layer inherits the cost and availability of the ones beneath, so gains compound upward. Cutting across all seven are governance, identity, observability, and cost management: not levers in the way a caching strategy is, but the reason a token can be attributed, a budget enforced, or a quality regression caught.

At a glance

## Which layers set the cost, and which move the class {section=table}

| Layer | Moves the multiplier? | Key metric | Primary lever |
| --- | --- | --- | --- |
| L0 Energy | No, sets the price and supply of power | Energy per token, PUE | Site by delivered power price and capacity; contract supply; shift deferrable work in time |
| L1 Physical infrastructure | No, sets cost per token | Dollars per token, performance per watt | Match accelerator class to workload; adopt newer generations; place by region |
| L2 Infrastructure management | No, sets effective cost per token | Utilization, idle hours | Batch the troughs; autoscale; pool and share GPUs |
| L3 Inference stack | Yes, toward `T(1)` and `T(log n)` | Cache hit rate, time to first token, throughput | Right engine; prefix, KV, and semantic cache; disaggregation |
| L4 Model management and selection | Yes, `T(n·k)` toward `T(n)` | Cost per task, quality per dollar | Right-size the model; configure the runtime; adapt |
| L5 AI access and control | Yes, bounds `T(n·k·a)` and `T(∞)` | Per-route cost, fan-out and retries | Complexity routing; budgets; agent caps |
| L6 Demand and entry points | Yes, sets the class a workload requires | Request frequency, context volume | Set requirements per use case; trim and reuse context |

**Figure 2.** The layers divide cleanly into those that set the cost of a token and those that move a workload between tiers.

The seven layers

## Where the decisions sit {section=layers}

L0

### Energy

Sets the price of power

The electricity and water a data center takes in, from the point they enter the facility: what supply is contracted, what it costs, how much the connection can deliver, and the water that cooling consumes. How much of it you control depends on whether you own the facility, colocate, rent equipment, or buy cloud capacity with energy folded into the rate card. Energy per token is a rate, valid within one serving configuration, not a comparison across models or environments.

L1

### Physical infrastructure

Sets cost per token

The accelerator and its generation, with the memory, interconnect, cooling, and density it ships with, and the regions and availability zones it runs in. This is the equipment and location that turn power into tokens. Not all tokens are equal: a low-latency token on a general-purpose GPU can cost more than the same token on purpose-built silicon.

L2

### Infrastructure management

Sets effective cost

How much of that hardware does useful work. Cluster orchestration, scheduling and queues, autoscaling, GPU pools, quotas and multi-tenancy, and the shared memory and storage pools that hold caches and checkpoints, all decided against a traffic shape that rarely matches the commitment. Idle capacity raises the effective cost of the work that does run.

L3

### Inference stack

Suppresses repeated work

The serving software and the runtime around it: engine, batching, KV and semantic caches, session memory, tool calls, runtime safety checks, and the agent loop that plans, calls, and calls again. Usually the single largest source of optimization, and the first layer where consumption is suppressed rather than merely priced. Cache hit rate is the number that matters most, and it is won largely through prompt and prefix stability.

L4

### Model management + selection

Right-sizes what runs

Which model runs, from which provider and region, with what runtime configuration and adapted weights, chosen from a catalog of capabilities, pricing, latency, and quality. Running a frontier-scale model for a trivial task is the classic waste. Right-sizing is what pulls multiplicative work back toward linear; runtime configuration and adapter strategy set what each token costs once the class is settled.

L5

### AI access + control

Bounds fan-out and retries

The governed entry point in front of every model: admission, pass-through proxying, routing, policy and guardrails, and attribution. It decides which model serves each request, enforces budgets and quotas, bounds agent fan-out and tool use, and stamps each request with the user, app, agent, team, and use case it belongs to. It is the only layer that can decide a request needs no model at all, and the only one that can stop a workload consuming without limit. Routing is an optimization; a kill switch is a containment. A workload with no ceiling has no worst case.

L6

### Demand + entry points

Sets the demand

Where consumption starts: who or what is asking, through which interface, for which use case, and with what inputs. A person in a chat window, a scheduled job, and an agent calling through MCP produce different request patterns against the same model. The use case sets the quality, latency, and autonomy the work requires, and the request carries the prompts, documents, and connected data that become context. Every layer beneath serves the demand this one creates.

Go deeper

## Further resources {section=resources}

The layers are a shared vocabulary to refine and extend. The full paper goes further at each one: the measures that matter, the tooling categories that fill them, and the measurement practice that catches a workload drifting up the consumption spectrum.

Available

### Tokenomics in the Generation and Consumption of Tokens

The full paper: the layers, the measures that matter at each, the tooling categories that fill them, and the measurement practice that catches drift.

[Read paper](https://www.tokeneconomics.com/projects/the-seven-layer-tokenomics-stack-paper/)

Available

### Big-T Notation

The consumption spectrum: the classes a workload can occupy, the evidence behind them, and the argument for why a higher class is a decision rather than a failure.

[Read explainer](https://www.tokeneconomics.com/projects/big-t-notation/)
