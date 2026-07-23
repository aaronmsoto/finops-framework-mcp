---
kind: kpi
license: CC-BY-4.0
slug: frequency-of-data-updates
source_url: https://www.finops.org/kpi/frequency-of-data-updates/
title: Frequency of Data Updates
wp_id: 9666
---

## Description

Time (hours/days) between updates of cost data, e.g. the time since the last ETL run or sharing of data.

This time will become shorter at higher levels of maturity. It may be days or a month when done manually at the Crawl phase. At the Run phase, internal cost updates may happen as frequently as the CSP provides new data (e.g. AWS = up to 3x/day) or intentionally slower to reduce ETL execution cost.

## Formula

```
Data Update Frequency = Time of Latest Cost Update – Time of Previous Cost Update
```

## Candidate Data Sources

- CSP Billing Data
- ETL system

## Related Capabilities

- data-ingestion

## Featured On

- data-ingestion
