---
kind: kpi
license: CC-BY-4.0
slug: percentage-variance-of-budgeted-vs-forecasted-csp-cloud-spend
source_url: https://www.finops.org/kpi/percentage-variance-of-budgeted-vs-forecasted-csp-cloud-spend/
title: Percentage Variance of Budgeted vs. Forecasted CSP Cloud Spend
wp_id: 9670
---

## Description

Measures the difference between budgeted effective costs and the forecasted effective costs for using CSP cloud services.

This metric provides insights into how well an organization’s initial budget aligns with subsequent forecasts of cloud expenses. This also measures the difference between budgeted cloud spending, which is fairly static and often used to set spending limits, vs. forecasted cloud spending, which should use close to real-time data to project and anticipate actual spending on a rolling basis.

This KPI requires an organization to establish a methodology for forecasting in order to compare results to the established budget. Forecasting methodology should consider past cloud consumption, anticipated changes in cloud utilization or rates (e.g. commitment-based discounts).

## Formula

```
((Budgeted CSP Effective Cost for a Time Period – Forecasted CSP Effective Cost for that Time Period) / Budgeted CSP Effective Cost for that Time Period)
```

## Candidate Data Sources

- CSP Billing Data
- Internal Finance Metrics

## Related Capabilities

- budgeting

## Featured On

- budgeting
