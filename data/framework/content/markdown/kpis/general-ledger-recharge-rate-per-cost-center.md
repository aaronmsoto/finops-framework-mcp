---
kind: kpi
license: CC-BY-4.0
slug: general-ledger-recharge-rate-per-cost-center
source_url: https://www.finops.org/kpi/general-ledger-recharge-rate-per-cost-center/
title: General Ledger Recharge Rate per Cost Center
wp_id: 9664
---

## Description

Total cloud spend in the cloud management tool per Cost Center vs. amount charged in General Ledger (Finance application) per Cost center.

## Formula

```
(Total CSP* Cloud Spend per Cost Center recorded as a Journal in the General Ledger) / (Total CSP* cloud spend per Cost center for the month)
Example: ACME Global Limited monthly cloud spend for July is $1,000,000. The total chargeback amount per various cost center was:
Finance = $200,000 ACME Global Limited Finance application records the total cloud spend to the General Ledger for Finance as $180,000 Income Statement Recharge Rate per Cost center = 90% Note: * CSP = Cloud Service Provider
```

## Candidate Data Sources

- CSP Billing Data
- Internal Finance Metric

## Related Capabilities

- invoicing-chargeback

## Featured On

- invoicing-chargeback
