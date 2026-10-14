---
author: Tokenomics Foundation Consumption Working Group
kind: project
license: CC-BY-4.0
modified: 2026-09-24
slug: cache-explainer
source_url: https://www.tokeneconomics.com/cache-explainer/
status: Release Candidate 1
status_date: 2026-09-22
status_source: page
title: AI Tokenomics Prompt Cache Explainer
word_count: 3054
---

# AI Tokenomics Prompt Cache Explainer

## Overview {section=overview}

AI Tokenomics Optimization Playbook · Layer 3 companion

Caching is one of the highest-leverage levers in AI tokenomics, and yet the benefit is easily undone by a single line of text in the wrong place. Here is how caching works, and how to monitor, measure, and optimize it.

  Reused from cache: billed at a fraction of standard input  Recomputed every request: billed in full

The mechanics are vendor-neutral. The provider behavior sections cite public documentation as reviewed August 2026. Published by the Tokenomics Foundation.

Interactive · Prompt structure

## Drag the blocks, watch the money move {section=tcsimulator}

What does it look like when you control the entire prompt? Below is a realistic request: a tool-heavy assistant with a large system prompt, retrieved documents, and a running conversation. Grab the blue six-dot handle on any block and drag it to a new order. The prefix cache behavior is simulated, matching from the top until it reaches the first thing that is not identical to last time.

### Request composition

Set how each block behaves between two consecutive requests. *Grows at the end* is the conversation case: earlier turns are reusable, the newest turn is not, and nothing after it can be cached.

Cached prefix

0

Recomputed

0

Input from cache

0%

Effective input cost

1.00×

Cost index assumes a cache read bills at roughly a tenth of standard input, the common order of magnitude across providers. Substitute your own contract rate; the shape of the curve does not change. Note the ceiling: because conversation history grows, a live chat never reaches 100%.

Start here

## Cache hits are almost free wins... except that they aren't free {section=tctheonething}

A cache hit is nearly free. A cache miss costs full price. The key point of cache optimization is raising how often you hit, without paying to write entries that are never read.

That framing is true whether you run your own inference servers or send every request to a hosted API.

Three very similar names circulate for this simple idea at different levels. All three mean the same founding instinct of AI tokenomics: do not recompute tokens you have already seen.

Inside the engine

### KV cache

Attention state computed for a request, held so the model skips recomputing past tokens while it generates a response. Per-request by default; the two caches below extend that state across requests.

You run the cache

### Prefix cache

KV cache reused across requests. As long as the next request starts with the same run of tokens as the last one, the engine picks up where the last one left off. Self-hosted serving stacks call this prefix caching, and you tune the cache size, the block size, the lifetime, the eviction TTL, etc.

The provider runs the cache

### Prompt cache

The same mechanism sold through a model provider's API: essentially a synonym for prefix caching, run for you. The trade-off is that you have very little control over the tuning options in exchange for not running the inference servers.

This is what the rest of this document means by a prompt cache. The catch is that a prefix cache / prompt cache is not a semantic cache, so it does not remember *ideas*. It remembers a **literal sequence of tokens, starting from the very first one**. Reuse stops at the first character that differs. Everything after that point is recomputed and billed in full, no matter how much of it is identical to last time.

The mechanics

## Three rules govern every prompt cache you will use {section=tcthreerules}

Rule 1

### It matches from the start

A cache can only reuse the run of tokens beginning at position zero. There is no matching a chunk from the middle. Change token 12 of a 30,000-token prompt and you have thrown away 29,988 tokens of reuse.

Rule 2

### It matches exactly

Not semantically, not approximately. A different timestamp, a re-serialized JSON key order, an extra newline, a swapped tool description: all misses. Anything that regenerates your prompt non-deterministically is a cache bug.

Rule 3

### It matches in blocks, and it expires

Reuse is granted in chunks, not single tokens, so a prefix shorter than one block buys nothing. Entries also age out after a short idle window, which is why low-traffic workloads can hold a perfect prompt and still miss constantly.

