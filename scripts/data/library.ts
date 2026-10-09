// Seed library: granular materials, unit conversions and DRAFT emission factors.
// Every factor is status "draft" with a VERIFY note naming the Indian source to confirm against.
// A group admin must check each value and approve it before calculations use it.
// Fuel factors are derived, not typed: density x NCV gives energy; energy x IPCC kg/TJ gives gas mass.
import Decimal from "decimal.js";

type Cat =
  | "stationary_combustion" | "mobile_combustion" | "process" | "fugitive"
  | "purchased_electricity" | "purchased_steam" | "purchased_cooling"
  | "cat1_purchased_goods" | "cat4_upstream_transport" | "cat5_waste" | "cat6_business_travel" | "cat7_commuting"
  | "cat9_downstream_transport";

export type SeedMaterial = {
  code: string; name: string; scope: 1 | 2 | 3; categories: Cat[]; base_unit: string; units: string[];
  ncv_gj_per_unit?: string; is_renewable?: boolean; gwp?: { AR4?: number; AR5: number; AR6: number }; help?: string;
};
export type SeedFactor = {
  material_id: string; region: string; unit: string;
  gases: { co2: string; ch4: string; n2o: string; other?: string }; co2e?: string;
  source: string; publisher: string; citation: string; verify_note: string;
};

export const SEED_VALID_FROM = "2020-04-01";
const ZERO = { co2: "0", ch4: "0", n2o: "0" };
const r = (d: Decimal, dp = 8) => d.toDecimalPlaces(dp).toString();

export const MATERIALS: SeedMaterial[] = [];
export const FACTORS: SeedFactor[] = [];
export const CONVERSIONS: { from_unit: string; to_unit: string; factor: string; material_id?: string; note?: string }[] = [
  { from_unit: "kL", to_unit: "L", factor: "1000" },
  { from_unit: "t", to_unit: "kg", factor: "1000" },
  { from_unit: "MWh", to_unit: "kWh", factor: "1000" },
  { from_unit: "GJ", to_unit: "MJ", factor: "1000" },
  { from_unit: "kWh", to_unit: "MJ", factor: "3.6" },
  { from_unit: "m3", to_unit: "SCM", factor: "1", note: "Assumes the meter reads at standard conditions; correct with the supplier's factor otherwise" },
];

// --- Scope 1 · fuels ----------------------------------------------------------------------------
// IPCC 2006 GL Vol 2: Ch1 Table 1.2 (NCV, TJ/Gg = MJ/kg), Table 1.4 (CO2 kg/TJ); Ch2 Table 2.3 (CH4, N2O kg/TJ,
// manufacturing industries & construction).
const IPCC_FUEL = "IPCC 2006 GL Vol 2 Ch1 T1.2 (NCV), T1.4 (CO2), Ch2 T2.3 (CH4, N2O)";
function fuel(o: {
  code: string; name: string; categories: Cat[]; base_unit: string; units: string[];
  kgPerUnit: string; ncvMjPerKg: string; co2PerTJ: string; ch4PerTJ: string; n2oPerTJ: string;
  region?: string; source?: string; publisher?: string; verify: string; help?: string;
}) {
  const tj = new Decimal(o.kgPerUnit).mul(o.ncvMjPerKg).div(1e6);
  MATERIALS.push({
    code: o.code, name: o.name, scope: 1, categories: o.categories, base_unit: o.base_unit, units: o.units,
    ncv_gj_per_unit: r(tj.mul(1000), 6), help: o.help,
  });
  FACTORS.push({
    material_id: o.code, region: o.region ?? "GLOBAL", unit: o.base_unit,
    gases: { co2: r(tj.mul(o.co2PerTJ)), ch4: r(tj.mul(o.ch4PerTJ)), n2o: r(tj.mul(o.n2oPerTJ)) },
    source: o.source ?? "IPCC 2006 default (derived)", publisher: o.publisher ?? "IPCC",
    citation: `${o.source ? o.source + "; " : ""}${IPCC_FUEL}; ${o.kgPerUnit} kg/${o.base_unit} x ${o.ncvMjPerKg} MJ/kg`,
    verify_note: o.verify,
  });
  if (o.base_unit === "L") CONVERSIONS.push({ from_unit: "L", to_unit: "kg", factor: o.kgPerUnit, material_id: o.code, note: "Density, VERIFY with supplier spec" });
}

