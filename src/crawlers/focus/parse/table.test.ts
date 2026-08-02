import { describe, expect, it } from "vitest";
import { extractRequirements, findPipeTable } from "./table.js";

describe("findPipeTable", () => {
  it("parses headers and rows, stopping at the first non-table line", () => {
    const lines = [
      "intro text",
      "| Constraint   | Value  |",
      "|:-------------|:-------|",
      "| Column type  | Metric |",
      "| Feature level| Mandatory |",
      "",
      "trailing prose",
    ];
    const result = findPipeTable(lines);
    expect(result).not.toBeNull();
    expect(result?.table.headers).toEqual(["Constraint", "Value"]);
    expect(result?.table.rows).toEqual([
      ["Column type", "Metric"],
      ["Feature level", "Mandatory"],
    ]);
    expect(result?.nextIdx).toBe(5);
  });

  it("finds a second table starting after nextIdx", () => {
    const lines = [
      "| A | B |",
      "|---|---|",
      "| 1 | 2 |",
      "",
      "Allowed values:",
      "",
      "| Value | Description |",
      "| :---- | :----------- |",
      "| Used  | in use       |",
    ];
    const first = findPipeTable(lines);
    expect(first).not.toBeNull();
    const second = findPipeTable(lines, first?.nextIdx);
    expect(second?.table.headers).toEqual(["Value", "Description"]);
    expect(second?.table.rows).toEqual([["Used", "in use"]]);
  });

  it("returns null when there is no table", () => {
    expect(findPipeTable(["just", "some", "prose"])).toBeNull();
  });
});

describe("extractRequirements", () => {
  it("keeps top-level bullets and nested normative bullets, prefixed with the parent's scoping clause", () => {
    const section = [
      "* Foo MUST be present.",
      "* Foo MUST be of type String.",
      "* Foo nullability is defined as follows:",
      "  * Foo MUST be null when Bar is absent.",
      "  * Foo MUST NOT be null when Bar is present.",
      "* Bar is not normative.",
    ].join("\n");
    expect(extractRequirements(section)).toEqual([
      "Foo MUST be present.",
      "Foo MUST be of type String.",
      "Foo nullability is defined as follows: Foo MUST be null when Bar is absent.",
      "Foo nullability is defined as follows: Foo MUST NOT be null when Bar is present.",
    ]);
  });

  it("preserves the EffectiveCost 1.2 nested reconciliation MUSTs (gate 4 C2-fidelity-1)", () => {
    const section = [
      "The EffectiveCost column adheres to the following requirements:",
      "",
      "* EffectiveCost MUST be present in a [*FOCUS dataset*](#glossary:FOCUS-dataset).",
      "* EffectiveCost MUST NOT be null.",
      '* When ChargeCategory is not "Usage" or "Purchase", EffectiveCost adheres to the following additional requirements:',
      '  * EffectiveCost of a *charge* calculated based on other *charges* (e.g., when the ChargeCategory is "Tax") MUST be calculated based on the EffectiveCost of those related *charges*.',
      '  * EffectiveCost of a *charge* unrelated to other *charges* (e.g., when the ChargeCategory is "Credit") MUST match the [BilledCost](#billedcost).',
      "* *Charges* for a given [CommitmentDiscountId](#commitmentdiscountid) adhere to the following additional requirements:",
      '  * The sum of EffectiveCost where ChargeCategory is "Usage" MUST equal the sum of BilledCost where ChargeCategory is "Purchase".',
    ].join("\n");
    const requirements = extractRequirements(section);
    expect(requirements).toContain(
      '*Charges* for a given [CommitmentDiscountId](#commitmentdiscountid) adhere to the following additional requirements: The sum of EffectiveCost where ChargeCategory is "Usage" MUST equal the sum of BilledCost where ChargeCategory is "Purchase".',
    );
    expect(requirements).toContain(
      'When ChargeCategory is not "Usage" or "Purchase", EffectiveCost adheres to the following additional requirements: EffectiveCost of a *charge* calculated based on other *charges* (e.g., when the ChargeCategory is "Tax") MUST be calculated based on the EffectiveCost of those related *charges*.',
    );
    expect(requirements).toHaveLength(5);
  });

  it("preserves the SkuId 1.2 nested nullability MUSTs (gate 4 C2-fidelity-1)", () => {
    const section = [
      "The SkuId column adheres to the following requirements:",
      "",
      "* SkuId MUST be present in a [*FOCUS dataset*](#glossary:FOCUS-dataset) when the provider supports unit pricing concepts and publishes price lists, publicly or as part of contracting.",
      "* SkuId nullability is defined as follows:",
      '  * SkuId MUST be null when [ChargeCategory](#chargecategory) is "Tax".',
      '  * SkuId MUST NOT be null when ChargeCategory is "Usage" or "Purchase" and [ChargeClass](#chargeclass) is not "Correction".',
      "  * SkuId MAY be null in all other cases.",
    ].join("\n");
    expect(extractRequirements(section)).toEqual([
      "SkuId MUST be present in a [*FOCUS dataset*](#glossary:FOCUS-dataset) when the provider supports unit pricing concepts and publishes price lists, publicly or as part of contracting.",
      'SkuId nullability is defined as follows: SkuId MUST be null when [ChargeCategory](#chargecategory) is "Tax".',
      'SkuId nullability is defined as follows: SkuId MUST NOT be null when ChargeCategory is "Usage" or "Purchase" and [ChargeClass](#chargeclass) is not "Correction".',
      "SkuId nullability is defined as follows: SkuId MAY be null in all other cases.",
    ]);
  });

  it("keeps InvoiceId 1.2's RECOMMENDED presence and MAY pre-invoice bullets (gate 4 C2-fidelity-2)", () => {
    const section = [
      "The InvoiceId column adheres to the following requirements:",
      "",
      "* InvoiceId is RECOMMENDED to be present in a [*FOCUS dataset*](#glossary:FOCUS-dataset).",
      "* InvoiceId MUST be of type String.",
      "* InvoiceId nullability is defined as follows:",
      "  * InvoiceId MUST be null when the *charge* is not associated either with an invoice or with a pre-generated provisional invoice.",
      "  * InvoiceId MUST NOT be null when the *charge* is associated with either an issued invoice or a pre-generated provisional invoice.",
      "* InvoiceId MAY be generated prior to an invoice being issued.",
    ].join("\n");
    const requirements = extractRequirements(section);
    expect(requirements).toContain(
      "InvoiceId is RECOMMENDED to be present in a [*FOCUS dataset*](#glossary:FOCUS-dataset).",
    );
    expect(requirements).toContain(
      "InvoiceId MAY be generated prior to an invoice being issued.",
    );
    expect(requirements).toContain(
      "InvoiceId nullability is defined as follows: InvoiceId MUST be null when the *charge* is not associated either with an invoice or with a pre-generated provisional invoice.",
    );
    expect(requirements).toContain(
      "InvoiceId nullability is defined as follows: InvoiceId MUST NOT be null when the *charge* is associated with either an issued invoice or a pre-generated provisional invoice.",
    );
    expect(requirements).toHaveLength(5);
  });

  it("falls back to normative prose sentences when there are no bullets", () => {
    const section =
      "This column is nice. The Foo column MUST be present and MUST NOT be null. " +
      "It is commonly used for reporting.";
    expect(extractRequirements(section)).toEqual([
      "The Foo column MUST be present and MUST NOT be null.",
    ]);
  });

  it("returns an empty array when nothing is normative", () => {
    expect(extractRequirements("Just some descriptive prose.")).toEqual([]);
  });
});
