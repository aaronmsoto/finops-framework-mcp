---
kind: kpi
license: CC-BY-4.0
slug: active-to-provisioned-user-ratio
source_url: https://www.finops.org/kpi/active-to-provisioned-user-ratio/
title: Active-to-Provisioned User Ratio
wp_id: 25782
---

## Description

Measures how effectively provisioned user accounts translate into active usage by comparing the number of active users to the total number of provisioned users. The formula quantifies the proportion of accounts that are delivering ongoing value rather than simply existing in an enabled state. Higher ratios indicate strong engagement and efficient access management, while lower ratios highlight dormant or unused accounts that may be candidates for deprovisioning or licence reduction. This KPI was developed by the [FinOps for SaaS Working Group](https://www.finops.org/wg/finops-for-software-as-a-service-saas/#acknowledgments).

## Formula

```
Active-to-Provisioned User Ratio = (Active Users / Provisioned Users) x 100
```

## Candidate Data Sources

- Vendor activity or audit logs
- Identity and access management systems
- SaaS usage reports

## Related Capabilities

- data-ingestion
- licensing-saas
- reporting-analytics
- usage-optimization

## Featured On

- licensing-saas