const LIQ = ["L", "kL", "kg", "t"];
const oil = { ch4PerTJ: "3", n2oPerTJ: "0.6" };
fuel({ code: "HSD", name: "High-speed diesel (HSD)", categories: ["stationary_combustion", "mobile_combustion"], base_unit: "L", units: LIQ,
  kgPerUnit: "0.835", ncvMjPerKg: "43.0", co2PerTJ: "74100", ...oil,
  verify: "VERIFY: India GHG Program fuel factors / BEE NCV for HSD; density per IS 1460", help: "DG sets, batching plants, site vehicles and machinery." });
fuel({ code: "LDO", name: "Light diesel oil (LDO)", categories: ["stationary_combustion"], base_unit: "L", units: LIQ,
  kgPerUnit: "0.86", ncvMjPerKg: "43.0", co2PerTJ: "74100", ...oil, verify: "VERIFY: India GHG Program / supplier test certificate" });
fuel({ code: "FO", name: "Furnace oil (FO)", categories: ["stationary_combustion"], base_unit: "L", units: LIQ,
  kgPerUnit: "0.95", ncvMjPerKg: "40.4", co2PerTJ: "77400", ...oil, verify: "VERIFY: India GHG Program / supplier GCV" });
fuel({ code: "PETROL", name: "Petrol (motor spirit)", categories: ["mobile_combustion", "stationary_combustion"], base_unit: "L", units: LIQ,
  kgPerUnit: "0.745", ncvMjPerKg: "44.3", co2PerTJ: "69300", ...oil, verify: "VERIFY: India GHG Program mobile factors (CH4/N2O differ for vehicles)" });
fuel({ code: "KEROSENE", name: "Superior kerosene oil (SKO)", categories: ["stationary_combustion"], base_unit: "L", units: LIQ,
  kgPerUnit: "0.79", ncvMjPerKg: "43.8", co2PerTJ: "71900", ...oil, verify: "VERIFY: India GHG Program" });
fuel({ code: "LPG", name: "Liquefied petroleum gas (LPG)", categories: ["stationary_combustion", "mobile_combustion"], base_unit: "kg", units: ["kg", "t"],
  kgPerUnit: "1", ncvMjPerKg: "47.3", co2PerTJ: "63100", ch4PerTJ: "1", n2oPerTJ: "0.1", verify: "VERIFY: India GHG Program / PPAC NCV for LPG" });
fuel({ code: "CNG", name: "Compressed natural gas (CNG)", categories: ["mobile_combustion", "stationary_combustion"], base_unit: "kg", units: ["kg"],
  kgPerUnit: "1", ncvMjPerKg: "48.0", co2PerTJ: "56100", ch4PerTJ: "1", n2oPerTJ: "0.1", verify: "VERIFY: city gas distributor GCV statement" });
fuel({ code: "PNG", name: "Piped natural gas (PNG)", categories: ["stationary_combustion"], base_unit: "SCM", units: ["SCM", "m3"],
  kgPerUnit: "0.72", ncvMjPerKg: "48.0", co2PerTJ: "56100", ch4PerTJ: "1", n2oPerTJ: "0.1", verify: "VERIFY: GAIL/IGL/MGL billed GCV (kcal/SCM) and density" });

// Indian non-coking coal by grade (Ministry of Coal GCV bands). NCV ~ 0.95 x GCV midpoint until supplier lot data is used.
// CO2 95,810 kg/TJ: India's national communication value for non-coking coal (VERIFY).
for (const [g, lo, hi] of [["G6", 5800, 6100], ["G9", 4900, 5200], ["G11", 4300, 4600], ["G13", 3700, 4000]] as const) {
  const ncv = new Decimal(lo + hi).div(2).mul("4.1868").div(1000).mul("0.95").toDecimalPlaces(3).toString();
  fuel({ code: `COAL-${g}`, name: `Non-coking coal ${g} (${lo}–${hi} kcal/kg GCV)`, categories: ["stationary_combustion"], base_unit: "t", units: ["t", "kg"],
    kgPerUnit: "1000", ncvMjPerKg: ncv, co2PerTJ: "95810", ch4PerTJ: "10", n2oPerTJ: "1.5", region: "IN",
    source: "India national communication (non-coking coal CO2 95.81 t/TJ)", publisher: "MoEFCC",
    verify: "VERIFY: supplier GCV per lot (CIL/SCCL certificate) and MoEFCC BUR/NATCOM coal factor",
    help: "Select the grade on the coal supplier's invoice. Lot-wise GCV is better when available." });
}

MATERIALS.push({ code: "ACETYLENE", name: "Dissolved acetylene (welding & cutting)", scope: 1, categories: ["process"], base_unit: "kg", units: ["kg"], ncv_gj_per_unit: "0.0482" });
FACTORS.push({ material_id: "ACETYLENE", region: "GLOBAL", unit: "kg", gases: { co2: "3.38461538", ch4: "0", n2o: "0" },
  source: "Stoichiometry: C2H2 + 2.5 O2 -> 2 CO2 + H2O (88/26 kg CO2 per kg)", publisher: "Calculated",
  citation: "Complete combustion, molar masses C2H2 26.04, CO2 44.01", verify_note: "VERIFY: NCV 48.2 MJ/kg with gas supplier" });

