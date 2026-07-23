---
kind: kpi
license: CC-BY-4.0
slug: cost-visibility-delay
source_url: https://www.finops.org/kpi/cost-visibility-delay/
title: Cost Visibility Delay
wp_id: 9667
---

## Description

Time (hours/days) between the cost occurring and the cost being ingested, normalized, and displayed back to cloud stakeholders.

This time is shorter at higher levels of maturity. At the Crawl phase, it may be around one month. At the Run phase, internal cost updates happen as frequently as the CSP can provide accurate data (e.g. AWS = 2 days).

## Formula

```
Cost Visibility Delay = Time of Displaying Cost – Time of Cost Generation
```

## Candidate Data Sources

- CSP Billing Data
- ETL system

## Related Capabilities

- data-ingestion

## Featured On

- data-ingestion
