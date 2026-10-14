---
collection: metrics
count: 7
---

# Reference metrics

## Cache hit rate {slug=cache-hit-rate}

- formula: Cache hit rate = cache read / (cache read + cache write + uncached input)
- provenance.document: cache-explainer
- provenance.section: tcmonitoring
- provenance.source_url: https://www.tokeneconomics.com/cache-explainer/
- provenance.license: CC-BY-4.0

### inputs

- cache read
- cache write
- uncached input

### targets

- climb toward your workload's ceiling. Cache hit rate is coverage, driven mostly by prompt ordering. A live chat can never reach 100% because the conversation grows, so track the trend against the structural ceiling, not toward perfection. A flat or falling line while volumes grow means something upstream started breaking the prefix.

### definition_md

One number, built from the three buckets above, bounded between 0 and 100%. Bounded is what makes it *composable*: you can average it, roll it up across teams and workloads, and put it on the same slide as any other percentage. An unbounded ratio ("3,400% reuse") means nothing to a human reader and cannot be averaged. This is unfortunately a metric that is reported by default by many model providers.

## Cache cost efficiency {slug=cache-cost-efficiency}

- formula: Cache cost efficiency = 1 − actual prompt cost / uncached equivalent cost
- provenance.document: cache-explainer
- provenance.section: tcmonitoring
- provenance.source_url: https://www.tokeneconomics.com/cache-explainer/
- provenance.license: CC-BY-4.0

### inputs

- actual prompt cost
- uncached equivalent cost

### targets

- clearly above zero. A cache that is paying for itself sits well above zero, which means each cached entry is read back many times before it expires. A workload hovering just over zero is doing payback-once work: rare hits, misconfigured prompt ordering, or very short sessions could cause this.

### definition_md

The fraction of prompt spend that caching actually avoided. Cache cost efficiency is **zero at break-even**: the write premium exactly repaid. Positive once paying the cache surcharge is worth it, negative when caching is losing you money. That scale is what you want while tuning: a direct comparison that holds across tuning option changes, like choosing the more expensive high TTL cache.

However, this metric assumes you can get the *actual* prompt cost, which is easy on the direct API, murky on subscription plans, and impossible where the provider reports no write bucket. Keep in mind that the three buckets are not the whole invoice: output tokens, batch and committed-use discounts, and contracted rates all sit outside this input-side ratio.

## Uncached equivalent cost {slug=uncached-equivalent-cost}

- formula: uncached equivalent cost = (cache read + cache write + uncached input) × base input price
- provenance.document: cache-explainer
- provenance.section: tcmonitoring
- provenance.source_url: https://www.tokeneconomics.com/cache-explainer/
- provenance.license: CC-BY-4.0

### inputs

- cache read
- cache write
- uncached input
- base input price

### targets

(none)

### definition_md

Denominator of Cache cost efficiency: what the same prompt tokens would have cost with no caching at all.

## Cost per token {slug=cost-per-token}

- formula_text: hardware cost divided by tokens produced
- provenance.document: what-is-tokenomics
- provenance.section: terminology-reference
- provenance.source_url: https://www.tokeneconomics.com/docs/overview/what-is-tokenomics/
- provenance.license: CC-BY-4.0

### inputs

- hardware cost
- tokens produced

### targets

(none)

### definition_md

the cost of producing one token, hardware cost divided by tokens produced; an output metric that reflects true infrastructure return, as opposed to input metrics like cost per GPU hour or floating-point operations per dollar.

## Net benefit {slug=net-benefit}

- formula: gross delta × volume - outputs that missed the floor - cost created - harm from misses = net benefit
- provenance.document: value-classification
- provenance.section: vfstep4
- provenance.source_url: https://www.tokeneconomics.com/ai-value-classification/
- provenance.license: CC-BY-4.0

### inputs

- gross delta
- volume
- outputs that missed the floor
- cost created
- harm from misses

### targets

(none)

### definition_md

Net produces one number, in one unit, over one period, with one confidence mark. It is the first point at which a claim exists.

Two of these lines need a word.

**Harm from misses.** The Quality Floor makes bad output not count. It does not make bad output cost anything. Those are different operations. An incorrect support resolution, a bad routing decision, or a compliance miss is net negative, not merely zero, and the damage is subtracted here in the baseline's unit. Most claims will carry zero on this line.

**Redeployment.** Freed capacity that was not redeployed nets to zero realized benefit. It is tracked as an FTE estimate, not claimed, until the capacity is spent on work that produces an outcome. This applies to every labor category, not only capacity gain.

The confidence mark carries the weakest provenance among the inputs: a net built on one estimated input is an estimated net.

## Risk reduction expected loss {slug=risk-expected-loss}

- formula_text: incidents per period x cost per incident
- provenance.document: value-classification
- provenance.section: vfstep3
- provenance.source_url: https://www.tokeneconomics.com/ai-value-classification/
- provenance.license: CC-BY-4.0

### inputs

- incidents per period
- cost per incident

### targets

(none)

### definition_md

Security incidents prevented, product outages avoided, compliance failures caught earlier. The value is a loss that did not occur; the claim rests on an expected-loss estimate: for example, incident rate x incident cost.

## AI unit economics (TCA over realized value) {slug=ai-unit-economics}

- formula_text: TCA over value
- provenance.document: total-cost-of-ai
- provenance.section: episode-highlights
- provenance.source_url: https://www.tokeneconomics.com/insights/total-cost-of-ai-tca/
- provenance.license: CC-BY-4.0

### inputs

- total cost of AI (TCA)
- realized value

### targets

(none)

### definition_md

TCA is the numerator of AI unit economics. Everything you convert into AI capability, the full input side, and the denominator is realized value. (Total Cost of AI is a proposal on this page, not a ratified standard.)
