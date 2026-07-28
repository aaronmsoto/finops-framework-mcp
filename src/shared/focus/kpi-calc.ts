// Computable formula registry for calculate_kpi (T-034). Deliberately a
// small subset of data/focus/derived/kpi-mapping.json's ~18 entries: only
// KPIs whose FOCUS-terms formula reduces to a pure aggregation over CSV
// rows — no external input (forecast/budget figures FOCUS doesn't carry)
// and no ambiguous free-text unit matching (e.g. "which ConsumedUnit
// strings mean core-hours") — get a formula here. Every other mapped KPI
// is intentionally absent: calculate_kpi reports "no formula registered"
// for it rather than guess at a heuristic (spec acceptance: "KPIs without
// formulas error cleanly with guidance").

export type KpiCalcUnit = "percent" | "ratio";

export interface KpiCalcResult {
  value: number;
  unit: KpiCalcUnit;
  row_count: number;
}

export interface CsvTable {
  header: string[];
  rows: string[][];
}

const NULL_TOKENS = new Set(["", "NULL"]);

function colIndex(header: string[], id: string): number {
  const idx = header.indexOf(id);
  if (idx === -1) {
    throw new Error(`sample data is missing required column "${id}"`);
  }
  return idx;
}

function numAt(row: string[], idx: number): number {
  const raw = row[idx];
  if (raw === undefined || NULL_TOKENS.has(raw)) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function isAt(row: string[], idx: number, value: string): boolean {
  const raw = row[idx];
  return raw !== undefined && raw.toLowerCase() === value.toLowerCase();
}

function isNotNullAt(row: string[], idx: number): boolean {
  const raw = row[idx];
  return raw !== undefined && !NULL_TOKENS.has(raw);
}

function isNullAt(row: string[], idx: number): boolean {
  return !isNotNullAt(row, idx);
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function pct(numerator: number, denominator: number): number {
  return ratio(numerator, denominator) * 100;
}

type Formula = (table: CsvTable) => KpiCalcResult;

/** SUM(sumCol) over rows matching every predicate (empty predicates = every row). */
function sumWhere(
  table: CsvTable,
  sumColId: string,
  predicates: ((row: string[]) => boolean)[],
): number {
  const idx = colIndex(table.header, sumColId);
  let total = 0;
  for (const row of table.rows) {
    if (predicates.every((p) => p(row))) total += numAt(row, idx);
  }
  return total;
}

const FORMULAS: Record<string, Formula> = {
  "effective-savings-rate-percentage": (t) => {
    const list = sumWhere(t, "ListCost", []);
    const eff = sumWhere(t, "EffectiveCost", []);
    return {
      value: pct(list - eff, list),
      unit: "percent",
      row_count: t.rows.length,
    };
  },

  "commitment-utilization-score": (t) => {
    const chargeCategory = colIndex(t.header, "ChargeCategory");
    const commitmentId = colIndex(t.header, "CommitmentDiscountId");
    const usage = sumWhere(t, "EffectiveCost", [
      (r) => isAt(r, chargeCategory, "Usage"),
      (r) => isNotNullAt(r, commitmentId),
    ]);
    const purchase = sumWhere(t, "ContractedCost", [
      (r) => isAt(r, chargeCategory, "Purchase"),
      (r) => isNotNullAt(r, commitmentId),
    ]);
    return {
      value: pct(usage, purchase),
      unit: "percent",
      row_count: t.rows.length,
    };
  },

  "percent-of-compute-spend-covered-by-commitment-based-discounts": (t) => {
    const serviceCategory = colIndex(t.header, "ServiceCategory");
    const commitmentId = colIndex(t.header, "CommitmentDiscountId");
    const covered = sumWhere(t, "EffectiveCost", [
      (r) => isAt(r, serviceCategory, "Compute"),
      (r) => isNotNullAt(r, commitmentId),
    ]);
    const compute = sumWhere(t, "EffectiveCost", [
      (r) => isAt(r, serviceCategory, "Compute"),
    ]);
    return {
      value: pct(covered, compute),
      unit: "percent",
      row_count: t.rows.length,
    };
  },

  "percentage-of-commitment-based-discount-waste": (t) => {
    const chargeCategory = colIndex(t.header, "ChargeCategory");
    const commitmentId = colIndex(t.header, "CommitmentDiscountId");
    const usage = sumWhere(t, "EffectiveCost", [
      (r) => isAt(r, chargeCategory, "Usage"),
      (r) => isNotNullAt(r, commitmentId),
    ]);
    const purchase = sumWhere(t, "ContractedCost", [
      (r) => isAt(r, chargeCategory, "Purchase"),
      (r) => isNotNullAt(r, commitmentId),
    ]);
    return {
      value: (1 - ratio(usage, purchase)) * 100,
      unit: "percent",
      row_count: t.rows.length,
    };
  },

  "consumption-versus-commitment": (t) => {
    const chargeCategory = colIndex(t.header, "ChargeCategory");
    const commitmentId = colIndex(t.header, "CommitmentDiscountId");
    const usage = sumWhere(t, "EffectiveCost", [
      (r) => isAt(r, chargeCategory, "Usage"),
      (r) => isNotNullAt(r, commitmentId),
    ]);
    const purchase = sumWhere(t, "ContractedCost", [
      (r) => isAt(r, chargeCategory, "Purchase"),
      (r) => isNotNullAt(r, commitmentId),
    ]);
    return {
      value: ratio(usage, purchase),
      unit: "ratio",
      row_count: t.rows.length,
    };
  },

  "allocation-accuracy-index-aai": (t) => {
    const subAccountId = colIndex(t.header, "SubAccountId");
    const tags = colIndex(t.header, "Tags");
    const allocated = sumWhere(t, "BilledCost", [
      (r) => isNotNullAt(r, subAccountId),
      (r) => isNotNullAt(r, tags),
    ]);
    const total = sumWhere(t, "BilledCost", []);
    return {
      value: pct(allocated, total),
      unit: "percent",
      row_count: t.rows.length,
    };
  },

  "percentage-of-costs-associated-with-unallocated-csp-cloud-resources": (
    t,
  ) => {
    const subAccountId = colIndex(t.header, "SubAccountId");
    const unallocated = sumWhere(t, "BilledCost", [
      (r) => isNullAt(r, subAccountId),
    ]);
    const total = sumWhere(t, "BilledCost", []);
    return {
      value: pct(unallocated, total),
      unit: "percent",
      row_count: t.rows.length,
    };
  },

  "percentage-of-costs-associated-with-untagged-csp-cloud-resources": (t) => {
    const tags = colIndex(t.header, "Tags");
    const untagged = sumWhere(t, "BilledCost", [(r) => isNullAt(r, tags)]);
    const total = sumWhere(t, "BilledCost", []);
    return {
      value: pct(untagged, total),
      unit: "percent",
      row_count: t.rows.length,
    };
  },

  "percentage-of-unallocated-shared-csp-cloud-cost": (t) => {
    const chargeCategory = colIndex(t.header, "ChargeCategory");
    const subAccountId = colIndex(t.header, "SubAccountId");
    const resourceId = colIndex(t.header, "ResourceId");
    const unallocatedShared = sumWhere(t, "BilledCost", [
      (r) => isAt(r, chargeCategory, "Usage"),
      (r) => isNullAt(r, subAccountId),
      (r) => isNullAt(r, resourceId),
    ]);
    const total = sumWhere(t, "BilledCost", []);
    return {
      value: pct(unallocatedShared, total),
      unit: "percent",
      row_count: t.rows.length,
    };
  },
};

export function hasFormula(kpiSlug: string): boolean {
  return kpiSlug in FORMULAS;
}

export function calculableKpiSlugs(): string[] {
  return Object.keys(FORMULAS);
}

/** Throws if `kpiSlug` has no registered formula or the table is missing a
 * column the formula needs — callers translate to a clean tool error. */
export function calculateKpi(kpiSlug: string, table: CsvTable): KpiCalcResult {
  const formula = FORMULAS[kpiSlug];
  if (!formula) {
    throw new Error(`no formula registered for KPI "${kpiSlug}"`);
  }
  return formula(table);
}
