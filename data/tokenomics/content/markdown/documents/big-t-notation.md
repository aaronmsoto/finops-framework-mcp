---
author: Dan Neff (Adobe)
kind: project
license: CC-BY-4.0
modified: 2026-08-27
slug: big-t-notation
source_url: https://www.tokeneconomics.com/projects/big-t-notation/
status: Published project explainer (no status label)
status_source: registry
title: Big-T Notation
word_count: 2372
---

# Big-T Notation

## Overview {section=overview}

An open, vendor-neutral framework

Big-O for AI Consumption. A shared language for reasoning about how AI token consumption grows as usage scales, so teams can see the cost curve before the invoice arrives.

T(n · k · a)requests × model calls per request × agent depth

By Dan Neff (Adobe) · Published by the Tokenomics Foundation

What it is

## The unit of scarcity has changed. The vocabulary hasn't. {section=what}

Every generation of computing has a unit of scarcity that engineers learn to measure and optimize. Mainframes had memory. Client-server had bandwidth. Cloud had API calls and egress. For large language models, that unit is the **token**.

Big-O notation never told you an algorithm's exact runtime. It told you how runtime *grows* as input scales, a category of behavior that lets engineers make decisions without benchmarking every input. Big-T applies the same discipline to tokens. It classifies workloads by how their token consumption grows as usage scales, complexity increases, or autonomy expands.

Big-T is deliberately informal. There are no proofs and no master theorem. It is a thinking tool: a shared vocabulary that lets engineers, architects, and finance teams reason about token-cost trajectories before committing to an architecture. The value is not precision. The value is the discipline of asking the right question at the right time.

“All we did is we created a common language and a common currency. We agree that this is how we're defining things.”

Dan Neff

Creator of Big-T Notation, Adobe

### Why now?

Four demand waves are stacking at once: frontier models consume more tokens per task, larger context windows invite larger prompts, agentic architectures multiply calls per task, and adoption itself is compounding. Per-token prices are falling while total consumption explodes, a classic Jevons paradox. Organizations that scale AI without token-aware architecture will discover they have built the equivalent of an O(n!) algorithm and called it a strategy.

Key elements

## The notation: T(n · k · a) {section=notation}

Three variables capture the dimensions along which token cost grows. Name what is scaling before asking how fast.

n

### Requests, or input size

Covers two things that often move together: how many requests hit the workload, and how large each request's input is. Either or both can be the scaling dimension.

k

### Model calls per request

Reasoning steps, multi-turn chains, tool calls that replay context. The trap: k is usually invisible. It rarely appears in the request itself.

a

### Agent depth

Sub-agents calling sub-agents. An orchestrator spawning workers multiplies everything above it in the tree.

### Two questions, asked in order

First: **what class is this workload?** That is an architecture decision, and only architecture changes it. Second: **how cheaply does it run within its class?** That is where compression, routing, caching, and serialization live.

Big-T deliberately ignores constants, but the class still governs, because constants are bounded and reversible while growth is neither. Classes are compared at a stated quality floor; quality is the precondition of the comparison, not a term in it.

Core concept

## How token costs scale {section=ladder}

Picture a workload flowing left to right. Deterministic filtering keeps the stream narrow. Hidden multipliers make it loop back on itself. Agent trees branch it into a mesh that scales quadratically.

Sublinear: filter before inferenceMultiplicative: hidden k loopsAgent-multiplicative: bound the tree

A workload's class is often invisible in the request. The multipliers that set it (reasoning tokens, agent depth, retry loops) show up only on the invoice.

A workload's class is often invisible in the request. The multipliers that set it (reasoning tokens, agent depth, retry loops) show up only on the invoice.

### The complexity ladder

T(1) Constant

**The model is not called per request.** A cache hit, a static lookup, an embedding search. Reuse of a precomputed answer. The O(1) of AI.

**Fix:** Cache and precompute aggressively.

T(log n) Sublinear

**Deterministic code shrinks the input before the model sees it.** The class most organizations miss entirely. RAG done right; code is the new cache layer. Published results: SQL views shrinking clinical data from ~240,000 tokens to 19,000 before the model is called, and retrieval pipelines eliminating better than 99.9 percent of a million-token corpus.

**Fix:** Filter and retrieve before inference, not after.

T(n) Linear

**One model call per request, cost proportional to input size.** Summarize, answer, translate. The healthy default, and what most budgets implicitly assume. Watch for fixed per-call overhead from large tool catalogs.

**Fix:** Trim per-call overhead; keep this the default.

T(n·k) Multiplicative