Read those three together and the design rule writes itself: **stable content first, growing content next, per-request content last.** One more constraint sits on top of all three, and it is the one non-technical users hit first: a cache entry belongs to **one model**. More on that shortly.

Monitoring

## Measuring prefix caching {section=tcmonitoring}

The concept above is testable, which is where AI tokenomics turns from idea into practice: every major provider returns token counts broken out by type on each response, and every gateway and observability tool worth using will log them. The specific fields you use to pull these metrics may differ, but the meaning or equations will not. Once you are logging these three fields, the two metrics below are arithmetic on them.

| Bucket | What it counts | How it bills | What it tells you |
| --- | --- | --- | --- |
| **Cache read** | Prefix tokens served from an existing cache entry | A small fraction of standard input | The win. This is the number you are trying to grow. |
| **Cache write** | Tokens written into the cache on a miss | A *premium* over standard input | An investment. It pays back only if that entry is read again, ideally many times. |
| **Uncached input** | Everything after the reusable prefix | Standard input rate | Your volatile tail. Shrinking it is another angle to improve efficiency. |

Treat a cache write as paying to put inventory on a shelf, and a cache read as pulling it back off. Two metrics read that inventory, one for coverage and one for payback.

Metric one · coverage

### Cache hit rate

`Cache hit rate = cache read / (cache read + cache write + uncached input)`

One number, built from the three buckets above, bounded between 0 and 100%. Bounded is what makes it *composable*: you can average it, roll it up across teams and workloads, and put it on the same slide as any other percentage. An unbounded ratio ("3,400% reuse") means nothing to a human reader and cannot be averaged. This is unfortunately a metric that is reported by default by many model providers.

Metric two · payback

### Cache cost efficiency

`Cache cost efficiency = 1 − actual prompt cost / uncached equivalent cost`

`uncached equivalent cost = (cache read + cache write + uncached input) × base input price`

The fraction of prompt spend that caching actually avoided. Cache cost efficiency is **zero at break-even**: the write premium exactly repaid. Positive once paying the cache surcharge is worth it, negative when caching is losing you money. That scale is what you want while tuning: a direct comparison that holds across tuning option changes, like choosing the more expensive high TTL cache.

However, this metric assumes you can get the *actual* prompt cost, which is easy on the direct API, murky on subscription plans, and impossible where the provider reports no write bucket. Keep in mind that the three buckets are not the whole invoice: output tokens, batch and committed-use discounts, and contracted rates all sit outside this input-side ratio.

Compare both *per workload*, not blended, and re-check the assumptions whenever a model version or provider price list changes; they can move without notice. Note which providers price caching in different kinds, not just different rates: some charge per token written, one charges storage per token-hour.

What good looks like

### Cache hit rate: climb toward your workload's ceiling

Cache hit rate is coverage, driven mostly by prompt ordering. A live chat can never reach 100% because the conversation grows, so track the trend against the structural ceiling, not toward perfection. A flat or falling line while volumes grow means something upstream started breaking the prefix.

What good looks like

### Cache cost efficiency: clearly above zero

A cache that is paying for itself sits well above zero, which means each cached entry is read back many times before it expires. A workload hovering just over zero is doing payback-once work: rare hits, misconfigured prompt ordering, or very short sessions could cause this.

One caveat that decides which metric you can even compute: you have to have the granular usage data. On the direct API that arrives on every response; on subscription plans and third-party harnesses they may not surface at all, which is the observability ladder in the access-modes section below.

Coming next: AI moves fast, and next we need to create a dedicated section on routing and caching together. Provider caches are machine-local, so a hit is a property of the prompt *and* of which machine answers. However, recently, cache affinity fields and cross-machine cache offload have appeared in both frontier and self-hosted flavors to address this.

The one everybody hits

## Every model has its own cache (and switching models clears it) {section=tcmodelswitching}

