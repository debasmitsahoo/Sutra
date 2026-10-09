// Demo seed: MEIL Group (demo) hierarchy, one user per role, FY 2025-26 and 2026-27,
// plus the material / unit / draft emission factor library (scripts/data/library.ts).
// Idempotent: ids are deterministic, users are get-or-create, and library docs are only created when
// missing, so re-seeding never resets an approved factor or a version added in the app.
// Run: npm run seed
import { adminAuth, db } from "../src/lib/firebase/admin";
import { EmissionFactor, FinancialYear, Material, OrgNode, Period, Profile, UnitConversion, UserRole, type Role } from "../src/lib/db/schema";
import { CONVERSIONS, FACTORS, MATERIALS, SEED_VALID_FROM } from "./data/library";
import { DEMO_PASSWORD } from "./demo";

type Rbi = "rural" | "semi_urban" | "urban" | "metropolitan";
const GROUP = "MEIL-GRP";
const COMPANIES = [
  { code: "MEIL-LTD", name: "MEIL Ltd (demo)", country: "IN", state: "TG", is_listed: false, is_overseas: false },
  { code: "MEIL-PWR", name: "MEIL Power Ltd (demo, listed)", country: "IN", state: "TG", is_listed: true, is_overseas: false },
  { code: "MEIL-INTL", name: "MEIL International FZE (demo)", country: "AE", is_listed: false, is_overseas: true },
];
const BUS = [
  { code: "BU-IRR", name: "Irrigation", company: "MEIL-LTD" },
  { code: "BU-RDS", name: "Roads", company: "MEIL-LTD" },
  { code: "BU-MFG", name: "Manufacturing", company: "MEIL-LTD" },
  { code: "BU-PWR", name: "Power", company: "MEIL-PWR" },
  { code: "BU-HYD", name: "Hydrocarbon", company: "MEIL-INTL" },
];
const PROJECTS: [code: string, name: string, bu: string, country: string, state: string | undefined, rbi: Rbi | undefined][] = [
  ["P-IRR-01", "Godavari Lift Irrigation Pkg 1", "BU-IRR", "IN", "TG", "rural"],
  ["P-IRR-02", "Krishna Canal Lining", "BU-IRR", "IN", "AP", "rural"],
  ["P-IRR-03", "Narmada Micro Irrigation", "BU-IRR", "IN", "MP", "rural"],
  ["P-IRR-04", "Tungabhadra LIS", "BU-IRR", "IN", "KA", "semi_urban"],
  ["P-IRR-05", "Mahanadi Barrage", "BU-IRR", "IN", "OD", "semi_urban"],
  ["P-IRR-06", "Pranhita Pump House", "BU-IRR", "IN", "MH", "rural"],
  ["P-RDS-01", "Zojila Approach Road", "BU-RDS", "IN", "LA", "rural"],
  ["P-RDS-02", "Mumbai Coastal Link", "BU-RDS", "IN", "MH", "metropolitan"],
  ["P-RDS-03", "Chennai Peripheral Ring Road", "BU-RDS", "IN", "TN", "urban"],
  ["P-RDS-04", "Delhi–Vadodara Expressway Pkg 5", "BU-RDS", "IN", "RJ", "rural"],
  ["P-RDS-05", "Kolkata Elevated Corridor", "BU-RDS", "IN", "WB", "metropolitan"],
  ["P-MFG-01", "Hyderabad Fabrication Works", "BU-MFG", "IN", "TG", "urban"],
  ["P-MFG-02", "Pune Transformer Plant", "BU-MFG", "IN", "MH", "urban"],
  ["P-MFG-03", "Vadodara Valve Factory", "BU-MFG", "IN", "GJ", "urban"],
  ["P-PWR-01", "Krishnapatnam Thermal O&M", "BU-PWR", "IN", "AP", "semi_urban"],
  ["P-PWR-02", "Bhadradri 400 kV Substation", "BU-PWR", "IN", "TG", "semi_urban"],
  ["P-PWR-03", "Rajasthan Solar Park 300 MW", "BU-PWR", "IN", "RJ", "rural"],
  ["P-PWR-04", "Jharkhand Transmission Line", "BU-PWR", "IN", "JH", "rural"],
  ["P-PWR-05", "Uttarakhand Small Hydro", "BU-PWR", "IN", "UK", "rural"],
  ["P-PWR-06", "Bengaluru GIS Substation", "BU-PWR", "IN", "KA", "metropolitan"],
  ["P-HYD-01", "Kuwait Oil Gathering Centre", "BU-HYD", "KW", undefined, undefined],
  ["P-HYD-02", "Mongolia Refinery Utilities", "BU-HYD", "MN", undefined, undefined],
];
const USERS: { email: string; name: string; role: Role; node: string }[] = [
  { email: "project.user@demo.sutra.test", name: "Priya Project User", role: "project_user", node: "P-IRR-01" },
  { email: "project.user2@demo.sutra.test", name: "Arjun Project User", role: "project_user", node: "P-IRR-02" },
  { email: "reviewer@demo.sutra.test", name: "Ravi Reviewer", role: "project_reviewer", node: "P-IRR-01" },
  { email: "bu.approver@demo.sutra.test", name: "Meera BU Approver", role: "bu_approver", node: "BU-IRR" },
  { email: "company.admin@demo.sutra.test", name: "Kiran Company Admin", role: "company_admin", node: "MEIL-LTD" },
  { email: "group.admin@demo.sutra.test", name: "Anil Group Admin", role: "group_admin", node: GROUP },
  { email: "auditor@demo.sutra.test", name: "Sana Auditor", role: "auditor", node: GROUP },
];

