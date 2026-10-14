---
collection: glossary
count: 17
---

# Glossary

## Token {slug=token}

- definition: the atomic unit of AI; the chunk of text a model reads and writes, and the basis for most AI billing.
- provenance.document: what-is-tokenomics
- provenance.section: terminology-reference
- provenance.source_url: https://www.tokeneconomics.com/docs/overview/what-is-tokenomics/
- provenance.license: CC-BY-4.0

## AI factory {slug=ai-factory}

- definition: AI infrastructure understood as a manufacturing operation that turns energy and capital into tokens.
- provenance.document: what-is-tokenomics
- provenance.section: terminology-reference
- provenance.source_url: https://www.tokeneconomics.com/docs/overview/what-is-tokenomics/
- provenance.license: CC-BY-4.0

## Inference {slug=inference}

- definition: running a trained model to produce outputs, the steady-state activity that consumes tokens, as opposed to training or fine-tuning.
- provenance.document: what-is-tokenomics
- provenance.section: terminology-reference
- provenance.source_url: https://www.tokeneconomics.com/docs/overview/what-is-tokenomics/
- provenance.license: CC-BY-4.0

## Cost per token {slug=cost-per-token}

- definition: the cost of producing one token, hardware cost divided by tokens produced; an output metric that reflects true infrastructure return, as opposed to input metrics like cost per GPU hour or floating-point operations per dollar.
- provenance.document: what-is-tokenomics
- provenance.section: terminology-reference
- provenance.source_url: https://www.tokeneconomics.com/docs/overview/what-is-tokenomics/
- provenance.license: CC-BY-4.0

## Interactivity {slug=interactivity}

- definition: the speed at which tokens arrive, measured as tokens per second per user; one of the two axes of token value, alongside intelligence.
- provenance.document: what-is-tokenomics
- provenance.section: terminology-reference
- provenance.source_url: https://www.tokeneconomics.com/docs/overview/what-is-tokenomics/
- provenance.license: CC-BY-4.0

## Reasoning (thinking) tokens {slug=reasoning-thinking-tokens}

- definition: tokens a reasoning model generates internally to work through a problem, not shown to the user but still produced, paid for, and counted in demand.
- provenance.document: what-is-tokenomics
- provenance.section: terminology-reference
- provenance.source_url: https://www.tokeneconomics.com/docs/overview/what-is-tokenomics/
- provenance.license: CC-BY-4.0

## Agentic workload {slug=agentic-workload}

- definition: a workflow in which AI takes multiple turns with software and other agents from a single prompt, multiplying model calls and token demand.
- provenance.document: what-is-tokenomics
- provenance.section: terminology-reference
- provenance.source_url: https://www.tokeneconomics.com/docs/overview/what-is-tokenomics/
- provenance.license: CC-BY-4.0

## KV cache (key-value cache) {slug=kv-cache-key-value-cache}

- definition: a model’s working memory of the current conversation; a major and often-hidden driver of inference cost.
- provenance.document: what-is-tokenomics
- provenance.section: terminology-reference
- provenance.source_url: https://www.tokeneconomics.com/docs/overview/what-is-tokenomics/
- provenance.license: CC-BY-4.0

## Context window {slug=context-window}

- definition: how much a model holds in mind at once, measured in tokens; modern windows reach into the millions.
- provenance.document: what-is-tokenomics
- provenance.section: terminology-reference
- provenance.source_url: https://www.tokeneconomics.com/docs/overview/what-is-tokenomics/
- provenance.license: CC-BY-4.0

## Model routing {slug=model-routing}

- definition: automatically sending each request to the most appropriate, often cheapest adequate, model.
- provenance.document: what-is-tokenomics
- provenance.section: terminology-reference
- provenance.source_url: https://www.tokeneconomics.com/docs/overview/what-is-tokenomics/
- provenance.license: CC-BY-4.0

## Quantization {slug=quantization}

- definition: reducing numerical precision to fit more work onto the same hardware, trading a little quality for more capacity.
- provenance.document: what-is-tokenomics
- provenance.section: terminology-reference
- provenance.source_url: https://www.tokeneconomics.com/docs/overview/what-is-tokenomics/
- provenance.license: CC-BY-4.0

## Tokenmaxing {slug=tokenmaxing}

- definition: the now-cautionary habit of running everything through the most powerful model because tokens felt free.
- provenance.document: what-is-tokenomics
- provenance.section: terminology-reference
- provenance.source_url: https://www.tokeneconomics.com/docs/overview/what-is-tokenomics/
- provenance.license: CC-BY-4.0

## Jevons paradox {slug=jevons-paradox}

- definition: efficiency that lowers unit cost can raise total consumption and total spend; seen clearly in AI, where falling token prices accompany rising total spend.
- provenance.document: what-is-tokenomics
- provenance.section: terminology-reference
- provenance.source_url: https://www.tokeneconomics.com/docs/overview/what-is-tokenomics/
- provenance.license: CC-BY-4.0

## Energy, intelligence, value {slug=energy-intelligence-value}

- definition: the three-word summary of what tokenomics manages.
- provenance.document: what-is-tokenomics
- provenance.section: terminology-reference
- provenance.source_url: https://www.tokeneconomics.com/docs/overview/what-is-tokenomics/
- provenance.license: CC-BY-4.0

## KV cache {slug=kv-cache}

- definition: Attention state computed for a request, held so the model skips recomputing past tokens while it generates a response. Per-request by default; the two caches below extend that state across requests.
- provenance.document: cache-explainer
- provenance.section: tctheonething
- provenance.source_url: https://www.tokeneconomics.com/cache-explainer/
- provenance.license: CC-BY-4.0

## Prefix cache {slug=prefix-cache}

- definition: KV cache reused across requests. As long as the next request starts with the same run of tokens as the last one, the engine picks up where the last one left off. Self-hosted serving stacks call this prefix caching, and you tune the cache size, the block size, the lifetime, the eviction TTL, etc.
- provenance.document: cache-explainer
- provenance.section: tctheonething
- provenance.source_url: https://www.tokeneconomics.com/cache-explainer/
- provenance.license: CC-BY-4.0

## Prompt cache {slug=prompt-cache}

- definition: The same mechanism sold through a model provider's API: essentially a synonym for prefix caching, run for you. The trade-off is that you have very little control over the tuning options in exchange for not running the inference servers.
- provenance.document: cache-explainer
- provenance.section: tctheonething
- provenance.source_url: https://www.tokeneconomics.com/cache-explainer/
- provenance.license: CC-BY-4.0
