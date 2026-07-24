---
kind: kpi
license: CC-BY-4.0
slug: forecast-accuracy-rate-usage
source_url: https://www.finops.org/kpi/forecast-accuracy-rate-usage/
title: Forecast Accuracy Rate (Usage)
wp_id: 9661
---

## Description

Compare forecast vs. actual cloud usage (serviceName, serviceCategory, serviceSubCategory, etc) over a specific period (e.g., day, month, quarter).

This should be specific to service types (ex, measure by a specific serviceName, SKU, serviceCategory, serviceSubCategory etc). Percent variance is recommended, although the scale of usage should also be considered. Each organization defines its acceptable variance

## Formula

```
Formula : For specific ServiceName or ServiceCategory or SKU
((Forecasted Resource Utilization – Actual Resource Utilization) / Forecasted Resource Utilization)
```

## Candidate Data Sources

- CSP Billing Data
- Organizational forecast documents

## Related Capabilities

- forecasting
- sustainability

## Featured On

- forecasting
