---
author: Dan Neff (Adobe)
kind: paper
license: CC-BY-4.0
modified: 2026-07-28
slug: big-t-notation-paper
source_url: https://www.tokeneconomics.com/docs/projects/big-t/big-t-notation-paper/
status: Working Draft
status_date: June 2026
status_source: page
title: Big-T Notation Paper
word_count: 3749
---

# Big-T Notation Paper

## A Framework for Token Efficiency {section=a-framework-for-token-efficiency}

*Dan Neff (Adobe) Published by the Tokenomics Foundation*

Big-T lays out a methodology for classifying workloads based on how their token consumption grows as usage scales, complexity increases, or autonomy expands as a precursor to activities like choosing a model. It groups a workload into a category of behavior that lets engineers make decisions without benchmarking every input.

This playbook has three audiences. Engineers and architects will find the deepest implementation guidance in Section 3 onward. Finance and platform leaders will find governance and cost attribution addressed most directly in Section 7. And if you’re new to AI token consumption, you’re the reason this exists: the FinOps parallels in each section will translate these concepts into familiar territory.

The framework builds section by section, so each audience will get the most from a full read.

| **Abstract** Every generation of computing has a unit of scarcity that engineers learn to measure and optimize.Big-O notationgave us the method for it, a shared language for how an algorithm’s time and space requirements grow with input size. The same discipline later carried to the constraints that followed: API calls, egress bytes, the cloud line items that decided whether a company’s economics worked. For large language models, that unit of scarcity is the token. Complexity thinking has been applied to AI before, but almost always to training: the cost of learning a model. How many tokens the deployed model consumes each time it answers a request for a workload is a different question, and it has had no vocabulary of its own. Big-T Notation gives it one. It applies Big-O’s way of reasoning to how token consumption grows as usage grows, so teams can reason about token cost before the invoice arrives. Token efficiency sounds like premature optimization. It is not. It is an architectural discipline that organizations need to build alongside AI literacy, because the forces driving token demand are compounding faster than the forces reducing token price. Organizations that scale AI adoption without token-aware architecture will discover they have built the equivalent of an O(n!) algorithm and called it a strategy. |
| --- |

## 1. The scarcity that shapes systems {section=1-the-scarcity-that-shapes-systems}

Software engineering has always been shaped by whatever resource was scarce. The mainframe era: memory. The client-server era: network bandwidth. The cloud era: API calls, compute-hours, storage tiers. In each transition, engineers who understood the new constraint built systems that scaled, and engineers who ignored it built systems that bankrupted their sponsors.

Tokens are the constraint in AI-native computing. Every model interaction is metered in tokens: prompts, completions, reasoning steps, tool calls. Tokens determine cost. They determine latency. They determine what fits in a context window and what gets truncated, and whether a workload can run on a small efficient model or requires a frontier model at many times the cost.

Most organizations treat tokens the way early web developers treated database queries: as an implementation detail someone else will worry about later. The problem is not that tokens are expensive. The problem is that token consumption compounds in ways that are structurally hard to predict and politically hard to govern.

## 2. Big-T Notation: the framework {section=2-big-t-notation-the-framework}

### 2.1 The parallel to Big-O

Big-T measures the cost of using a model, not training one. Big-O does not tell you the exact runtime of an algorithm. It tells you how runtime grows as input scales. An O(n log n) sort is not a prediction; it is a category of behavior that lets engineers make decisions without benchmarking every input.

Big-T applies the same principle to tokens. It does not predict exact token counts. It categorizes workloads by how their token consumption grows as usage scales, complexity increases, or autonomy expands.

***A note on n.****n covers two things that often move together: count (how many requests hit the workload) and size (how large each request’s input is). Either or both can be the dimension that scales, in any class. What the class tells you is how model token consumption responds as that dimension grows. The variable is deliberately loose; Big-T is a thinking tool, not a formula, and the point is to name what is scaling before asking how fast.*

### 2.2 The Big-T complexity ladder

