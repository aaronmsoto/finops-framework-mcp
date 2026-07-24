---
kind: kpi
license: CC-BY-4.0
slug: forecast-drift-rate
source_url: https://www.finops.org/kpi/forecast-drift-rate/
title: Forecast Drift Rate
wp_id: 9662
---

## Description

Evaluates how cloud infrastructure forecasts change over time due to various factors such as priority shifts, workload variations, rightsizing, and CUD impacts.

Though percentage variance is prioritized, measuring in dollars is also valuable. Organizations set their own standards for acceptable variances.

## Formula

```
((New Forecasted Cloud Infrastructure Spend – Previous Historic Forecasted Cloud Infrastructure Spend) / Previous Forecasted Cloud Infrastructure Spend)
```

## Candidate Data Sources

- CSP Billing Data
- Organizational forecast documents

## Related Capabilities

- forecasting

## Featured On

- forecasting
