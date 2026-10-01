---
collection: cache-providers
count: 3
---

# Provider prompt-cache behavior snapshot

## Anthropic (Claude API) {slug=anthropic}

- write_charge: 1.25× base (5-minute TTL) or 2× (1-hour TTL). Caching is opt-in: explicit breakpoints, or a single automatic caching flag.
- read_charge: 0.1× base
- minimum_prefix: Model-dependent: 512 to 4,096 tokens. Too short? No error, just silently no cache.
- lifetime_notes: 5 min or 1 hour, refreshed free on each read. Ages from request start. 20-block lookback finds prior writes. Isolated per workspace.
- reviewed: Provider documentation reviewed Aug 2026
- provenance.document: cache-explainer
- provenance.section: tcprovidersnapshot
- provenance.source_url: https://www.tokeneconomics.com/cache-explainer/
- provenance.license: CC-BY-4.0

## OpenAI (OpenAI platform) {slug=openai}

- write_charge: **Changed with the GPT-5.6 series (July 2026): now 1.25× base.** Earlier models: no write charge. On the new models, explicit breakpoints, or an implicit mode you opt into.
- read_charge: 0.1× base on GPT-5.6 and later; model-dependent cached rates on earlier models (advertised up to 90% off).
- minimum_prefix: 1,024 visible tokens (GPT-5.6 and later), 2,048 earlier. Hidden harness tokens do not count toward the minimum.
- lifetime_notes: At least 30 minutes after the latest write or reuse. Automatic caching on by default; a cache-hit-rate dashboard exists. Overflow routing can evict entries. Isolated per organization and region.
- reviewed: Provider documentation reviewed Aug 2026
- provenance.document: cache-explainer
- provenance.section: tcprovidersnapshot
- provenance.source_url: https://www.tokeneconomics.com/cache-explainer/
- provenance.license: CC-BY-4.0

## Google (Gemini API) {slug=google}

- write_charge: No write charge. Implicit caching only on current models: enabled by default, nothing to configure.
- read_charge: Read discount passed through automatically; explicit cache objects exist on the older request style.
- minimum_prefix: Model-dependent: 2,048 to 4,096 input tokens.
- lifetime_notes: Provider-managed, not exposed. The usage report shows a single cached-tokens field; there is no write bucket to measure.
- reviewed: Provider documentation reviewed Aug 2026
- provenance.document: cache-explainer
- provenance.section: tcprovidersnapshot
- provenance.source_url: https://www.tokeneconomics.com/cache-explainer/
- provenance.license: CC-BY-4.0
