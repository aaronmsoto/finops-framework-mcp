---
kind: kpi
license: CC-BY-4.0
slug: usage-or-spend-apportionment-validation
source_url: https://www.finops.org/kpi/usage-or-spend-apportionment-validation/
title: Usage or Spend Apportionment Validation
wp_id: 9655
---

## Description

Method of apportioning shared effective costs based on usage or spend proportional amount.

## Formula

```
Total apportionment of Shared Costs / Total shared costs
Example: ACME Global Limited Shared effective cost for the month of July was $200,000 on cloud monitoring tools, security tools, cloud costs management tools, CSP (Cloud Service Provider) Premium Support Fees. ACME Global Cloud bill for July came to $1,200,000, broken down per Cost center/Product/Department as:
Finance = $225,000
Logistics = $225,000
Commercial = $300,000
Marketing = $450,000
Method for apportionment Shared effective cost in cloud spend:
Finance = $225,000 / $1,2000,000 * $200,000 = $37,500
Logistics = $225,000 / $1,2000,000 * $200,000 = $37,500
Commercial = $300,000 / $1,2000,000 * $200,000 = $50,000
Marketing = $450,000 / $1,2000,000 * $200,000 = $75,000
($37,500 +$37,500+$50,000 +$75,000) / $200,000 x 100 = 100%
```

## Candidate Data Sources

- CSP Billing Data
- Internal Finance Metrics

## Related Capabilities

- allocation

## Featured On

- allocation