// --- Scope 1 · fugitive gases -------------------------------------------------------------------
// GWP-100: AR5 WG1 Ch8 Table 8.A.1; AR6 WG1 Ch7 Table 7.SM.7. Blends are mass-weighted (ASHRAE 34 composition).
const fugitive: [code: string, name: string, ar5: number, ar6: number, help?: string][] = [
  ["R-22", "Refrigerant R-22 (HCFC)", 1760, 1960, "HCFC controlled under the Montreal Protocol; GHG Protocol reports it outside the Kyoto basket. Confirm treatment with the consultant."],
  ["R-32", "Refrigerant R-32", 677, 771],
  ["R-134A", "Refrigerant R-134a", 1300, 1530],
  ["R-410A", "Refrigerant R-410A (R-32/R-125 50/50)", 1924, 2256],
  ["R-407C", "Refrigerant R-407C (R-32/125/134a 23/25/52)", 1624, 1908],
  ["R-404A", "Refrigerant R-404A (R-125/143a/134a 44/52/4)", 3943, 4728],
  ["SF6", "Sulphur hexafluoride (SF6) — GIS / breakers", 23500, 24300, "Use mass balance: kg topped up = kg leaked. Record the GIS bay or breaker as equipment."],
];
for (const [code, name, ar5, ar6, help] of fugitive) {
  MATERIALS.push({ code, name, scope: 1, categories: ["fugitive"], base_unit: "kg", units: ["kg"], gwp: { AR5: ar5, AR6: ar6 },
    help: help ?? "Record the kg recharged into each AC/chiller unit (mass balance)." });
  FACTORS.push({ material_id: code, region: "GLOBAL", unit: "kg", gases: { ...ZERO, other: "1" },
    source: "Mass balance: 1 kg recharged = 1 kg emitted; CO2e via the gas's GWP", publisher: "GHG Protocol",
    citation: "GHG Protocol HFC tool (mass-balance method); IPCC AR5/AR6 GWP-100",
    verify_note: "VERIFY: GWP set (AR5 vs AR6) with MEIL's consultant" });
}
MATERIALS.push({ code: "CO2-EXT", name: "CO2 (fire extinguisher refills)", scope: 1, categories: ["fugitive"], base_unit: "kg", units: ["kg"] });
FACTORS.push({ material_id: "CO2-EXT", region: "GLOBAL", unit: "kg", gases: { co2: "1", ch4: "0", n2o: "0" },
  source: "Mass balance: 1 kg CO2 discharged = 1 kg CO2", publisher: "GHG Protocol", citation: "GHG Protocol mass-balance method",
  verify_note: "VERIFY: count only discharges/refills, not new cylinders" });

// --- Scope 2 -----------------------------------------------------------------------------------
const kwh = ["kWh", "MWh"];
MATERIALS.push({ code: "GRID-IN", name: "Grid electricity (India)", scope: 2, categories: ["purchased_electricity"], base_unit: "kWh", units: kwh, ncv_gj_per_unit: "0.0036",
  help: "Use the units on the DISCOM bill. Location-based Scope 2." });
FACTORS.push({ material_id: "GRID-IN", region: "IN", unit: "kWh", gases: { co2: "0.727", ch4: "0", n2o: "0" },
  source: "CEA CO2 Baseline Database for the Indian Power Sector — weighted average emission rate", publisher: "Central Electricity Authority",
  citation: "CEA CO2 Baseline Database, user guide, weighted average (t CO2/MWh) of the latest published year",
  verify_note: "VERIFY: replace with the latest CEA CO2 Baseline Database version and its reporting year" });
