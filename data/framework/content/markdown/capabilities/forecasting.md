---
domain: quantify-business-value
kind: capability
license: CC-BY-4.0
slug: forecasting
source_url: https://www.finops.org/framework/capabilities/forecasting/
title: Forecasting
wp_id: 12438
---

## Summary

Creating a model of the anticipated future cost and value of IT systems leveraging statistical methods, historical spend patterns, planned changes, and related metrics.

## Headline Groups

### Manage the forecasting strategy

- Define functional and non-functional forecasting criteria
- Define forecast parameters in the context of business objectives (length of time, variance thresholds)

### Create forecast models

- Determine the applicable forecasting technique(s) by organizational level
- Establish model parameters for timing, implementation, and pricing details
- Define forecast model to quantify cost and functional requirements

### Track & Manage forecasts

- Refine forecast model to quantify cost and reflect value change expectations
- Determine how forecasts will influence and inform Budgeting
- Identify exception handling for scenarios when forecasting anomalies occur

## Definition

The goal of forecasting is not to predict the future but to tell you what you need to know to take meaningful action in the present.
 – Paul Saffo

Forecasting defines a model of future spending for a particular scope (a system, service, application, etc.). Forecasts are usually based on Estimating, which looks at a combination of historical spending and evaluates future plans, and an understanding of how future infrastructure and application lifecycle changes may impact current usage.

Forecast models provide an input to the Budgeting capability, where they serve as the baseline for Finance allocating funding. Forecast models may be updated for other reasons, such as the integration of new features, modernization of application architectures, or optimization for efficiency.

While Estimating is investigative, Forecasting represents establishing an expectation among all stakeholders of future cloud spending and value. Engineering typically drives Estimating, but Forecasting will typically involve Product personas, and consult with Finance and Leadership personas to build agreed upon forecast models and KPIs which align with business goals. Once a forecast model is agreed to for an application, the budget owner for that application must live up to the forecast, or be responsible for seeking variance funding to address shortfalls.