The ladder orders workloads the way Big-O orders algorithms, by growth rate: how token consumption grows as usage scales, from slowest-growing at the top to fastest at the bottom. Descending the ladder, the growth compounds. Each step down adds a multiplier, k over n, then a again, until T(∞) removes the ceiling entirely. That compounding is what makes the lower rungs expensive; a class that multiplies turns a modest per-request cost into a bill that climbs far faster than usage does. The risk is sharpened by concealment. As in Big-O, a higher class is not wrong; it is a category of behavior to weigh against the value it returns. But unlike Big-O, where the code makes the complexity visible, a workload’s class is often hidden, because the multipliers that set it (reasoning tokens, agent depth, retry loops) rarely appear in the request itself. Spend can scale to a far higher class than the request suggests.

A few notes on each:

**T(1): Constant.** Token cost does not grow with usage, because the model is not invoked per request. These are the O(1) of AI.

**T(log n): Sublinear.** The class most organizations miss entirely. The tokens that deterministic filtering removes are never processed at all, so as the data corpus grows, tokens reaching the model grow slowly or stay nearly constant. This is RAG delivered correctly: not a way to add knowledge to a model, but a way to keep token consumption from scaling with data volume. The published numbers are concrete: SQL views shrinking clinical data from roughly 240,000 tokens to 19,000 (a 92 percent reduction) before the model is called; retrieval pipelines reducing a million-token corpus to a few hundred tokens of relevant context (better than 99.9 percent elimination), with the relevant context staying near 250 to 350 tokens whether the source is two thousand tokens or two million.

**T(n): Linear.** Token cost scales linearly with requests or input size, the O(n) of AI, and this is what most organizations implicitly assume when budgeting. Many linear workloads still carry a fixed overhead on every call: when an agent loads its full tool catalog into context (schema, descriptions, parameters for every tool), those tokens are spent before any work begins. The workload stays linear, but that overhead is a fixed tax paid on every call whether it uses one tool or none, and when it is large relative to the useful work it can dominate the bill.

**T(n·k): Multiplicative.** The critical insight is that k is often invisible. Extended thinking can consume well over a hundred thousand tokens per request while producing a few hundred tokens of visible response. Tool composability is a hidden driver: when tools cannot pipe results directly into one another, the agent replays the full accumulated context on every intermediate turn, and a five-step chain can cost ten to twenty times the tokens of the same five steps in a single composed pipeline. The tools did the same work. Token cost was set by interface architecture, not the task.

**T(n·k·a): Agent-multiplicative.** A developer running several agent windows, each with sub-agents executing a task list, is consuming n times k times a tokens, where a is agent tree depth. Delegation does not change the class: a sub-agent per item is the same class as a loop over the items inside one agent. What good sub-agent design changes is the constants. Each invocation starts a fresh context scoped to one sub-problem (a smaller effective n per call) and the orchestration boundary is a natural place to route to a cheaper model. That is optimization within the class, not escape from it. The danger is not delegation; it is unbounded depth and unscoped context running unmonitored.

**T(∞): Unbounded.** These are not hypothetical. They exist today in production systems that lack circuit breakers.

### 2.3 What Big-T is not

Big-T is not a formal mathematical system. There are no proofs and no master theorem. It is a thinking tool: a shared vocabulary that lets engineers, architects, and finance teams reason about token-cost trajectories before committing to an architecture. The value is not precision. The value is the discipline of asking, “what is the token complexity class of this workload?” before deploying it.

Big-T also does not measure constants, and this is inherited from Big-O deliberately. Halving token volume through better serialization, halving price per token through model choice or quantization, or holding quality while spending less are all coefficient improvements: economically material, invisible to the class, and covered by the levers in Section 4. Unlike Big-O, Big-T’s constants can span orders of magnitude, with 5 to 20x price spreads across model tiers within a single generation. However, the class still governs, because constants are bounded and reversible while growth is neither. The framework is two questions asked in order. First, what class is this workload? That is an architecture decision, and only architecture changes it. Second, how cheaply does it run within its class? That is where compression, routing, caching, and serialization live. Classes are compared at a stated quality floor; quality is the precondition of the comparison, not a term in it.

