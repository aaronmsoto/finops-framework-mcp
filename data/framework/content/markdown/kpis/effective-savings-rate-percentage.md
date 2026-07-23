---
kind: kpi
license: CC-BY-4.0
slug: effective-savings-rate-percentage
source_url: https://www.finops.org/kpi/effective-savings-rate-percentage/
title: Effective Savings Rate Percentage
wp_id: 9650
---

## Description

Return on investment metric of all commitment discounts by commitmentDiscountId / commitmentDiscountName, commitmentDiscountStatus, commitmentDiscountType, etc..

## Formula

```
Option 1: (CB Discount Savings – Cost to achieve CB Discount Savings) / Compute On-Demand Equivalent Spend
Option 2: 1 – (Actual Spend with Discounts / Equivalent Spend at On Demand Rate)
```

## Candidate Data Sources

- CSP Billing Data

## Related Capabilities

- rate-optimization

## Featured On

- rate-optimization
