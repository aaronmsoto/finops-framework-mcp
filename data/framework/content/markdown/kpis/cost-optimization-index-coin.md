---
kind: kpi
license: CC-BY-4.0
slug: cost-optimization-index-coin
source_url: https://www.finops.org/kpi/cost-optimization-index-coin/
title: Cost Optimization Index (COIN)
wp_id: 21748
---

## Description

The Cost Optimization Index score, or COIN, is a quantitative measure designed to assess cloud cost efficiency. COIN applies to any breakdown of infrastructure cost: Team, service, account, etc. COIN is calculated using the savings opportunity and overall total cost for the infrastructure in question to assess efficiency. Think of it as the inverse of waste.

## Formula

```
COIN Score = [1 – (Total Savings Opportunity / Total Cost)] * 100
The resulting score from 0-100 serves as an objective benchmark for cost efficiency. Total Cost is based on the aggregate cost of any relevant scope of infrastructure and measured in any desired currency.
Total Savings Opportunity is based on the sum of individual Savings Opportunities. Savings Opportunities are usage patterns within that scope of infrastructure which indicate expected areas of inefficiency and waste. These are calculated as projected savings in the same currency as Total Cost. Each Savings Opportunity will need it’s own cost model to identify potential savings.
This scoring system can help:
Identify areas to save money within run rate
Compare teams, services, org or organizations cost efficiency
Identify priority savings opportunities to target across the broader organization
Example:
Acme Corp has identified 3 potential areas of savings which they wish to drive through their organization.
Savings Area #1 is defined as the use of older generation storage technologies.
AcmeCorp’s FinOps team has identified a 20% savings for each dollar spent on legacy storage by upgrading to the latest generation.
Savings opportunity #1 is calculated as 20% multiplied by the current spend on legacy storage.
Savings Opportunity = (Legacy Gadget Spend) * 20%
Savings Area #2 is defined as low CPU utilization.
AcmeCorp’s FinOps team has identified a 30% P95 utilization target for compute.
Savings Opportunity #2 is calculated as the portion of infrastructure spend wasted on resources below that 30% benchmark.
Savings Opportunity = Compute spend * (1- (P95 Utilization (%) / 30%)
Savings Area #3 is defined as turning on a vendor’s network cost-savings option.
AcmeCorp’s FinOps team has identified a 25% savings from turning on the vendor feature.
Savings Opportunity = (Network Spend) * 25%
For a given Team Rocket, the FinOps team has calculated the following:
Team Rocket’s Total Cost = $500
Legacy Storage Spend = $100
Compute Spend = $100
P95 Compute Utilization = 25%
Network Spend = $100
First, calculate the expected savings from each savings opportunity.
#1 – Storage = $100 * 20% = $20
#2 – CPU utilization = $100 * (1 – 25%/30%) = $100 * .1666 = $16.67
#3 – Network = $100 * .25 = $25
Next, calculate the total savings opportunity by summing the individual savings opportunities:
$20 + $16.67 + 25 = $61.67
The COIN Score for Team Rocket then is calculated:
1 – ($61.67 / $500) =
1 – .12334 =
87.66
Team Rocket’s COIN score reflects that ~12% of their spend is known waste and that overall, based on their aggregate spend and defined patterns of waste, their spend is ~88% efficient.
```

## Candidate Data Sources

- CSP or Vendor Billing Report
- Resource Utilization Metric Data Store

## Related Capabilities

- rate-optimization
- usage-optimization

## Featured On

- usage-optimization
