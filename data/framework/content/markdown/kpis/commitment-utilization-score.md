---
kind: kpi
license: CC-BY-4.0
slug: commitment-utilization-score
source_url: https://www.finops.org/kpi/commitment-utilization-score/
title: Commitment Utilization Score
wp_id: 26647
---

## Description

Measures the health of contractual agreements by tracking the “burndown” of pre-purchased capacity against actual consumption. This provides a clear signal for renewal negotiations. A value near 100% indicates perfect forecasting and rate optimization; significantly lower values signal “shelfware” (wasted capital), while values exceeding 100% reveal exposure to expensive on-demand rates.

## Formula

```
Commitment Utilization Score = (Used Commitment / Total Commitment) x 100
```

## Candidate Data Sources

- Resource event logs (Active vs. Idle state)
- System performance metrics (Spillage/Memory telemetry)
- Usage and activity reports

## Related Capabilities

- rate-optimization

## Featured On

- rate-optimization
