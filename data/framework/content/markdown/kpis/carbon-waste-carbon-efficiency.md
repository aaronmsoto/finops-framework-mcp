---
kind: kpi
license: CC-BY-4.0
slug: carbon-waste-carbon-efficiency
source_url: https://www.finops.org/kpi/carbon-waste-carbon-efficiency/
title: Carbon Waste / Carbon Efficiency
wp_id: 17890
---

## Description

These 2 KPIs measure carbon inefficiency in workload utilization. It quantifies the difference in carbon emissions between a fully optimized resource allocation and the current allocation. This approach aligns directly with the FinOps principle of optimizing workloads to maximize resource utilization by selecting the most suitable resource size and type. The optimized allocation considers factors such as architecture type (e.g., x86 vs. AMD), as well as specific resource attributes like type and size.

## Formula

```
Carbon Waste Formula:
(Carbon of currently allocated resource) – (Carbon of optimised resource for utilisation need)
Carbon Efficiency Formula:
(Carbon of optimized resource for utilization need) / (Carbon of currently allocated resource)
```

## Candidate Data Sources

- Optimization tooling such as Compute Optimizer (AWS) to gather utilisation vs allocation
- Resource to Carbon unit conversion

## Related Capabilities

- intersecting-disciplines
- sustainability

## Featured On

- sustainability
