// Emission factor library: GWP sets, CO2e per unit, date lookup and append-only versioning.
// Pure functions; Firestore access lives in src/app/factors/actions.ts.
import Decimal from "decimal.js";

export const GWP_SETS = ["AR4", "AR5", "AR6"] as const;
export type GwpSet = (typeof GWP_SETS)[number];

// IPCC 100-year GWPs for CH4 and N2O. AR6 CH4 uses the fossil value.
// AR4: WG1 Table 2.14 · AR5: WG1 Ch8 Table 8.A.1 · AR6: WG1 Ch7 Table 7.15
export const GWP: Record<GwpSet, { ch4: number; n2o: number }> = {
  AR4: { ch4: 25, n2o: 298 },
  AR5: { ch4: 28, n2o: 265 },
  AR6: { ch4: 29.8, n2o: 273 },
};

export type Factor = {
  id: string;
  material_id: string;
  region: string;
  gases: { co2: string; ch4: string; n2o: string; other?: string };
  co2e?: string; // composite CO2e per unit when no gas-wise split is published (LCA, travel, waste)
  gwp_set: GwpSet;
  valid_from: string;
  valid_to: string | null;
  version: number;
  status: "draft" | "approved" | "retired";
};

/** kg CO2e per base unit. `other` is kg of the material's own gas (HFC, SF6) and uses its GWP. */
export function co2ePerUnit(f: Pick<Factor, "gases" | "co2e" | "gwp_set">, materialGwp?: Partial<Record<GwpSet, number>>): Decimal {
  if (f.co2e !== undefined) return new Decimal(f.co2e);
  const g = GWP[f.gwp_set];
  let total = new Decimal(f.gases.co2).add(new Decimal(f.gases.ch4).mul(g.ch4)).add(new Decimal(f.gases.n2o).mul(g.n2o));
  if (f.gases.other && new Decimal(f.gases.other).gt(0)) {
    const gwp = materialGwp?.[f.gwp_set];
    if (gwp === undefined) throw new Error(`Material has no ${f.gwp_set} GWP for its fugitive gas`);
    total = total.add(new Decimal(f.gases.other).mul(gwp));
  }
  return total;
}

const covers = (f: Factor, date: string) => f.valid_from <= date && (f.valid_to === null || date <= f.valid_to);

/**
 * The factor version in force on `date` (ISO YYYY-MM-DD) for a material. Tries the exact region first,
 * then GLOBAL (IPCC/DEFRA defaults, which callers should flag as non-Indian).
 */
export function pickFactor<T extends Factor>(
  factors: T[],
  q: { materialId: string; date: string; region: string; includeDraft?: boolean },
): T | null {
  const usable = factors.filter(
    (f) => f.material_id === q.materialId && f.status !== "retired" && (q.includeDraft || f.status === "approved") && covers(f, q.date),
  );
  for (const region of [q.region, "GLOBAL"]) {
    const hit = usable.filter((f) => f.region === region).sort((a, b) => b.version - a.version)[0];
    if (hit) return hit;
  }
  return null;
}

const dayBefore = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/**
 * Plan a new version for (material, region). History is append-only: the new version must start after
 * every existing one; the previous open or overlapping version is closed the day before. Old versions
 * are never edited otherwise, so past calculations stay reproducible.
 */
export function planNewVersion(
  existing: Factor[],
  input: { material_id: string; region: string; valid_from: string; valid_to: string | null },
): { version: number; close: { id: string; valid_to: string } | null } {
  if (input.valid_to !== null && input.valid_to < input.valid_from) throw new Error("Valid to must be on or after valid from");
  const same = existing.filter((f) => f.material_id === input.material_id && f.region === input.region && f.status !== "retired");
  const version = Math.max(0, ...existing.filter((f) => f.material_id === input.material_id && f.region === input.region).map((f) => f.version)) + 1;
  const latest = same.sort((a, b) => b.valid_from.localeCompare(a.valid_from))[0];
  if (!latest) return { version, close: null };
  if (input.valid_from <= latest.valid_from)
    throw new Error(`v${latest.version} already starts on ${latest.valid_from}; a new version must start later`);
  const close = latest.valid_to === null || latest.valid_to >= input.valid_from ? { id: latest.id, valid_to: dayBefore(input.valid_from) } : null;
  return { version, close };
}
