# FOCUS version support — recommendation

Status: **proposal for the owner** (2026-10-19). Nothing here is built. The
FOCUS server (`finops-focus-mcp`) carries spec 1.0 and 1.2
(`src/crawlers/focus/urls.ts` `VERSIONS`); the tokenomics server links to
FOCUS 1.2 columns and names 1.5 working-draft identifiers with no URI.

## Where providers actually are (sources accessed 2026-10-19)

The main source is FOCUS's own "Latest FOCUS version supported" table:
<https://focus.finops.org/docs/implementation/get-started/get-started-with-focus-datasets/>.
The table has no GA/preview column, and no conformance certificates are
published yet.

| Provider | FOCUS version | Status | Source |
|---|---|---|---|
| AWS | 1.2 (and 1.0) | GA since 19 Nov 2025 ("FOCUS 1.2 with AWS columns") | aws.amazon.com what's-new 2025-11 |
| Azure | 1.0 / 1.0r2 GA; 1.2 | 1.2 is **preview**; several 1.2 columns are still empty | learn.microsoft.com cost-usage-details-focus |
| Google Cloud | Up to 1.2 | **Preview** (BigQuery export, release note 8 Jun 2026) | cloud.google.com billing release notes |
| Oracle OCI | 1.0 or 1.2 | The FOCUS site contradicts itself | focus.finops.org OCI guide |
| MongoDB, Snowflake, Vercel, Databricks | **1.3** | Not stated | FOCUS table |
| Nebius, Grafana Cloud, IBM Cloud, Redis, STACKIT | 1.2 | Not stated | FOCUS table |
| Alibaba, Tencent, Huawei, OVHcloud, Cloudflare, CoreWeave | 1.0 | Not stated | FOCUS table |
| Anyone | **1.4** | None found | No provider listed |

Tooling: the official `focus-validator` (PyPI 2.2.1) documents only 1.2 rules.
The 1.4 announcement says 1.3 conformance testing exists and 1.4 support is
coming; neither is verified as shipped.

This confirms the owner's read: the hyperscalers are at 1.0 and 1.2, and
Azure and GCP are still preview at 1.2. 1.3 shows up only at a handful of
SaaS/data providers, and nobody emits 1.4 yet.

## What changed after 1.2

- **1.3** (ratified Dec 2025):
  - A `ContractCommitment` dataset.
  - Split-cost allocation columns done by the data generator: `AllocatedMethodId`, `AllocatedResourceId`, `AllocatedTags`, …
  - `ServiceProviderName` and `HostProviderName` for SaaS/PaaS resale.
  - `ContractApplied`.
  - Dataset recency and completeness metadata.
  - `ProviderName` and `PublisherName` **deprecated**.
  - Nothing AI-specific.
- **1.4** (ratified 4 Jun 2026):
  - `InvoiceDetail` and `BillingPeriod` datasets.
  - About 17 more `ContractCommitment` columns.
  - The first column **removals**: `ProviderName` and `PublisherName`.
  - `ContractApplied` moved to the JSON object format, which breaks existing parsers.
  - `BilledCost` and `EffectiveCost` rules rewritten.
  - `InvoiceId` changed from Recommended to Conditional.
- **1.5** (ratification 3 Dec 2026, announcement later in December):
  - The AI release.
  - Model properties on SKU Price Details: `ModelDeveloper`, `ModelFamily`, `ModelId`, `ModelVersion`.
  - `TokenCacheAction` and `TokenDirection`.
  - `PrincipalId`, `CredentialId`, `RequesterDetails`.
  - Consumption currency and unit names.
  - Still in final review, so it could slip to 1.6: the SKU Price dataset and the AI billing worked examples.

## Recommendation

1. **Keep 1.0 and 1.2 as the default answer versions.** They are what
   AWS, Azure, GCP and OCI export. No change to existing tools.
2. **Add 1.3 and 1.4 to the FOCUS server in Q4 2026, after the npm
   v0.2.0 release.** Mark them "ratified, limited provider adoption" in
   every answer. The value is less about today's exports and more about:
   - **Migration questions:** `compare_versions` is where 1.4 matters
     most, because it is the first release that removes columns.
   - **SaaS/data providers already on 1.3:** Snowflake, Databricks,
     MongoDB, Vercel.
   - **Contract and invoice datasets** that FinOps practitioners ask about.

   The crawler already pulls by spec tag, so each version starts as a
   `VERSIONS` entry. Check first whether 1.3+ needs the parser to handle
   more than one dataset, since ContractCommitment, InvoiceDetail and
   BillingPeriod sit outside Cost and Usage. That is the main unknown, and
   it should be sized before committing to a date.
3. **Treat 1.5 as the cross-server milestone (target: within two weeks of
   the December announcement).** When 1.5 ratifies:
   - Ingest it.
   - Re-point the tokenomics server's FOCUS links (`FOCUS_LINK_VERSION`
     in `src/crawlers/tokenomics/links-data.ts`) so the 11 working-draft
     identifiers get real `focus://spec/1.5/…` URIs. These are
     `ModelId`, `TokenCacheAction`, `PrincipalId`, and the rest.
   - Re-crawl the tokenomics FOCUS 1.5 page, which will then describe a
     ratified release.

   This is the change that makes the three servers line up for AI cost
   questions.
4. **Add a provider-support resource to the FOCUS server.** It would come
   from the FOCUS "latest version supported" table, with GA/preview noted
   where a provider's own docs state it. Agents asking "can I get this
   column from my AWS/Azure/GCP export?" need this more than they need
   another spec version. Re-check it each release; it changes faster than
   the spec.
5. **Defer validator integration.** Until `focus-validator` ships rules
   past 1.2, use it only for 1.2.

## Open items to verify before building

- **Datasets:** whether the FOCUS_Spec repository layout for 1.3/1.4 puts
  non-Cost-and-Usage datasets in a structure our column parser does not
  read.
- **OCI's actual version:** 1.0 or 1.2.
- **1.3 export status:** GA vs preview for the four SaaS providers on 1.3.
- **SKU Price dataset:** whether it passed the 8 Oct 2026 Member approval
  deadline for 1.5.