A cache entry belongs to exactly one model. If you point the same conversation to a different model mid-conversation, none of it is cached there. At that point, the entire prompt is re-read and billed in full. If you expect the conversation to continue for a long time, this may still be a good decision.

Switch model?

Your next response will be slower and use more tokens. This conversation is cached for the current model. Switching means the full history gets re-read on your next message.

CancelSwitch anyway

Some tools now warn you before this happens.

The same reset fires whenever the model on the other end of the request changes, and it usually happens without a dialog:

### You switch mid-task

Escalating a long conversation to a stronger model re-reads everything. The longer you have been working, the more the switch costs. Switch early in a task, not deep into one. Or ask your current session for a summary and a clear hand-off to restart the session.

### Your provider ships an update

A new model version invalidates cached prefixes across your whole fleet, overnight, with no change on your side. Hit rate can fall off a cliff for reasons nobody on your team caused.

### Your router spreads the load

Fallbacks, A/B tests, and cost-based routing split one warm cache into several cold ones. Routing and caching pull against each other; a router that saves 20% when switching to a less-expensive model can lose more than that in missing a warm cache.

**What to do about it.** Pin model versions where your provider allows it, so updates are something you schedule rather than something you discover. Provide any API headers required to control cache behavior. If you have a long session, stay with one model unless the switch is genuinely worth re-reading everything. And when you compare routing strategies, compare *effective* cost including lost cache reads, not list rates. The cheaper model is not always the cheaper session, a core AI tokenomics lesson to learn with regards to routing.

Access modes

## The same model caches very differently depending on how you reach it {section=tcaccessmodes}

Mechanics and AI tokenomics are one thing; **observability** is another. Your leverage over the cache, and even your ability to see it, depends on which door you walk in through. Below, "first-party tools" means the provider's own harness (a terminal coding agent, a co-work assistant); "third-party tools" means a product that rehosts frontier models behind its own subscription or its own proxy.

| Access mode | Who controls the prompt structure | What you can see | Where cache economics show up |
| --- | --- | --- | --- |
| **Web UI / chat app** | The provider's harness, entirely. You never see the prompt it assembles. | No token counts at all. Plan limits and usage meters, not cache fields. | Invisible, deliberately: caching is folded into plan economics, not surfaced to you. |
| **First-party tools** | The vendor's harness, with a few dials (rules files, MCP config, compaction behavior). | Session-level token dashboards and cost estimates, cache read and write buckets included on some tools. But dollar figures are often computed locally at list rates, not what you actually pay. | Visible per session, cost estimates. Cache-miss behaviors may be flagged as a nudge; the harness manages breakpoints for you. |
| **Third-party tools** | The vendor. The prompt is assembled by their proxy, not by you. | Opaque by design. Credits or requests burned, not token buckets. Which model actually served a request can change mid-plan. | Bundle economics. Cache savings are netted into the credit pool and aren't always visible in real-time. |
| **Direct API** | You do, down to byte order and breakpoint placement. | Full usage fields on every response, every bucket, every request. | On your invoice, line by line. Full control, full responsibility, no surprises hidden upstream. |

**Where reality diverges from expectation.** A few traps that catch almost everyone:

### The dollar figure is an estimate

Coding tools that show a session cost usually compute it locally at standard list rates. Contracted discounts, promotional pricing, and plan-based billing all make the real number different. Treat the in-tool figure as a shape, not an invoice.

### Subscription usage is not priced usage

On a flat plan, cache misses show up as rate limits instead of line items. Costs are still real (the provider passes them through as capacity limits), but the feedback channel is throttling, not billing, and it tells you nothing about *why*.

### Subagents do not share your cache

Provider caches are isolated per organization, per workspace, per region. Within your org, a fleet of subagents with the same system prompt *can* reuse one prefix, but routing is machine-local at high volume, and a parallel fan-out all misses at once: an entry only becomes available after the first response begins, and every sibling pays its own write.

Also note the clock: on at least one major provider the cache lifetime ages from the *start* of the request that touches it, not the end. A long reasoning stream can burn most of the lifetime before the follow-up request is even typed.