async function main() {
  const nodes = new Map<string, ReturnType<typeof OrgNode.parse>>();
  const add = (n: Parameters<typeof OrgNode.parse>[0]) => nodes.set((n as { code: string }).code, OrgNode.parse(n));

  add({ type: "group", name: "MEIL Group (demo)", code: GROUP, parent_id: null, node_path: [GROUP], country: "IN", state: "TG", is_overseas: false, is_listed: false });
  for (const c of COMPANIES) add({ type: "company", parent_id: GROUP, node_path: [GROUP, c.code], ...c });
  for (const b of BUS) {
    const c = nodes.get(b.company)!;
    add({ type: "bu", name: b.name, code: b.code, parent_id: b.company, node_path: [...c.node_path, b.code], country: c.country, state: c.state, is_overseas: c.is_overseas, is_listed: c.is_listed });
  }
  for (const [code, name, bu, country, state, rbi] of PROJECTS) {
    const b = nodes.get(bu)!;
    add({ type: "project", name, code, parent_id: bu, node_path: [...b.node_path, code], country, state, is_overseas: country !== "IN", is_listed: b.is_listed, rbi_location_class: rbi });
  }

  const batch = db.batch();
  for (const [code, n] of nodes) batch.set(db.collection("org_nodes").doc(code), n);

  for (const [id, label, start, end] of [
    ["FY2025-26", "FY 2025-26", "2025-04-01", "2026-03-31"],
    ["FY2026-27", "FY 2026-27", "2026-04-01", "2027-03-31"],
  ]) {
    batch.set(db.collection("financial_years").doc(id), FinancialYear.parse({ label, start, end, status: "open" }));
    const y = Number(start.slice(0, 4));
    for (let i = 0; i < 12; i++) {
      const m = new Date(Date.UTC(y, 3 + i, 1)).toISOString().slice(0, 7);
      batch.set(db.collection("periods").doc(m), Period.parse({ fy_id: id, month: m, status: "open" }), { merge: true });
    }
  }
  await batch.commit();
  console.log(`org_nodes: ${nodes.size} (${PROJECTS.length} projects), financial_years: 2, periods: 24`);

  for (const u of USERS) {
    const existing = await adminAuth.getUserByEmail(u.email).catch(() => null);
    const rec = existing ?? (await adminAuth.createUser({ email: u.email, password: DEMO_PASSWORD, displayName: u.name, emailVerified: true }));
    await adminAuth.setCustomUserClaims(rec.uid, { role: u.role, node: u.node });
    await db.collection("profiles").doc(rec.uid).set(Profile.parse({ name: u.name, email: u.email }));
    await db.collection("user_roles").doc(`${rec.uid}_${u.role}`).set(
      UserRole.parse({ uid: rec.uid, role: u.role, node_id: u.node, node_path: nodes.get(u.node)!.node_path }),
    );
    console.log(`user ${existing ? "kept   " : "created"} ${u.email.padEnd(32)} ${u.role} @ ${u.node}`);
  }
}

async function createMissing(coll: string, docs: [id: string, data: Record<string, unknown>][]) {
  const refs = docs.map(([id]) => db.collection(coll).doc(id));
  const existing = new Set((await db.getAll(...refs)).filter((d) => d.exists).map((d) => d.id));
  const batch = db.batch();
  for (const [id, data] of docs) if (!existing.has(id)) batch.create(db.collection(coll).doc(id), data);
  await batch.commit();
  console.log(`${coll}: ${docs.length - existing.size} created, ${existing.size} kept`);
}

async function seedLibrary() {
  await createMissing("materials", MATERIALS.map((m) => [m.code, Material.parse(m)]));
  await createMissing("unit_conversions", CONVERSIONS.map((c) => [`${c.from_unit}-${c.to_unit}${c.material_id ? `-${c.material_id}` : ""}`, UnitConversion.parse(c)]));
  await createMissing("emission_factors", FACTORS.map((f) => [
    `${f.material_id}-${f.region}-v1`,
    EmissionFactor.parse({ ...f, gwp_set: "AR5", valid_from: SEED_VALID_FROM, valid_to: null, version: 1, status: "draft", created_by: "seed" }),
  ]));
}

main().then(seedLibrary).then(() => process.exit(0), (e) => (console.error(e), process.exit(1)));
