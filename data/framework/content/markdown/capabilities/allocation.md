---
domain: understand-usage-and-cost
kind: capability
license: CC-BY-4.0
slug: allocation
source_url: https://www.finops.org/framework/capabilities/allocation/
title: Allocation
wp_id: 12333
---

## Summary

Define strategies to assign and share cost and usage using accounts, tags, labels, and other metadata, creating accountability among teams and projects within an organization.

## Headline Groups

### Maintain an allocation strategy

- Define organizational groupings to which we allocate all costs in our business
- Define specific terminology to describe all the allocation groupings

### Maintain a tagging & hierarchy strategy

- Define specific tags, labels, naming standards, grouping structures used to identify that a cost is in a particular grouping
- Define how to identify subsets of cost that are shared

### Maintain a shared cost strategy

- Define the need to share any subsets of cost among allocation targets
- Define mechanisms to share costs for each shared cost item

### Validate allocation compliance

- Create mechanisms to ensure adequate allocation of cost to our allocation groupings
- Define and maintain an allocation taxonomy of categories for our usage
- Define and maintain a strategy to document apportionment of shared costs and impacts to allocation targets

## Definition

The [FinOps Principle](https://www.finops.org/framework/principles/), “Everyone takes ownership for their technology usage,” is enabled by Allocation.

Allocation defines how costs should be apportioned to those responsible for each component of that cost, whether directly or as a shared element. In the context of FinOps, this involves using account structures, tags, labels and derived metadata to identify categories to which we assign costs in a way that provides product managers, engineers, and other personas with a transparent and complete understanding of the cost of technology resources for which they are responsible.

Allocation from aggregated usage datasets can be done by splitting costs manually or using a known list of owners of accounts, projects, subscriptions, resource groups or other logical groupings of resources. Allocation granularity is enhanced using resource-level naming conventions and tags or labels applied to the data. Even more granular allocation, or allocation of shared cost elements can be accomplished using other sources such as the organization Configuration Management Database (CMDB), observability, or utilization data. The methods and intricacy of the allocation will generally increase as organizations demand more detailed Reporting & Analytics.

Allocation will require three primary strategies: Allocation Strategy, Tagging Strategy and Shared Cost Strategy. Each is described below.

1. **The allocation strategy defining how costs should be mapped to the organization.**The allocation strategy primarily involves understanding and defining how the organization wishes to look at technology costs in order to do showback to various teams, chargeback to finance, or allocation to cost centers. See the Invoicing & Chargeback Capability for more information on the impact of Cost Allocation to Showback / Chargeback. There can be multiple layers of cost allocation and multiple ways to slice the cost and usage data. For example, finance may need to see costs divided by Cost Center or by type of spending (e.g. R&D, COGS), but engineering teams may need more granular breakdown by application, and operations teams may need to see all costs related to Production environments for all applications.
2. **The tagging or metadata strategy defining how usage and resources will be mapped to the defined parts of the organization.**The tagging strategy primarily involves understanding what mix of data will be required, how resources will be segregated into accounts, how accounts will be grouped, how naming standards will be used, how tags or labels will be applied, and how all of that information will be aggregated. Tagging strategies must take into account the challenges of tagging compliance and consistency, differences in how resources can be tagged in different environments, and the fact that some costs cannot be tagged in environments. Tagging can be much more effective as well using automation, infrastructure as code, or using tools to manage tags after resources are launched.While the scope of the metadata strategy discussed here is confined to Cost Allocation, the metadata strategy may also encompass or be combined with the needs of other areas within an organization such as operations, automation, and security. The organization’s tagging strategy may be owned by a Center of Excellence (COE) group, Data Platform team, or DevOps team, requiring collaboration with those groups to contribute Cost Allocation requirements in the combined plan.
3. **The shared cost strategy which defines how each set of shared resources will be allocated to budgets.**Most organizations will also have shared costs to be allocated. Examples include support costs that benefit all users, centralized networking services, or shared environments (platforms, containers, etc.). While the ultimate goal of an organization may be full allocation of costs, the allocation and reporting of shared costs can be complex. Many early FinOps practices adopt an “informed ignore” approach where a business decision is explicitly made to centrally budget for shared cost items, rather than allocating from each cost center’s budget. Choose for each shared cost what kind of allocation policy generates the best value for the organization. Most organizations use a mix of strategies with some shared costs allocated to cost center budgets and others funded from central budgets. Allocation of shared costs can be performed in a variety of ways including fixed allocations, proportional or by using proxy metrics to determine a variable proportion.As an organization’s technology use and FinOps practice matures, and particularly as automation is introduced or increased, it is likely that these strategies will change and mature as well. These changes will inform the Data Ingestion Capability to obtain all the data and contextual information required. Multiple versions of these strategies could be in force at any given time. So complete consistency in tagging, allocation, or shared cost allocation may be difficult to achieve. The goal should be to achieve the level of allocation that provides the organization with the level of information to make good decisions at its chosen level of maturity.

## Maturity Assessment

### Crawl

- Simple Allocation strategy where costs of accounts, projects or subscriptions are allocated to the business units, portfolios or cost centers using a list of accounts known to belong to specific cost centers or business units
- Tagging strategy exists including 

  - resource naming standards
  - Account, Project, Subscription naming standards
 
- Tagging strategy compliance is inconsistent
- Monthly challenges identifying the owners of unknown, untagged, unidentified accounts
- A significant portion of total costs can often be allocated directly without needing any adjustments or enhancements to the underlying metadata.
- Tags or labels are used for some allocation, but cannot be used consistently, or not used for a majority of spend
- Shared costs are not identified beyond common charges such as support, tax, etc.
- Shared costs are allocated to central budgets or platform teams directly and not charged back to cost centers or business units
- Product and Engineering Personas primarily manage to direct costs only, resulting in reduction in accuracy of forecasting and budgets
- Basic KPIs for Cost ALlocation are defined and manually created on an inconsistent cadence
- Allocation tasks are primarily managed with data provider systems and tooling

### Walk

- Well-documented Allocation strategy identifying multiple mechanisms for allocating cost has been implemented but may not be used consistently or universally
- Infrequent investigation to identify unallocated, untagged, or unidentified cost elements
- A majority of total costs can often be allocated directly without needing any adjustments or enhancements to the underlying metadata.
- Cost allocation can be done to an application or service level
- Tagging strategy for resources and hierarchy groupings is well-documented and followed
- Tagging compliance is consistent in key areas or applications but not universal
- Allocation mechanisms will typically include a combination of factors, such as accounts, projects or subscriptions which are identified by metadata or naming standard as belonging to specific cost centers, resources within shared cost pools which can be identified as belonging to a particular cost center, and some mechanisms for the distribution of shared costs
- Legacy or less critical parts of the technology infrastructure which are not consistently using the allocation standards still exist and require some manual or estimation effort
- Shared cost strategy is well documented and understood for multiple elements of shared cost
- Shared costs are split using an appropriate distribution model(s) (proportional, fixed, even-split) across the entirety of the organization
- Use of a combination of data provider and technology service provider tools, third party, or custom tooling to manage allocation and sharing
- Discounts are spread proportionally across all teams technology spend
- KPIs for cost allocation understood, but not automated
- Shared platform owners are able to showback costs generated by internal customers
- Product and Engineering Personas are aware of their portion of shared platform/service costs and include these costs when forecasting and budgeting
- Shared cost process documented to enable and manage expectations of “fair share” onboarding of new cost centers/business units

### Run

- Costs are allocated at any level of granularity required by the organization
- Direct allocation or consistent mechanisms for distributing shared cost items, and strategies for metadata, hierarchy and naming standards are being used consistently and effectively universally
- Advanced practices reach consistently high levels of allocation coverage
- Automation allows for multiple sources of data to be used to allocate shared costs at the level they can be where important to the organization (e.g. using metering tools to capture usage and augment billing data to attribute shared costs with greater accuracy)
- There are few scenarios where all cost is not allocated at the most granular level or is unidentified, requiring essentially no research or reporting generation time
- Use of technology/data provider tools, third party tools, custom tools integrated consistently
- Employing automation in the provisioning of resources to create consistency of resource and account tagging and metadata
- Using mechanisms to automatically correct for or augment service provider tagging capabilities after receipt of billing data to achieve high allocation percentage compliance
- KPIs well understood and automated.
- Cost allocation is performed in near real time allowing for Product and Engineering Personas to better understand their monthly costs
- Product and Engineering Personas are aware of their portion of shared platform/service costs and include all costs as part of their forecasting & budget planning
- Shared platform/service owners are able to fully allocate and chargeback costs generated by internal customers
- Shared platform/service owners are able to recover costs generated by internal customers and perform accurate forecasting/budget planning
- Shared cost recovery reflects commercial discounts/commitment based discounts
- Shared cost process automated to enable “fair share” onboarding of new cost centers/business units
- Shared costs are distinguished from dedicated costs

## Functional Activities

### FinOps Practitioner

- Develop naming standards for all required and optional layers of hierarchical groupings (Accounts, Projects, Folders, Subscriptions, Departments, Organizational Units, etc.)
- Develop compliance standards for various groups
- Coordinate with COE or Data Platform teams to coordinate Tagging Strategy and metadata needs with other operational or security requirements
- Coordinate with owners of shared services to determine the appropriate level of shared cost management for each and document in Shared Cost Strategy
- Coordinate with Leadership on appropriate level of granularity for Cost Allocation Strategy
- Evaluate compliance with established allocation strategies

### Product

- Provide feedback on cost allocations made to products within my control

### Finance

- Determine the organizational and budgetary units to which costs will be allocated
- Determine how to allocate percentages of any shared cost items

### Engineering

- Determine how and when metadata will be applied to hierarchical groupings and resources
- Enforce and automate metadata standards for cost allocation metadata
- Identify and provide all metadata sources required for analysis and cost allocation
- Comply with organizational allocation strategies where required, and provide feedback on issues or opportunities to improve

### Leadership

- Review and approve cost allocations assigned to organizations within my control
- Review and approve cost allocation strategies
- Determine and provide feedback when cost allocation must become more granular or mature

### Allied Personas

- Provide feedback to FinOps personas on appropriate level of granularity and compliance requirements for allocation related to areas within my control (e.g. IT Security, ITAM, Service Management, IT Financial Management, etc.)

## Measures of Success & KPIs

- Most technology costs can generally be associated with a specific organizational unit. In the State of FinOps Survey, the FinOps Community of Practitioners note that as organizations mature in their FinOps practice, they typically achieve increasingly comprehensive allocation of their spend. Even at early stages of maturity, a substantial portion of spend is usually allocable, and more advanced practices tend to reach consistently high levels of allocation coverage.
- Ability to surface the percentage of cost that cannot be categorized and allocated directly, and which must be investigated at a low level
- Metadata compliance can be viewed in terms of how much of your spend is associated with accurate and meaningful allocation metadata, or at least organized within a recognizable hierarchy. As practices mature, a significant share of costs typically meets these criteria, enabling more reliable reporting and allocation.
- Stakeholder notifications for missing allocation metadata when resources are deployed
- See the KPI Library for a longer list of FinOps KPIs that could be used for Cost Allocation

### Examples

- Achieve comprehensive cost allocation to organizational units
  - Objective: Achieve comprehensive cost allocation to organizational units
  - KPI: Percentage of technology costs allocated directly to organizational units
- Minimize unallocated technology costs
  - Objective: Minimize unallocated technology costs
  - KPI: Percentage of costs that cannot be categorized and allocated directly
- Ensure accurate and complete metadata for cost allocation
  - Objective: Ensure accurate and complete metadata for cost allocation
  - KPI: Percentage of costs with appropriate allocation metadata
- Proactively address missing allocation metadata
  - Objective: Proactively address missing allocation metadata
  - KPI: Number of stakeholder notifications for missing metadata
- Efficiently investigate and resolve unallocated costs
  - Objective: Efficiently investigate and resolve unallocated costs
  - KPI: Average time taken to investigate and resolve unallocated costs
- Monitor and control costs against forecasted trends
  - Objective: Monitor and control costs against forecasted trends
  - KPI: Percentage variance of actual costs from forecasted trends
- Continuously enhance the accuracy of cost allocations
  - Objective: Continuously enhance the accuracy of cost allocations
  - KPI: Quarterly improvement in the accuracy of cost allocations
- Ensure all deployed resources have proper metadata
  - Objective: Ensure all deployed resources have proper metadata
  - KPI: Percentage of resource deployments with missing allocation metadata
- Improve understanding and adherence to cost allocation practices
  - Objective: Improve understanding and adherence to cost allocation practices
  - KPI: Percentage increase in awareness and adherence to cost allocation practices

## Inputs & Outputs

- Provide requirements to inform Data Ingestion activities as a feedback loop for improving Allocation strategy goals
- Receive requirements from initiatives related to Reporting & Analytics activities to inform the requirements of Allocation mappings to achieve organizational reporting goals
- Incorporate industry recognized adoption frameworks / architecture frameworks for technology categories from data and technology service providers
- Consolidate existing tag/label standards and establish consistent naming conventions
- Overlay the organizational business metadata for each element of allocation metadata. For example: constructs like Project Names, Application IDs, Cost Center IDs, …etc.
- Establish reports that surface any spend that is not allocated by the established allocation metadata
- Align roles for organizational P&L groupings to map cost ownership back to Invoicing & Chargeback activities
- Leverage the capabilities of CI/CD, platform, data provider capabilities
- Ensure allocation requirements align with Policy & Governance activities, including tag compliance, allocation compliance, governance mechanisms

## Featured KPIs

### Allocation Accuracy Index (AAI) {wp_id=25779}

Measures the effectiveness of cost attribution practices across an organization’s infrastructure. The formula calculates the percentage of total infrastructure costs that are directly and accurately attributed to the responsible teams, projects, or business units. A higher AAI indicates better financial transparency, more reliable Chargeback or Showback, and stronger alignment between costs and consumption, supporting accurate budgeting, forecasting, and FinOps decision-making. This KPI was developed by the [FinOps for Data Center Working Group](https://www.finops.org/wg/finops-for-data-center-creating-a-finops-practice-profile/#acknowledgments).

#### Formula

```
Allocation Accuracy Index (AAI) = (Directly Attributed Costs / Total Infrastructure Costs) × 100
```

#### Candidate Data Sources

- On-Premises Cost Data
- Resource Metadata
- ERP / Accounting Systems
- Audit logs

#### Related Capabilities

- [Reporting & Analytics](https://www.finops.org/framework/capabilities/reporting-analytics/)
- [Usage Optimization](https://www.finops.org/framework/capabilities/usage-optimization/)
- [Allocation](https://www.finops.org/framework/capabilities/allocation/)

### Percentage of Costs Associated with Unallocated CSP Cloud Resources {wp_id=9652}

Unallocated cost refers to expenses incurred for resources or services that are not directly attributed to specific projects, departments, or applications. These costs can arise due to shared resources, lack of proper cost allocation mechanisms, or simply inefficiencies in resource management. Unallocated costs can contribute to cloud wastage and make it difficult to accurately track and manage expenses. Identifying unallocated cost and reducing them by allocating, improves the cost allocation

#### Formula

```
(Total Effective Costs Associated w/Unallocated CSP Cloud Resources During a Period of Time / Total CSP Cloud Costs During a Period of Time)
```

#### Related Capabilities

- [Allocation](https://www.finops.org/framework/capabilities/allocation/)

### Usage or Spend Apportionment Validation {wp_id=9655}

Method of apportioning shared effective costs based on usage or spend proportional amount.

#### Formula

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

#### Candidate Data Sources

- CSP Billing Data
- Internal Finance Metrics

#### Related Capabilities

- [Allocation](https://www.finops.org/framework/capabilities/allocation/)