### 2.4 Worked example: complexity reduction through interface design

The practical value shows up in a real decision teams make today: how to expose tool capabilities to an agent.

The naive architecture. An agent has access to thirty tools via individual definitions, each loaded into context with schema, description, and parameters. The agent needs to chain five tools. Because the tools are not composable, each intermediate result returns to the agent, gets interpreted, and re-dispatches as a new call. Every round trip replays full context: all thirty tool definitions plus growing history. The token profile is a large constant overhead multiplied across five turns, and the number of turns is driven by interface limitations, not task complexity.

The refactored architecture. The same thirty tools collapse behind a single interface: one tool that accepts a structured command sequence and runs the pipeline internally. The agent composes the full five-step operation in one call. One tool definition instead of thirty, one turn instead of five, no intermediate context replay. The task is identical. The output is identical. Token consumption drops by an order of magnitude, moving the workload from T(n·k) to T(n). Not through a better model, a shorter prompt, or a cheaper provider, but through interface design.

### 2.5 Worked example: code generation as native compression

A second pattern comes from recognizing what models are actually good at producing.

The standard way for an agent to perform a batch operation, say creating thirty-one calendar events, is thirty-one individual tool calls, each a round trip that replays accumulated context. Code-generation takes a different path: the agent writes one short program (a loop that iterates over the dates and makes the calls), which executes in a sandboxed runtime. One generation step replaces thirty-one agent turns. Published results from this pattern show roughly a third fewer tokens on simple single-operation tasks and around 80 percent fewer on the batch case, with the same output and the same backend calls.

The reason is that code is the model’s native language. Models are trained on vast amounts of it. When the output format is code (loops, conditionals, variables, function calls), the model operates in a representation that is both more compressed and more precise than the equivalent natural-language tool invocations. In Big-T terms, tool-calling for a batch of operations is multiplicative, each operation needing a full turn with context replay; code-generation is linear, one step producing a program whose execution cost is borne by compute runtime rather than inference. The operations still happen, but outside the token economy.

## 3. The compounding-demand thesis {section=3-the-compounding-demand-thesis}

Token efficiency is urgent because four demand waves are stacking at once. Any one of them would increase enterprise token consumption. Together, they compound.

**Wave 1: Frontier models are more capable and more expensive per task.** The most capable models produce the highest-quality output and consume the most tokens doing it. Extended thinking, chain-of-thought reasoning, and multi-step tool use are token multipliers, not free features. The capability frontier and the cost frontier move in the same direction. This does not make frontier models wasteful; it makes model choice an architectural decision rather than a default. A linear workload run on a frontier reasoning model quietly becomes multiplicative, the extra tokens consumed inside the reasoning loop, invisible to the user and visible only on the invoice.

**Wave 2: Larger context windows invite larger prompts.** Windows have expanded by orders of magnitude in a few years. Larger windows are genuinely useful, but they also enable laziness. When the window is small, engineers are forced to be selective. When it is large, the path of least resistance is to dump everything in and let the model sort it out.

**Wave 3: Agentic architectures multiply calls per task.** Single-turn question-and-answer is linear. Agentic workflows with planning, tool use, and iterative refinement are multiplicative or worse. The frontier of capability is moving toward agent architectures, and the frontier of token consumption is moving with it.

**Wave 4: Adoption is compounding.** Each additional user, use case, and agent adds to the token baseline. The small fraction of heavy users consuming the majority of tokens today becomes a larger fraction as literacy spreads and tooling improves.

## 4. Five levers for token efficiency {section=4-five-levers-for-token-efficiency}

