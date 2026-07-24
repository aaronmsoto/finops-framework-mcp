---
kind: kpi
license: CC-BY-4.0
slug: data-center-power-usage-effectiveness
source_url: https://www.finops.org/kpi/data-center-power-usage-effectiveness/
title: Data Center Power Usage Effectiveness
wp_id: 25772
---

## Description

Measures how efficiently a data center uses energy by comparing the total power consumed by the facility to the power consumed by IT equipment. The formula quantifies the overhead required to support IT operations such as cooling, power distribution, and lighting relative to the energy directly used for compute, storage, and networking. A PUE value closer to 1.0 indicates higher energy efficiency, meaning a greater proportion of facility power is delivered to IT equipment rather than supporting infrastructure. This KPI was developed by the [FinOps for Data Center Working Group](https://www.finops.org/wg/finops-for-data-center-creating-a-finops-practice-profile/#acknowledgments).

## Formula

```
Power Usage Effectiveness (PUE) = Total Facility Power / IT Equipment Power
```

## Candidate Data Sources

- Facility Power Metering Systems
- Data Center Infrastructure Management (DCIM) Tools
- Utility Provider Billing or Interval Data

## Related Capabilities

- data-ingestion
- reporting-analytics
- sustainability

## Featured On

- usage-optimization
