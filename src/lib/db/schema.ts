// Firestore has no DDL: these Zod schemas are the "migrations". Every server write parses through them.
// Access model: every scoped doc carries node_path = [group, company, bu, project] ids down to its owner node;
// a user may read a doc when their assigned node is in node_path (firestore.rules + scopedQuery).
import { z } from "zod";

export const ROLES = ["project_user", "project_reviewer", "bu_approver", "company_admin", "group_admin", "auditor"] as const;
export const Role = z.enum(ROLES);
export type Role = z.infer<typeof Role>;

export const ROLE_LABEL: Record<Role, string> = {
  project_user: "Project user",
  project_reviewer: "Project reviewer",
  bu_approver: "BU approver",
  company_admin: "Company admin",
  group_admin: "Group admin",
  auditor: "Auditor",
};

export const STATUSES = ["draft", "submitted", "reviewed", "approved", "locked", "returned"] as const;

const id = z.string().min(1);
const isoDate = z.iso.date();
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM");
// Decimals are stored as strings and computed with decimal.js, never JS floats.
const dec = z.string().regex(/^-?\d+(\.\d+)?$/, "Must be a number");
const scoped = { node_path: z.array(id).min(1) };
const soft = { deleted_at: z.string().nullable().default(null), deleted_reason: z.string().optional() };

export const OrgNode = z.object({
  type: z.enum(["group", "company", "bu", "project"]),
  name: z.string().trim().min(2).max(120),
  code: z.string().regex(/^[A-Z0-9-]+$/),
  parent_id: id.nullable(),
  ...scoped, // includes the node itself
  country: z.string().length(2),
  state: z.string().max(3).optional(), // ISO 3166-2:IN subdivision, e.g. TG
  is_overseas: z.boolean(),
  is_listed: z.boolean(),
  rbi_location_class: z.enum(["rural", "semi_urban", "urban", "metropolitan"]).optional(),
  active: z.boolean().default(true),
});

export const Profile = z.object({ name: z.string().min(1), email: z.email(), phone: z.string().optional() });

export const UserRole = z.object({ uid: id, role: Role, node_id: id, ...scoped });

export const FinancialYear = z.object({
  label: z.string(),
  start: isoDate,
  end: isoDate,
  status: z.enum(["open", "closed"]),
});

export const Period = z.object({
  fy_id: id,
  month,
  project_id: id.optional(), // absent = group calendar; per-project close arrives in Prompt 7
  status: z.enum(["open", "locked"]),
  locked_by: id.optional(),
  unlock_reason: z.string().optional(),
});

export const GwpSet = z.enum(["AR4", "AR5", "AR6"]);

export const GHG_CATEGORIES = {
  stationary_combustion: "Stationary combustion",
  mobile_combustion: "Mobile combustion",
  process: "Process emissions",
  fugitive: "Fugitive emissions",
  purchased_electricity: "Purchased electricity",
  purchased_steam: "Purchased steam / heat",
  purchased_cooling: "Purchased cooling",
  cat1_purchased_goods: "Cat 1 · Purchased goods",
  cat4_upstream_transport: "Cat 4 · Upstream transport",
  cat5_waste: "Cat 5 · Waste",
  cat6_business_travel: "Cat 6 · Business travel",
  cat7_commuting: "Cat 7 · Employee commuting",
  cat9_downstream_transport: "Cat 9 · Downstream transport",
} as const;

export const Material = z.object({
  code: z.string().regex(/^[A-Z0-9-]+$/, "Use capitals, digits and dashes"),
  name: z.string().trim().min(2),
  scope: z.literal([1, 2, 3]),
  categories: z.array(z.enum(Object.keys(GHG_CATEGORIES) as [keyof typeof GHG_CATEGORIES])).min(1),
  base_unit: z.string(), // factors are expressed per base unit
  units: z.array(z.string()).min(1), // units users may enter in
  ncv_gj_per_unit: dec.optional(), // energy content per base unit, for the BRSR energy table
  is_renewable: z.boolean().default(false),
  gwp: z.partialRecord(GwpSet, z.number().positive()).optional(), // fugitive gases (HFCs, SF6)
  help: z.string().optional(),
  active: z.boolean().default(true),
});

export const UnitConversion = z.object({
  from_unit: z.string(),
  to_unit: z.string(),
  factor: dec,
  material_id: id.optional(), // density-style conversions (L -> kg) are material specific
  note: z.string().optional(),
});

export const EmissionFactor = z.object({
  material_id: id,
  region: z.string().regex(/^([A-Z]{2}|GLOBAL)$/, "ISO country code or GLOBAL"),
  unit: z.string(),
  gases: z.object({ co2: dec, ch4: dec, n2o: dec, other: dec.optional() }), // kg per unit
  co2e: dec.optional(), // composite kg CO2e per unit when no gas-wise split is published
  gwp_set: GwpSet,
  valid_from: isoDate,
  valid_to: isoDate.nullable(),
  version: z.number().int().positive(),
  source: z.string().min(2),
  publisher: z.string().min(2),
  citation: z.string().min(2),
  verify_note: z.string().optional(), // "VERIFY: <suggested Indian source>" on unconfirmed seeds
  status: z.enum(["draft", "approved", "retired"]),
  approved_by: z.string().optional(),
  approved_at: z.string().optional(),
  created_by: z.string().optional(),
});

export const Equipment = z.object({
  code: z.string(),
  name: z.string(),
  type: z.string(),
  project_id: id,
  ...scoped,
  capacity: dec.optional(),
  capacity_unit: z.string().optional(),
  refrigerant_charge_kg: dec.optional(),
  active: z.boolean().default(true),
});