**Lever 1: Model routing.** Not every task needs a frontier model. Learned routers have demonstrated large cost reductions while holding output quality, and routing is now productized in several platforms. Picture a quality floor (minimum acceptable output quality) and a cost ceiling (maximum acceptable spend); routing finds the cheapest model that clears the floor. Same pattern as database read replicas: send traffic to the cheapest resource that can serve it correctly. The routing layer is also a natural injection point for observability. Because every model call passes through the router, deploying cost attribution and request tagging here achieves double-duty: optimization and visibility.

**Lever 2: Prompt engineering and serialization.** Structured prompting produces substantial gains: extracting only the conceptually relevant sections of a document, compressing summaries to higher information density, encoding repeated patterns more compactly. Serialization is overlooked and often the single largest driver for data-heavy workloads: compact tabular formats can consume roughly half the tokens of verbose ones with no quality loss, and poor serialization routinely wastes a large share of available tokens on formatting overhead alone. On output, the asymmetry in pricing makes compression more valuable still: output tokens cost several times more than input tokens across major providers, so deterministic schema elements should be handled by the decoder rather than generated.

**Lever 3: Caching as a design principle.** Caching is the most underused lever. Prompt caching (reusing a cached prompt prefix across calls) can sharply cut input cost for workloads with stable system prompts. Semantic caching (matching similar queries to already-computed responses) can eliminate model calls entirely for high-frequency, low-variance requests. If you have run a CDN or a query cache, you already know the shape of this: any linear workload should be evaluated for whether caching reduces it to constant for the common case, with linear as the fallback on a miss.

**Lever 4: Abstraction transparency.** Credit-based pricing, seat licenses, and bundled “unlimited AI” plans obscure the relationship between usage and cost. Abstraction serves a purpose, but it blocks optimization, because you cannot improve what you cannot measure. The principle is provider-neutral: any abstraction that prevents you from seeing token-level economics also prevents you from optimizing them. Token-aware organizations treat AI billing the way mature organizations treat cloud billing: per-call metering, cost attribution to teams and projects, anomaly detection on consumption spikes, and dashboards that make unit economics visible. If your tooling does not expose token-level telemetry, you are paying for the privilege of not knowing what you are paying for.

**Lever 5: Workload classification and governance.** Not all token consumption is equal. A developer shipping a high-priority feature with an agent consumes tokens against a strategic objective; a summarization bot running on every routine standup consumes tokens against a convenience objective. Both show up as “AI usage,” but only one has a defensible return. Governance is not about restricting usage. It is about making sure the highest-consumption workloads align with the highest-value outcomes. The small group of users consuming a large share of tokens are probably the organization’s most strategically productive AI users. The problem is not knowing whether that is true, and having no mechanism to find out.

### The constraint efficiency cannot solve

The five levers operate inside the token economy. They reduce volume, lower unit cost, and improve visibility, and they are necessary for scaling agentic AI. They are not sufficient. As an organization moves from a small group of power users to broad daily agentic adoption, pressure cascades into every system those agents touch. A human using a system of record makes a handful of API calls per session; an agent orchestrating across sub-agents can hit the same API hundreds of times in a single task. Those systems were built for human-speed access patterns, with rate limits and pagination that assume a user who clicks, reads, thinks, and clicks again. Agentic access looks like a batch job running at API speed, but without batch-job predictability. An organization that achieves excellent token efficiency but runs agents against a system of record with tight rate limits has not solved the scaling problem. It has moved the bottleneck. That is a different problem with a different solution space (gateway design, rate-limit negotiation, read replicas, dedicated agent service accounts), and it sits outside the token-optimization boundary.

## 5. Efficiency and literacy {section=5-efficiency-and-literacy}

There is a real tension between accelerating AI literacy and managing token cost. Literacy programs encourage experimentation, experimentation consumes tokens, and restricting tokens suppresses the learning that produces an organization’s most capable AI users. The resolution is not choosing one over the other. It is sequencing them correctly.

Literacy is the prerequisite. Without it, efficiency is meaningless, because there is nothing to optimize. Leadership priority should stay on literacy. But literacy without efficiency is a road to uncontrolled spend: as users progress from casual use to integrated daily workflows to agent-directed architectures, per-user consumption can rise a hundredfold or more. An organization that scales literacy without parallel investment in token-aware architecture will meet a cost curve that bends sharply upward exactly when adoption reaches its inflection point.