for (const [code, name] of [["SOLAR-PPA", "Solar PPA / open access (renewable)"], ["GREEN-TARIFF", "Green tariff electricity (renewable)"], ["HYDRO", "Hydro power (contracted)"]]) {
  MATERIALS.push({ code, name, scope: 2, categories: ["purchased_electricity"], base_unit: "kWh", units: kwh, ncv_gj_per_unit: "0.0036", is_renewable: true,
    help: "Zero only under market-based reporting with valid certificates (RECs, I-RECs, green tariff). Location-based totals still use the grid factor." });
  FACTORS.push({ material_id: code, region: "IN", unit: "kWh", gases: ZERO,
    source: "Market-based: contractual instrument with zero emission rate", publisher: "GHG Protocol Scope 2 Guidance",
    citation: "GHG Protocol Scope 2 Guidance (2015), market-based method", verify_note: "VERIFY: certificates retired for the period" });
}
MATERIALS.push({ code: "STEAM", name: "Purchased steam / heat", scope: 2, categories: ["purchased_steam"], base_unit: "GJ", units: ["GJ", "MJ"], ncv_gj_per_unit: "1" });
FACTORS.push({ material_id: "STEAM", region: "GLOBAL", unit: "GJ", gases: { co2: "66.0", ch4: "0", n2o: "0" },
  source: "Natural gas boiler at 85% efficiency: 56.1 kg CO2/GJ fuel / 0.85", publisher: "Calculated (IPCC NG default)",
  citation: "IPCC 2006 GL Vol 2 T1.4 natural gas 56,100 kg CO2/TJ; assumed boiler efficiency 85%",
  verify_note: "VERIFY: supplier-specific factor (fuel mix and efficiency of the steam plant)" });
MATERIALS.push({ code: "CHILLED-WATER", name: "Chilled water (district cooling)", scope: 2, categories: ["purchased_cooling"], base_unit: "kWh", units: ["kWh", "MWh"], ncv_gj_per_unit: "0.0036",
  help: "kWh of cooling delivered (1 TR-h = 3.517 kWh)." });
FACTORS.push({ material_id: "CHILLED-WATER", region: "IN", unit: "kWh", gases: { co2: "0.18175", ch4: "0", n2o: "0" },
  source: "Grid factor / chiller COP 4.0", publisher: "Calculated", citation: "0.727 kg CO2/kWh grid / COP 4.0",
  verify_note: "VERIFY: supplier-reported factor or plant COP" });