**k model calls per request, and k is usually invisible.** Extended thinking can burn over a hundred thousand tokens per request while producing a few hundred visible ones. Non-composable tools that replay full context each turn can make a five-step chain cost 10 to 20x the composed version.

**Fix:** Compose tool pipelines; instrument for hidden k.

T(n·k·a) Agent-multiplicative

**An orchestrator spawns sub-agents that spawn tool calls.** The O(n²) of AI: architecturally powerful, economically dangerous if unmonitored. The danger is not delegation; it is unbounded depth and unscoped context running unwatched.

**Fix:** Bound agent depth; add circuit breakers and budgets.

T(∞) Unbounded

**Loops with no termination condition.** Retry-on-failure with no cap, recursive self-rewriting. The infinite loops of the token economy, and they exist today in production systems that lack circuit breakers.

**Fix:** Hard termination conditions and circuit breakers. Always.

### The one question

What is the token complexity class of this workload, and is that complexity justified by the value it produces?

Worked example

## The path to 34× savings {section=savings}

Summarizing ten white papers, four ways. Same task, same quality floor, roughly 34× apart in cost. None of it came from a discount.

Scenario 1 · The expensive way T(n·k)

#### Multi-chat replay · $3.04

A single chat with a flagship model forces the model to replay the entire accumulated context for every new summary. Maximum token waste, driven by interface habits rather than the task.

- ✕All ten papers stacked in one context
- ✕Every summary re-reads all prior history
- ✕Frontier model used for routine summarization

Cost decline by complexity class

**over 97%** cost reduction (~34× savings)

T(n·k) $3.04

T(n) $0.65

T(n) $0.13

T(n) $0.09

1. As described 2. Separate chats 3. Right-sized 4. Engineered

Scenario 4 · The engineered way T(n)

#### Bound output · $0.09

The same ten summaries, engineered: each choice removes a layer of waste, and the class drops from multiplicative to linear.

- ✓**Isolated contexts** kill context replay
- ✓**Right-sized model** routes summarization to an efficient tier
- ✓**Bounded template**: structured output, ~150 words, trimmed input

### The three levers in the example

Kill context replay

### Use isolated contexts

Don't stack multiple documents in one chat. Use scripts or fresh chats so you only pay for the context the current task needs.

Right-size the model

### Route by complexity

Reserve flagship models for deep reasoning and synthesis. Use efficient models for standard tasks like summarization.

Constrain the output

### Use bounded templates

Replace "summarize this" with a structured template (problem, method, findings, ~150 words) to trim the costly output axis and improve comparability.

Core concepts

## The ideas behind the notation {section=concepts}

The ladder is the vocabulary. These are the patterns it helps you see.

hidden k

### The multiplier you can't see

Unlike Big-O, where code makes complexity visible, a workload's class is often hidden. Reasoning tokens, agent depth, and retry loops rarely appear in the request itself. Spend can scale to a far higher class than the request suggests.

interface design

### Class changes come from architecture

Thirty tools collapsed behind one composable interface turns five context-replaying turns into one call. Same task, same output, an order of magnitude fewer tokens: T(n·k) becomes T(n). Not a better model, a better interface.

code as compression

### Move tasks from inference to execution

Code is the model's native language. For batch work, one generated program run in a sandbox replaces dozens of tool-calling turns: published results show roughly 80 percent fewer tokens on batch operations, same output. The operations still happen, but outside the token economy.

serialization

### Format is a cost decision

Compact tabular formats can consume roughly half the tokens of verbose ones with no quality loss. And since output tokens cost several times more than input, deterministic structure belongs in the decoder, not the generation.

transparency

### Transparency over abstraction

Credit bundles and seat licenses obscure the link between usage and cost. You cannot optimize what you cannot measure: if your tooling hides token-level telemetry, you are paying for the privilege of not knowing what you are paying for.

jevons paradox

### Efficiency gets reinvested

Cut a workload's cost and teams run it three times a day instead of once. That is the point. The effective organization will not use fewer tokens; it will use them better, with growth pointed at value.

### Architectural approaches, compared

The same work, three architectures. The class tells you how cost grows; the reduction tells you what the architecture is worth today.

| Approach | How it works | Token reduction | Class |
| --- | --- | --- | --- |
| **Standard tool calls** | Each operation is a full agent turn that replays accumulated context | baseline | `T(n·k)` |
| **Code-generation mode** | One generated script executes the batch in a sandboxed runtime | ~80% | `T(n)` |
| **Filtered retrieval (RAG done right)** | SQL, regex, and embedding search shrink input before inference | 92–99.9% | `T(log n)` |