export const ActivityRecord = z.object({
  scope: z.literal([1, 2, 3]),
  category: z.string(),
  subcategory: z.string(),
  project_id: id,
  ...scoped,
  activity_date: isoDate,
  period_start: isoDate.optional(),
  period_end: isoDate.optional(),
  material_id: id.optional(),
  equipment_id: id.optional(),
  quantity: dec,
  unit: z.string(),
  quantity_base: dec.optional(),
  distance_km: dec.optional(),
  weight_t: dec.optional(),
  passengers: z.number().int().positive().optional(),
  travel_class: z.string().optional(),
  from_place: z.string().optional(),
  to_place: z.string().optional(),
  vendor: z.string().optional(),
  document_no: z.string().optional(),
  amount_inr: dec.optional(),
  co2_kg: dec.optional(),
  ch4_kg: dec.optional(),
  n2o_kg: dec.optional(),
  other_kg: dec.optional(),
  co2e_kg: dec.optional(),
  energy_gj: dec.optional(),
  factor_id: id.optional(),
  factor_version: z.number().int().optional(),
  calc_method: z.enum(["activity", "distance", "spend", "mass_balance"]),
  status: z.enum(STATUSES),
  notes: z.string().optional(),
  created_by: id,
  ...soft,
});

export const KpiMaster = z.object({
  code: z.string(),
  section: z.enum(["A", "B", "C"]),
  principle: z.number().int().min(1).max(9).optional(),
  indicator_type: z.enum(["essential", "leadership"]),
  is_core: z.boolean().default(false),
  question: z.string(),
  unit: z.string().optional(),
  value_type: z.enum(["number", "text", "boolean"]),
  dimensions: z.array(z.string()).default([]),
  aggregation: z.enum(["SUM", "RECOMPUTE", "ELIMINATE", "DEDUPE", "SNAPSHOT", "ALL", "ANY", "NARRATIVE"]),
  formula: z.string().optional(),
  format_versions: z.array(z.string()),
});

export const DataPoint = z.object({
  kpi_id: id,
  node_id: id,
  ...scoped,
  period: z.string(), // YYYY-MM or FY id
  dimensions: z.record(z.string(), z.string()).default({}),
  value: z.union([dec, z.string(), z.boolean()]),
  status: z.enum(STATUSES),
  created_by: id,
  ...soft,
});

export const EvidenceFile = z.object({
  storage_key: z.string(),
  original_name: z.string(),
  uploaded_by: id,
  uploaded_by_email: z.string(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  size: z.number().int().nonnegative(),
  mime: z.string(),
  doc_type: z.enum(["invoice", "fuel_bill", "electricity_bill", "log_book", "delivery_challan", "weighbridge_slip", "ticket", "hotel_invoice", "refill_report", "waste_manifest", "certificate", "other"]),
  doc_number: z.string().trim().max(60).optional(),
  doc_date: isoDate.optional(),
  vendor: z.string().trim().max(120).optional(),
  amount_inr: dec.optional(),
  doc_key: z.string().optional(), // normalised vendor|doc_number, for duplicate detection
  month: month, // doc_date month, else upload month (library filter)
  duplicate_of: z.array(z.object({ id, reason: z.enum(["same_file", "same_vendor_doc_no"]) })).default([]),
  link_count: z.number().int().nonnegative().default(0),
  version: z.number().int().positive(),
  replaces_id: id.optional(),
  replaced_by: id.optional(),
  project_id: id,
  ...scoped,
  ...soft,
});

export const EvidenceLink = z.object({
  evidence_id: id,
  target_type: z.enum(["activity", "data_point"]),
  target_id: id,
  ...scoped,
  created_by: id,
  ...soft,
});

export const WorkflowEvent = z.object({
  target_type: z.enum(["activity", "data_point"]),
  target_id: id,
  from_status: z.enum(STATUSES),
  to_status: z.enum(STATUSES),
  comment: z.string().optional(),
  actor: id,
  ...scoped,
});

export const AuditorQuery = z.object({
  target_type: z.string(),
  target_id: id,
  question: z.string().min(3),
  status: z.enum(["open", "answered", "closed"]),
  raised_by: id,
  responses: z.array(z.object({ by: id, text: z.string(), at: z.string() })).default([]),
  ...scoped,
});

export const Financials = z.object({
  node_id: id,
  fy_id: id,
  turnover_inr: dec,
  ppp_factor: dec.optional(),
  ...scoped,
});

export const IntraGroupTxn = z.object({
  fy_id: id,
  from_node_id: id,
  to_node_id: id,
  type: z.enum(["purchase", "sale", "loan", "investment"]),
  amount_inr: dec,
  ...scoped, // path of from_node
});

// audit_log is written only by lib/db/write.ts, never through this map.
export const COLLECTIONS = {
  org_nodes: OrgNode,
  profiles: Profile,
  user_roles: UserRole,
  financial_years: FinancialYear,
  periods: Period,
  materials: Material,
  unit_conversions: UnitConversion,
  emission_factors: EmissionFactor,
  equipment: Equipment,
  activity_records: ActivityRecord,
  kpi_master: KpiMaster,
  data_points: DataPoint,
  evidence_files: EvidenceFile,
  evidence_links: EvidenceLink,
  workflow_events: WorkflowEvent,
  auditor_queries: AuditorQuery,
  financials: Financials,
  intra_group_txns: IntraGroupTxn,
} as const;

export type Collection = keyof typeof COLLECTIONS;
