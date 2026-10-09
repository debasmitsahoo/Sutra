import { describe, expect, it } from "vitest";
import { EmissionFactor, Material, UnitConversion } from "../../src/lib/db/schema";
import { co2ePerUnit } from "../../src/lib/ghg/factors";
import { convert } from "../../src/lib/ghg/units";
import { CONVERSIONS, FACTORS, MATERIALS, SEED_VALID_FROM } from "./library";

describe("seed library", () => {
  const factor = (code: string) => FACTORS.find((f) => f.material_id === code)!;
  const material = (code: string) => MATERIALS.find((m) => m.code === code)!;

  it("every material, conversion and factor passes the schema; every material has a factor", () => {
    for (const m of MATERIALS) Material.parse(m);
    for (const c of CONVERSIONS) UnitConversion.parse(c);
    for (const f of FACTORS)
      EmissionFactor.parse({ ...f, gwp_set: "AR5", valid_from: SEED_VALID_FROM, valid_to: null, version: 1, status: "draft" });
    expect(new Set(MATERIALS.map((m) => m.code)).size).toBe(MATERIALS.length);
    for (const m of MATERIALS) expect(factor(m.code), m.code).toBeDefined();
    for (const f of FACTORS) expect(f.verify_note).toMatch(/^VERIFY:/);
  });

  it("every allowed entry unit converts to the material's base unit", () => {
    for (const m of MATERIALS) for (const u of m.units) expect(() => convert(1, u, m.base_unit, CONVERSIONS, m.code), `${m.code} ${u}`).not.toThrow();
  });

  it("derived fuel factors land on the expected magnitudes", () => {
    const hsd = co2ePerUnit({ ...factor("HSD"), gwp_set: "AR5" });
    expect(hsd.toNumber()).toBeGreaterThan(2.6); // ~2.67 kg CO2e per litre of diesel
    expect(hsd.toNumber()).toBeLessThan(2.75);
    expect(Number(material("HSD").ncv_gj_per_unit)).toBeCloseTo(0.0359, 3);
    const g11 = co2ePerUnit({ ...factor("COAL-G11"), gwp_set: "AR5" }).toNumber();
    expect(g11).toBeGreaterThan(1500); // ~1.7 t CO2 per t of G11 coal
    expect(g11).toBeLessThan(1800);
    expect(co2ePerUnit({ ...factor("SF6"), gwp_set: "AR5" }, material("SF6").gwp).toNumber()).toBe(23500);
  });
});