### The "skill" concept

One pattern from practice worth naming: packaging a repeatable AI capability so its instructions are paid for once, not carried everywhere.

What is a skill?

### A repeatable AI capability

A portable folder of instructions and scripts, a consistent, opinionated, well-formed prompt that teaches a model to perform a specific task your way every time.

Key finding

### Load only when needed

Unlike a bloated system prompt riding along on every call, a skill is loaded only when relevant, so you pay for the instructions once and keep the context window clean.

Why it compounds

### Shareable across teams

Turning a good one-off prompt into a skill lets it be reused and shared across a team, version-controlled like code, producing consistent, high-quality results.

How to use it

## Putting Big-T to work {section=howto}

Big-T is a condiment, not the main dish. It rides along with decisions you already make: choosing an architecture, picking a model, explaining a spend spike.

1. **Get visibility first.** Figure out how many tokens you are consuming, on what models, for what workloads, at what cost. If you cannot answer that, you have observability work to do before optimization work. Instrumentation comes before optimization.
2. **Classify your highest-spend workloads.** Place each on the ladder. Is it linear? Is there a hidden k from reasoning tokens or context replay? Is agent depth bounded? The class is an architecture property, so read the architecture, not the invoice.
3. **Ask the one question.** Is this workload's complexity class justified by the value it produces? A higher class is not wrong; it is a cost behavior to weigh against return. Frontier agents shipping strategic features can earn their class. A convenience bot usually cannot.
4. **Change the class where architecture allows.** Compose tool pipelines, preprocess deterministically, cache toward constant, generate code for batch work. Moving one class up the ladder beats any coefficient tweak, because growth compounds and constants do not.
5. **Optimize within the class, then govern.** Apply the five levers below. Wrap agentic workloads in circuit breakers and budget thresholds. Reassess as usage grows; a class that was fine at pilot scale may not be fine at adoption scale.

### The five levers

### 1. Model routing

Send each task to the cheapest model that clears the quality floor. Same pattern as database read replicas.

### 2. Prompt engineering & serialization

Compact formats can halve token counts with no quality loss. Let the decoder handle deterministic structure instead of generating it.

### 3. Caching as a design principle

Prompt-prefix caching cuts input cost; semantic caching eliminates calls entirely. Evaluate every linear workload for reduction to constant.

### 4. Abstraction transparency

Credit bundles and seat licenses hide token economics. You cannot optimize what you cannot measure.

### 5. Workload classification & governance

Tie the highest-consumption workloads to the highest-value outcomes. Governance is alignment, not restriction.

### Who it's for

### Engineers and architects

Use the ladder when designing agent systems, tool interfaces, and pipelines. The class is set at design time, so this is where it is cheapest to change.

### Finance and platform leaders

Use it for cost attribution and governance. When a team's spend spikes, "what class is that workload, and is it justified?" is a better conversation than "spend less."

### FinOps practitioners and newcomers

You have seen this movie: unmetered cloud spend, then visibility, then optimization, then unit economics. Big-T is that same discipline arriving for tokens.

“Efficiency is not the enemy of ambition. It is what makes ambition sustainable.”

Dan Neff

A Framework for Token Efficiency

Go deeper

## Further resources {section=resources}

Big-T is being open-sourced through the Tokenomics Foundation as a community-owned framework. These companion resources are in development.

Available

### The Big-T paper

The full framework: the ladder, the compounding-demand thesis, the five levers, worked examples, and the reference token-efficiency pipeline.

[Read paper](https://www.tokeneconomics.com/docs/projects/big-t/big-t-notation-paper/)

Coming soon

### Assessment checklist

A seven-area self-assessment worksheet covering visibility, routing, prompt hygiene, caching, cost attribution, abstraction audits, and governance, with scoring guidance.

Coming soon

### Pricing calculator

Estimate what a workload costs across complexity classes and model tiers, and see what moving up the ladder is worth.

Coming soon

### Slides and infographics

A presentation deck and visuals for bringing Big-T to your team, your leadership, or your next architecture review.

Coming soon

### Podcast conversations

Dan Neff in conversation on the origins of Big-T, open-sourcing the framework, and what it looks like in practice inside a large enterprise.

Coming soon

### Token Optimization Playbook

The pragmatic companion: applied techniques mapped to each lever, from serialization to routing to caching strategy.

Big-T Notation by Dan Neff (Adobe). Published by the Tokenomics Foundation as an open, vendor-neutral framework. Supporting evidence draws on published results from Flexpa, MIT CSAIL, and others, and public research in model routing, retrieval, caching, and serialization.