Provider behavior

## The frontier providers agree on almost nothing {section=tcprovidersnapshot}

This is a snapshot of a few frontier API providers' published cache behavior, as documented in public provider documentation reviewed August 2026. It is a snapshot, not a spec: multipliers, minimums, and lifetimes move when models ship, and they can move without notice. Verify against the current provider docs before relying on any row.

| Provider (docs reviewed Aug 2026) | Cache write charge | Cache read charge | Minimum cacheable prefix | Lifetime and notes |
| --- | --- | --- | --- | --- |
| **Anthropic** (Claude API) | 1.25× base (5-minute TTL) or 2× (1-hour TTL). Caching is opt-in: explicit breakpoints, or a single automatic caching flag. | 0.1× base | Model-dependent: 512 to 4,096 tokens. Too short? No error, just silently no cache. | 5 min or 1 hour, refreshed free on each read. Ages from request start. 20-block lookback finds prior writes. Isolated per workspace. |
| **OpenAI** (OpenAI platform) | **Changed with the GPT-5.6 series (July 2026): now 1.25× base.** Earlier models: no write charge. On the new models, explicit breakpoints, or an implicit mode you opt into. | 0.1× base on GPT-5.6 and later; model-dependent cached rates on earlier models (advertised up to 90% off). | 1,024 visible tokens (GPT-5.6 and later), 2,048 earlier. Hidden harness tokens do not count toward the minimum. | At least 30 minutes after the latest write or reuse. Automatic caching on by default; a cache-hit-rate dashboard exists. Overflow routing can evict entries. Isolated per organization and region. |
| **Google** (Gemini API) | No write charge. Implicit caching only on current models: enabled by default, nothing to configure. | Read discount passed through automatically; explicit cache objects exist on the older request style. | Model-dependent: 2,048 to 4,096 input tokens. | Provider-managed, not exposed. The usage report shows a single cached-tokens field; there is no write bucket to measure. |

**The gap that matters most:** OpenAI charging for cache writes is a 2026 change that caught informed teams by surprise; caching literature written before July 2026 still describes write-free prefixes as a structural difference between vendors, which is incorrect.

### Hidden tokens shape the prefix before you do

Any hosted or third-party harness inserts its own system message ahead of your first token, and that hidden content occupies the head of the prefix. What you believe is "the start of your prompt" is not where the cache's notion of the start begins.

### Thinking tokens and tool outputs

Reasoning tokens are mostly invisible in billing: Anthropic cannot mark them as cache breakpoints directly, but caches them inside earlier turns, where they count as input tokens when read back. Tool outputs are ordinary cached blocks once appended. Either way, everything after the first changed token misses, including when a harness compacts your history for you.

### Context compression, caching and retries

Initial research from Tokenomics members like PointFive (blog) and Quesma (blog) are showing that context compression utilities aren't always a clear win for all workloads. Is it possible to generate completely free wins using compression with no trade-offs? Or is the current maturity of agentic post-training not able to adapt to inputs drifting too far from unoptimized datasets?

Source: public provider documentation pages on prompt caching and context caching, reviewed August 2026, plus one vendor-published cache-hit dashboard. Figures are the providers' published multipliers, not contract quotes. The documentation locations move; search the provider name plus "prompt caching" rather than trusting a bookmark.

Published by the Tokenomics Foundation as an open, vendor-neutral resource. CC BY 4.0.

Prompt Caching · Release Candidate 1 · Last updated: 2026-09-22

Thanks to all of the members of the Consumption Working Group for Sprint 1: Aaron Soto, Alan Hand, Ali Hosseini, Bartosz Kotrys, Chris Niemann, Humair Khan, Izhak Zimmermann, James Hall, Jeremy Chaplin, Joshua Bauman, Kevin Mueller, Luis Lazo, Matt Small, Sebastian Amrogowicz, Tara Urso, and Vitaly Belyasov.