The framing that works: efficiency is not the opposite of adoption. Efficiency is what makes adoption sustainable. The effective organization will not use fewer tokens. It will use them better.

## 6. Reference architecture: the token-efficiency pipeline {section=6-reference-architecture-the-token-efficiency-pipeline}

The five levers compose into a pipeline where each layer reduces the workload for the next, and the effective Big-T complexity drops as a request moves down the stack. The pipeline reads top to bottom; each layer peels off a class of waste before the next layer sees the workload.

1. **Deterministic preprocessing.** SQL filters, embedding retrieval, regex, structured transforms. Eliminates the majority of tokens before any model is invoked. Reduces toward T(log n).
2. **Cache check.** Semantic cache and prompt-prefix cache. A hit returns immediately at T(1), bypassing every downstream layer; a miss continues.
3. **Model router.** Classify task complexity and route to the appropriate model tier. Reduces cost per token, not volume.
4. **Prompt architecture.** Serialization optimization, system-prompt deduplication, output-format constraints. Reduces input and output token volume.
5. **Inference.** The tokens that reach the model are the minimum necessary.
6. **Output-mode selection.** Direct response for simple tasks; code-generation into a sandboxed runtime for batch or repetitive operations, which offloads the multiplicative factor from inference to execution.

An instrumentation-and-governance plane (telemetry, cost attribution, circuit breakers, budget thresholds) wraps all six layers. Without it, no layer is measurable and no optimization is verifiable. The systems-of-record layer sits below and outside the optimization boundary, a reminder that the pipeline addresses token efficiency but not the downstream access-pattern problem.

## 7. Assessment checklist {section=7-assessment-checklist}

Big-T becomes operational through a seven-area self-assessment, published as a companion worksheet, the Big-T Assessment Checklist. Each area maps to a lever or class discussed above:

- **Visibility.** Do you know your token consumption by model, workload, and cost, and the complexity class of your highest-spend workloads?
- **Model routing.** Do you route each task to the cheapest model that serves it, or run everything on one model?
- **Prompt hygiene.** Is every token you send doing useful work, or are prompts, examples, raw context, and tool definitions riding along unearned?
- **Caching strategy.** Have you found the high-repetition, stable-input workloads and cached them toward constant cost?
- **Cost attribution.** Can you tie token cost to the teams, customers, or projects driving it, and see whether your biggest consumers are your biggest contributors?
- **Abstraction audit.** Do credit- or seat-based contracts hide per-workload cost, and can you compare the unit economics of alternatives?
- **Governance model.** Do you have circuit breakers, budget thresholds, and a way to tell high-value consumption from low-value?

The worksheet carries the full questions, a scoring method, and guidance on reading results over successive rounds rather than as a one-time total. Instrumentation comes before optimization, so the assessment starts with visibility.

## 8. Conclusion {section=8-conclusion}

The industry is in the early stages of what looks like a Jevons paradox. Per-token costs are falling and total consumption is exploding. The directional pressure is clear: organizations that treat tokens as an undifferentiated commodity will end up where companies landed when they moved to the cloud without cost governance, surprised by the bill and unable to trace it to value.

Big-T Notation is not a solution. It is a starting point: shared language for reasoning about token complexity before it becomes a financial crisis. The framework is deliberately informal, because the field moves too fast for rigid formalism. What it provides is the discipline of asking the right question at the right time. What is the token complexity class of this workload, and is that complexity justified by the value it produces?

Efficiency is not the enemy of ambition. It is what makes ambition sustainable.

*Big-T Notation by Dan Neff (Adobe). Published by the Tokenomics Foundation as an open, vendor-neutral framework. Supporting evidence draws on published results from Flexpa, MIT CSAIL, and others, and on public research in model routing, retrieval, caching, and serialization.*
