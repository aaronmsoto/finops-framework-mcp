---
kind: kpi
license: CC-BY-4.0
slug: optimizing-electricity-pue-wue-between-regions-or-cloud-service-providers
source_url: https://www.finops.org/kpi/optimizing-electricity-pue-wue-between-regions-or-cloud-service-providers/
title: Optimizing Electricity PUE, WUE, Between Regions, or Cloud Service Providers
wp_id: 17885
---

## Description

Power Usage Effectiveness (PUE) is a metric that evaluates the energy efficiency of a data center by measuring the ratio between the total energy consumed by the data center and the energy used specifically by its IT equipment, such as servers, storage, and network devices. Similarly, Water Usage Effectiveness (WUE) quantifies water usage efficiency in a data center by calculating the ratio of total water usage, measured in liters, to the total IT energy consumption, measured in kilowatt-hours (kWh).

## Formula

```
PUE = Total Facility Energy / IT Equiment Energy
WUE = Total Water Used by the Data Center / Total IT Equipment Energy Consumption (in kWh)
Additional Guidance:
This KPI is beyond public cloud
Some Cloud providers publish their WUE and PUE per region and this should be taken into account in calculations, when choosing regions & when choosing cloud providers
Always be aware of your organization data compliance and legal requirements and abide by them
Region selection based on your organization’s data confidentiality agreement
```

## Candidate Data Sources

- CSP annual Sustainability reports

## Related Capabilities

- intersecting-disciplines
- sustainability

## Featured On

- usage-optimization
