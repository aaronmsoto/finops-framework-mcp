---
kind: kpi
license: CC-BY-4.0
slug: cpi-cost-performance-indicator
source_url: https://www.finops.org/kpi/cpi-cost-performance-indicator/
title: CPI – Cost Performance Indicator
wp_id: 17476
---

## Description

CPI, or Cost Performance Indicator, is a valuable KPI for all the FinOps Capabilities within the ‘Quantify Business Value’ domain. Unlike an ‘actual vs budget’ comparison, CPI focuses on tracking the value delivered compared to the cost spent on cloud. This metric is derived from Earned Value Management (EVM), a project management technique that integrates cost, schedule, and performance data. It provides insights into how efficiently a project or initiative is utilizing its budget. 

CPI on FinOps Business Value context should be interpreted as follows:

- If CPI > 1: Business Value is higher, compared to budgeted cloud cost.
- If CPI = 1: Business Value is expected compared to budgeted cloud cost.
- If CPI < 1: Business Value is lower, compared to budgeted cloud cost.

**Note:** Unit Economic metrics are required to compute this KPI, both a planned/expected and an actual/realized. Unit Economics metrics are specific to each business and should be determined according to the business goals that the cloud investment is designed to achieve. To learn more about Unit Economics, check Introduction to Cloud Unit Economics. 

For CPI calculation, here are the necessary inputs:

- Budgeted Cost per selected time period*
- Expected Unit Economic per selected time period*
- Actual Unit Economic per selected time period*
- Effective Cost per selected time period*

*Considerations about the selected time period: The selected period can be day, week, month, quarter, etc. and all time periods must have matching start and end dates.

## Formula

```
CPI = Earned Value / Effective Cost at time period
Where,
Earned Value = Budgeted Cost per selected time period * % Complete
And where,
% Complete = Expected Unit Economic per selected time period / Actual Unit Economic per selected time period * 100
```

## Candidate Data Sources

- CSP Billing Data
- Internal Finance Metrics

## Related Capabilities

- reporting-analytics

## Featured On

- planning-estimating
