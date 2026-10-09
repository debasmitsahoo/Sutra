// Unit conversion over the unit_conversions table. Rows are edges (usable both ways); material-specific
// rows (densities, e.g. HSD L -> kg) apply only to that material. Breadth-first search finds the shortest
// chain, e.g. t -> kg -> L for diesel bought by weight.
import Decimal from "decimal.js";

export const UNITS = ["L", "kL", "kg", "t", "SCM", "m3", "kWh", "MWh", "GJ", "MJ", "km", "t-km", "p-km", "nights"] as const;

export type ConversionRow = { from_unit: string; to_unit: string; factor: string; material_id?: string };

export function convert(qty: Decimal.Value, from: string, to: string, rows: ConversionRow[], materialId?: string): Decimal {
  const q = new Decimal(qty);
  if (from === to) return q;
  const edges = new Map<string, { to: string; f: Decimal }[]>();
  const push = (a: string, b: string, f: Decimal) => edges.set(a, [...(edges.get(a) ?? []), { to: b, f }]);
  for (const r of rows) {
    if (r.material_id && r.material_id !== materialId) continue;
    push(r.from_unit, r.to_unit, new Decimal(r.factor));
    push(r.to_unit, r.from_unit, new Decimal(1).div(r.factor));
  }
  const seen = new Map<string, Decimal>([[from, new Decimal(1)]]);
  const queue = [from];
  while (queue.length) {
    const u = queue.shift()!;
    for (const e of edges.get(u) ?? []) {
      if (seen.has(e.to)) continue;
      const f = seen.get(u)!.mul(e.f);
      if (e.to === to) return q.mul(f);
      seen.set(e.to, f);
      queue.push(e.to);
    }
  }
  throw new Error(`No conversion from ${from} to ${to}${materialId ? ` for ${materialId}` : ""}`);
}
