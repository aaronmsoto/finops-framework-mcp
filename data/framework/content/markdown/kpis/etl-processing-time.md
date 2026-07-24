---
kind: kpi
license: CC-BY-4.0
slug: etl-processing-time
source_url: https://www.finops.org/kpi/etl-processing-time/
title: ETL Processing Time
wp_id: 9665
---

## Description

This measures the cycle time taken to complete the ETL (Extract, Transform, Load) processes.

It should be faster than the frequency of data updates to avoid obsolete data being presented.

## Formula

```
Processing Time = End Time – Start Time
```

## Candidate Data Sources

- ETL system logs
- ETL interface for process timestamps

## Related Capabilities

- data-ingestion

## Featured On

- data-ingestion