// --- Scope 3 -----------------------------------------------------------------------------------
type S3 = [code: string, name: string, cats: Cat[], unit: string, units: string[], co2e: string, source: string, publisher: string, verify: string];
const S3_ITEMS: S3[] = [
  ["STEEL-TMT", "Steel — TMT rebar", ["cat1_purchased_goods"], "t", ["t", "kg"], "2500", "Indian BF-BOF crude steel average (cradle-to-gate)", "worldsteel / JPC", "VERIFY: supplier EPD (JSW/Tata/SAIL) or JPC sector intensity"],
  ["STEEL-STRUCT", "Steel — structural sections & plates", ["cat1_purchased_goods"], "t", ["t", "kg"], "2500", "Indian BF-BOF crude steel average (cradle-to-gate)", "worldsteel / JPC", "VERIFY: supplier EPD"],
  ["FASTENERS", "Fasteners (galvanised steel)", ["cat1_purchased_goods"], "t", ["t", "kg"], "2800", "Steel plus galvanising (cradle-to-gate)", "ICE database (University of Bath)", "VERIFY: supplier EPD"],
  ["CEMENT-OPC", "Cement — OPC 53", ["cat1_purchased_goods"], "t", ["t", "kg"], "820", "Indian OPC cradle-to-gate", "Cement Manufacturers' Association", "VERIFY: supplier EPD / CMA sector average"],
  ["CEMENT-PPC", "Cement — PPC", ["cat1_purchased_goods"], "t", ["t", "kg"], "600", "Indian PPC cradle-to-gate", "Cement Manufacturers' Association", "VERIFY: supplier EPD / CMA sector average"],
  ["AGGREGATE", "Aggregates (crushed stone, sand)", ["cat1_purchased_goods"], "t", ["t", "kg"], "5.2", "Crushed aggregate cradle-to-gate", "ICE database (University of Bath)", "VERIFY: India-specific LCA value"],
  ["BITUMEN", "Bitumen (VG-30)", ["cat1_purchased_goods"], "t", ["t", "kg"], "190", "Bitumen cradle-to-gate", "ICE database (University of Bath)", "VERIFY: IOCL/HPCL product LCA"],
  ["COPPER-CABLE", "Copper cables", ["cat1_purchased_goods"], "t", ["t", "kg"], "3800", "Primary copper conductor cradle-to-gate", "ICE database (University of Bath)", "VERIFY: cable supplier EPD"],
  ["ALUMINIUM", "Aluminium (primary)", ["cat1_purchased_goods"], "t", ["t", "kg"], "18000", "Indian coal-powered primary aluminium", "International Aluminium Institute", "VERIFY: supplier (Hindalco/NALCO/Vedanta) disclosure"],
  ["ROAD-FREIGHT", "Road freight — heavy truck", ["cat4_upstream_transport", "cat9_downstream_transport"], "t-km", ["t-km"], "0.074", "HDV diesel per t-km at typical Indian load", "India GHG Program (road transport factors)", "VERIFY: India GHG Program road transport emission factors by vehicle class"],
  ["RAIL-FREIGHT", "Rail freight (Indian Railways)", ["cat4_upstream_transport", "cat9_downstream_transport"], "t-km", ["t-km"], "0.0099", "Indian Railways freight average", "Indian Railways / India GHG Program", "VERIFY: Indian Railways sustainability report"],
  ["SEA-FREIGHT", "Sea freight — container ship", ["cat4_upstream_transport", "cat9_downstream_transport"], "t-km", ["t-km"], "0.016", "Average container ship", "UK DESNZ conversion factors", "VERIFY: GLEC framework / carrier-specific data"],
  ["FLIGHT-DOM-ECO", "Flight — domestic, economy", ["cat6_business_travel", "cat7_commuting"], "p-km", ["p-km"], "0.14", "Domestic flight per passenger-km, without radiative forcing", "ICAO Carbon Emissions Calculator", "VERIFY: ICAO calculator for Indian domestic routes"],
  ["FLIGHT-INT-ECO", "Flight — international, economy", ["cat6_business_travel"], "p-km", ["p-km"], "0.11", "International flight per passenger-km, without radiative forcing", "ICAO Carbon Emissions Calculator", "VERIFY: ICAO calculator per route"],
  ["FLIGHT-INT-BUS", "Flight — international, business", ["cat6_business_travel"], "p-km", ["p-km"], "0.32", "Business class seat-area weighting", "UK DESNZ conversion factors", "VERIFY: ICAO class multiplier"],
  ["TRAIN", "Train (Indian Railways, passenger)", ["cat6_business_travel", "cat7_commuting"], "p-km", ["p-km"], "0.0078", "Indian Railways passenger average", "India GHG Program", "VERIFY: India GHG Program passenger rail factor"],
  ["BUS", "Bus (intercity / staff bus)", ["cat6_business_travel", "cat7_commuting"], "p-km", ["p-km"], "0.015", "Diesel bus per passenger-km", "India GHG Program", "VERIFY: India GHG Program bus factor"],
  ["METRO", "Metro rail", ["cat7_commuting"], "p-km", ["p-km"], "0.014", "Metro per passenger-km (grid electricity)", "DMRC / CEA grid", "VERIFY: metro operator disclosure"],
  ["TAXI", "Taxi / car (petrol), per vehicle-km", ["cat6_business_travel", "cat7_commuting"], "km", ["km"], "0.14", "Petrol car per vehicle-km", "India GHG Program", "VERIFY: India GHG Program passenger car factors"],
  ["TWO-WHEELER", "Two-wheeler (petrol), per km", ["cat7_commuting"], "km", ["km"], "0.035", "Petrol two-wheeler per km", "India GHG Program", "VERIFY: India GHG Program two-wheeler factor"],
  ["HOTEL", "Hotel stay (India), per room-night", ["cat6_business_travel"], "nights", ["nights"], "40", "Average hotel room-night, India", "Cornell Hotel Sustainability Benchmarking", "VERIFY: CHSB India value or hotel-specific data"],
  ["WASTE-LANDFILL", "Waste to landfill (mixed C&I)", ["cat5_waste"], "t", ["t", "kg"], "467", "Mixed commercial & industrial waste to landfill", "UK DESNZ conversion factors", "VERIFY: CPCB / India-specific landfill methane factor"],
  ["WASTE-INCINERATION", "Waste incineration", ["cat5_waste"], "t", ["t", "kg"], "21.3", "Transport to and processing at incinerator", "UK DESNZ conversion factors", "VERIFY: India-specific value"],
  ["WASTE-RECYCLE", "Waste sent for recycling", ["cat5_waste"], "t", ["t", "kg"], "21.3", "Transport to and processing at recycler (cut-off approach)", "UK DESNZ conversion factors", "VERIFY: India-specific value"],
  ["WASTE-COMPOST", "Organic waste composted", ["cat5_waste"], "t", ["t", "kg"], "8.9", "Composting of organic waste", "UK DESNZ conversion factors", "VERIFY: India-specific value"],
];
for (const [code, name, categories, unit, units, co2e, source, publisher, verify] of S3_ITEMS) {
  MATERIALS.push({ code, name, scope: 3, categories, base_unit: unit, units });
  FACTORS.push({ material_id: code, region: /India/.test(`${source} ${publisher} ${name}`) ? "IN" : "GLOBAL", unit, gases: ZERO, co2e,
    source, publisher, citation: `${publisher} — ${source}`, verify_note: verify });
}
