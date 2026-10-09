import { describe, expect, it } from "vitest";
import { co2ePerUnit, pickFactor, planNewVersion, type Factor } from "./factors";
import { convert, type ConversionRow } from "./units";

const f = (o: Partial<Factor>): Factor => ({
  id: "x",
  material_id: "GRID-IN",
  region: "IN",
  gases: { co2: "0.727", ch4: "0", n2o: "0" },
  gwp_set: "AR5",
  valid_from: "2020-04-01",
  valid_to: null,
  version: 1,
  status: "approved",
  ...o,
});

describe("factor versioning", () => {
  const v1 = f({ id: "v1" });

  it("adding a dated version closes the open one the day before and keeps it", () => {
    const plan = planNewVersion([v1], { material_id: "GRID-IN", region: "IN", valid_from: "2026-04-01", valid_to: null });
    expect(plan).toEqual({ version: 2, close: { id: "v1", valid_to: "2026-03-31" } });
  });

  it("date lookup returns the version in force on that date", () => {
    const history = [f({ id: "v1", valid_to: "2026-03-31" }), f({ id: "v2", version: 2, valid_from: "2026-04-01", gases: { co2: "0.710", ch4: "0", n2o: "0" } })];
    const on = (date: string) => pickFactor(history, { materialId: "GRID-IN", date, region: "IN" })?.id;
    expect(on("2025-06-15")).toBe("v1");
    expect(on("2026-03-31")).toBe("v1");
    expect(on("2026-04-01")).toBe("v2");
    expect(on("2027-01-10")).toBe("v2");
    expect(on("2019-12-31")).toBeUndefined();
  });

  it("rejects back-dated versions so history stays append-only", () => {
    expect(() => planNewVersion([v1], { material_id: "GRID-IN", region: "IN", valid_from: "2019-04-01", valid_to: null })).toThrow(/must start later/);
  });

  it("rejects valid_to before valid_from", () => {
    expect(() => planNewVersion([v1], { material_id: "GRID-IN", region: "IN", valid_from: "2026-04-01", valid_to: "2026-01-01" })).toThrow();
  });

  it("leaves an already-closed earlier version alone", () => {
    const closed = f({ id: "v1", valid_to: "2024-03-31" });
    expect(planNewVersion([closed], { material_id: "GRID-IN", region: "IN", valid_from: "2025-04-01", valid_to: null }).close).toBeNull();
  });

  it("versions are per material and region", () => {
    expect(planNewVersion([v1], { material_id: "GRID-IN", region: "KW", valid_from: "2020-04-01", valid_to: null })).toEqual({ version: 1, close: null });
  });

  it("skips drafts unless asked, and falls back to GLOBAL when the region has none", () => {
    const draft = f({ id: "d", status: "draft" });
    const global = f({ id: "g", region: "GLOBAL" });
    expect(pickFactor([draft], { materialId: "GRID-IN", date: "2025-05-01", region: "IN" })).toBeNull();
    expect(pickFactor([draft], { materialId: "GRID-IN", date: "2025-05-01", region: "IN", includeDraft: true })?.id).toBe("d");
    expect(pickFactor([global], { materialId: "GRID-IN", date: "2025-05-01", region: "IN" })?.id).toBe("g");
  });
});

describe("CO2e per unit", () => {
  it("weights CH4 and N2O by the GWP set", () => {
    const diesel = { gases: { co2: "2.6606", ch4: "0.0001077", n2o: "0.00002154" }, gwp_set: "AR5" as const };
    // 2.6606 + 0.0001077*28 + 0.00002154*265
    expect(co2ePerUnit(diesel).toFixed(6)).toBe("2.669324");
    expect(co2ePerUnit({ ...diesel, gwp_set: "AR6" }).toFixed(6)).toBe("2.669690");
  });

  it("uses the material's own GWP for fugitive gases (SF6 1 kg = GWP)", () => {
    const sf6 = { gases: { co2: "0", ch4: "0", n2o: "0", other: "1" }, gwp_set: "AR5" as const };
    expect(co2ePerUnit(sf6, { AR5: 23500, AR6: 24300 }).toNumber()).toBe(23500);
    expect(() => co2ePerUnit(sf6)).toThrow(/GWP/);
  });

  it("prefers a composite CO2e when given", () => {
    expect(co2ePerUnit({ gases: { co2: "0", ch4: "0", n2o: "0" }, co2e: "2.5", gwp_set: "AR5" }).toNumber()).toBe(2.5);
  });
});

describe("unit conversion", () => {
  const rows: ConversionRow[] = [
    { from_unit: "kL", to_unit: "L", factor: "1000" },
    { from_unit: "t", to_unit: "kg", factor: "1000" },
    { from_unit: "MWh", to_unit: "kWh", factor: "1000" },
    { from_unit: "L", to_unit: "kg", factor: "0.835", material_id: "HSD" },
  ];
  it("converts directly, inversely and through a chain", () => {
    expect(convert("2.5", "kL", "L", rows).toNumber()).toBe(2500);
    expect(convert("4200", "kWh", "MWh", rows).toNumber()).toBe(4.2);
    expect(convert("1", "t", "L", rows, "HSD").toFixed(2)).toBe("1197.60");
  });
  it("only uses material densities for that material", () => {
    expect(() => convert("1", "t", "L", rows, "PETROL")).toThrow(/No conversion/);
  });
});
