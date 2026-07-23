---
kind: kpi
license: CC-BY-4.0
slug: anomaly-detection-rate
source_url: https://www.finops.org/kpi/anomaly-detection-rate/
title: Anomaly Detection Rate
wp_id: 26638
---

## Description

Measures the frequency and cost impact of anomalies in AI spending, such as sudden cost spikes or unexpected usage patterns. This KPI enables proactive identification and mitigation of runaway costs.

## Formula

```
Total Cost of Anomaly Spikes / Total AI Spend = Anomaly Cost %
where (adjust for your needs):
Green (< 2%): Healthy. Normal fluctuations.
Yellow (2-7%): Warning. Minor anomaly trend
Red (> 7%): Critical. You have a “runaway” costs.
```

## Candidate Data Sources

- API usage reports
- Dashboards from AI platforms
- Logs from AI platforms
- Cloud billing data

## Related Capabilities

- anomaly-management
- data-ingestion
- reporting-analytics

## Featured On

- anomaly-management