Accurate financial forecasting depends on an organization’s other [FinOps Capabilities](https://www.finops.org/framework/capabilities/) also being robust in order to provide accurate data as input. For example, a foundational element of this capability is the ability to fully categorize and allocate technology costs.

When Finance, Engineering, and Executives build models to forecast technology spend reliably and accurately, Forecasting will inform investment and operational decisions to accelerate an organization’s growth. In this way, each application owner committing to its own spend forecast model, and providing those to Finance allows for not only effective Budgeting, but also better management of Anomalies, better decision making related to on-premises capital spending, to public or private cloud value, to expected revenue and even to environmental impacts and sustainability.

The Forecasting Strategy for an organization will be driven collaboratively by FinOps, Engineering, Product, Finance and Leadership personas. Engineering will generate estimates which must be vetted for accuracy, compared to current baseline forecast models (for existing applications or systems) or established as new forecast models to be fed to Budgeting.

Forecast models will include a more robust documentation of the timing and implementation details of the system, the pricing models to be used (and when they will be implemented), the total cost of ownership for the system scope of the forecasting model.

Outputs from Forecasting will go to the Budgeting capability to inform the creation of budgets. But in many cases, changes to systems that fall within the scope of an existing budget will not need to be further approved, but can just be estimated and the forecast updated.

There is a tight integration between Estimating, Forecasting, and Budgeting capabilities. It is important to recognize that although in smaller organizations it may seem like all three capabilities happen simultaneously, they are indeed three capabilities.

Within this domain, the FinOps team will establish a Forecasting Strategy detailing how the organization will conduct its forecasting work. Creating forecast models will largely be done jointly between engineering and product personas, those who own the budget for certain systems or applications. Over time, these owners will maintain the forecast model for their areas of responsibility, and make adjustments as their systems are operated and modified.

When actual costs exceed forecasts, or it is indicated that this will occur, the owners of the forecast model must take action to seek additional funding from budget owners, in coordination with the Budgeting capability.

## Maturity Assessment

### Crawl

- In organizations with simple implementation models or with limited technology spend, a limited variety of cost data-sources and tools are used for forecasting by stakeholders across the organization
- Forecast models are created manually and/or ad-hoc
- Forecast are primarily based on historical spending, as workloads tend to be more stable or simple
- Forecasting variance analysis is done manually
- Limited/aggregate forecasting visibility (only by business unit or cost center)
- Engineering/Operations teams are not involved with the creation of cost forecasts or tracking of discrepancies from forecasted spend

### Walk

- Forecast costs tracked against actual usage and used to establish budgets
- Forecast is inclusive of rate optimization and commitment-based discounts
- Forecast models are rolling and trend-based
- Forecast updates are done on a regular cadence but not automated
- Stakeholder teams (Product, Leadership, Engineering, Finance) have access to cloud cost forecasting data
- Cost forecast data is used to supplement back-end accounting system data
- Regular review cadence by FinOps team of forecast thresholds and trends with stakeholder teams

### Run

- Global policy for applying allocation metadata to prevent unallocated cost
- Forecast tracked and updated against discount-adjusted, amortized cloud usage
- Forecast models are a combination of rolling, trend-based and driver-based
- Forecast is inclusive of usage optimization opportunities
- Forecasts aligned to the organization’s allocation constructs being used across the organization for reporting costs
- Granular forecasting visibility (by business unit, cost center, team, product, service, etc …) in the context of organizational KPIs
- Stakeholder teams (Executives, Engineering, Finance) have real-time visibility into a single source of truth for how technology category usage is impacting forecast trends and budgets
- Integration and automated data flow between technology cost forecast data and back-end accounting systems used for broader organizational reporting

## Functional Activities

### FinOps Practitioner

- Develop the Forecasting Strategy in combination with Finance, Leadership, Engineering and Product personas
- Establish requirements for when forecasting is due and how frequently forecast updates are needed
- Generate granular forecasts with reasonable accuracy
- Help to establish forecasting KPIs that are in alignment with business goals
- explore optimization opportunities with teams that are forecast to overspend
- Provide forecast data for cloud costs to enable stakeholders to create budgets
- Provide granular reporting to teams on forecasted spend by different business-centric dimensions
- Provide reporting on budgets vs actuals vs forecast to establish trends and compare against variance KPIs

### Product

- Develop product centric KPIs to measure the cost effectiveness in achieving my desired business outcomes
- Establish forecasting threshold variances that are in alignment with the product-line that i own
- Use these KPIs to inform forecast models in collaboration with my engineering counterparts

### Finance

- Establish requirements for when forecasting is due and how frequently forecast updates are needed
- Generate granular forecasts with reasonable accuracy
- Help to establish forecasting KPIs that are in alignment with business goals
- Explore optimization opportunities with teams that are forecast to overspend
- Provide forecast data for cloud costs to enable stakeholders to create budgets
- Provide granular reporting to teams on forecasted spend by different business-centric dimensions
- Provide reporting on budgets vs actuals vs forecast to establish trends and compare against variance KPIs

### Procurement

- Monitor for cloud spend forecasts exceeding budgets in my area of responsibility

### Engineering

- Monitor for cloud spend forecasts exceeding budgets
- Work with FinOps stakeholders to identify actionable optimization opportunities to avoid forecasted overspend
- Get approval for planned changes which will have a negative impact to our cloud spend projections / budgets

### Leadership

- Be aware of cloud cost forecasts and monitor for impacts to the business
- Establish forecasting threshold variances that are in alignment with business goals
- Manage competing priorities for active project timelines when forecasted spend impacts budgets for high-priority initiatives
- Ensure successful communication between the FinOps team and Business Units

## Measures of Success & KPIs

- Forecast models leverage discount-adjusted, amortized cloud usage data
- Forecast cost vs actual cost trends within established percentage threshold of variance. Acceptable levels of forecasting accuracy translates to an agreed upon maximum variance from actual spend.
- Stakeholder notifications for forecast variance threshold exceeded & risk of budget overspend
- Forecast frequency that includes intermediate forecasts to update budgets based on business drivers
- Teams and Business Units are responsible for managing their budgets based on forecast data

## Inputs & Outputs

#### Inputs

- Cost and usage information from Reporting & Analytics
- Estimates generated in Planning & Estimating
- Functional and nonfunctional requirements for systems from Architecting for Cloud, Onboarding Workloads, Cloud Policy & Governance

#### Outputs

- Forecast model expectations to Budgeting
- Updated Forecasting models

## Featured KPIs

### Forecast Accuracy Rate (Spend) {wp_id=9660}

This metric compares forecasted vs. actual cloud spend over a specific period (e.g., day, month, quarter). While percentage variance is the primary metric, dollar differences can also be informative. Each organization defines its acceptable variance.

#### Formula

```
((Forecasted Public Cloud Spend – Actual Public Cloud Spend) / Forecasted Public Cloud Spend)
```

#### Candidate Data Sources

- CSP Billing Data
- Organizational forecast documents

#### Related Capabilities

- [Forecasting](https://www.finops.org/framework/capabilities/forecasting/)

### Forecast Accuracy Rate (Usage) {wp_id=9661}

Compare forecast vs. actual cloud usage (serviceName, serviceCategory, serviceSubCategory, etc) over a specific period (e.g., day, month, quarter). This should be specific to service types (ex, measure by a specific serviceName, SKU, serviceCategory, serviceSubCategory etc). Percent variance is recommended, although the scale of usage should also be considered. Each organization defines its acceptable variance

#### Formula

```
Formula : For specific ServiceName or ServiceCategory or SKU
((Forecasted Resource Utilization – Actual Resource Utilization) / Forecasted Resource Utilization)
```

#### Candidate Data Sources

- CSP Billing Data
- Organizational forecast documents

#### Related Capabilities

- [Forecasting](https://www.finops.org/framework/capabilities/forecasting/)
- [Sustainability](https://www.finops.org/framework/capabilities/sustainability/)

### Forecast Drift Rate {wp_id=9662}

Evaluates how cloud infrastructure forecasts change over time due to various factors such as priority shifts, workload variations, rightsizing, and CUD impacts. Though percentage variance is prioritized, measuring in dollars is also valuable. Organizations set their own standards for acceptable variances.

#### Formula

```
((New Forecasted Cloud Infrastructure Spend – Previous Historic Forecasted Cloud Infrastructure Spend) / Previous Forecasted Cloud Infrastructure Spend)
```

#### Candidate Data Sources

- CSP Billing Data
- Organizational forecast documents

#### Related Capabilities

- [Forecasting](https://www.finops.org/framework/capabilities/forecasting/)

### Forecast Accuracy Rate for Carbon Emissions {wp_id=17868}

This metric compares forecasted vs. actual cloud emissions over a specific period (e.g., day, month, quarter). While percentage variance is the primary metric, carbon differences can also be informative. Each organization defines its acceptable variance.

#### Formula

```
((Forecasted Public Cloud emissions – Actual Public Cloud emissions) / Forecasted Public Cloud emissions)
```

#### Candidate Data Sources

- CSP Billing Data,
- carbon emission data source,
- Organizational forecast documents

#### Related Capabilities

- [Sustainability](https://www.finops.org/framework/capabilities/sustainability/)
- [Intersecting Disciplines](https://www.finops.org/framework/capabilities/intersecting-disciplines/)
