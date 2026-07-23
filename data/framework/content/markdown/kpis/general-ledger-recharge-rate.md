---
kind: kpi
license: CC-BY-4.0
slug: general-ledger-recharge-rate
source_url: https://www.finops.org/kpi/general-ledger-recharge-rate/
title: General Ledger Recharge Rate
wp_id: 9663
---

## Description

This measures total cloud spend in the cloud management tool vs. amount charged in General Ledger (Finance application).

## Formula

```
(Total CSP Cloud Spend recorded as a Journal in the General Ledger) / (Total CSP* cloud spend for the month)
Example: ACME Global Limited monthly cloud spend for July is $1,000,000. ACME Global Limited Finance application records the total cloud spend to the General Ledger as $1,000,000 Income Statement Recharge Rate = 100% Note: * CSP = Cloud Service Provider
```

## Candidate Data Sources

- CSP Billing Data
- Internal Finance Metric

## Related Capabilities

- invoicing-chargeback

## Featured On

- invoicing-chargeback
