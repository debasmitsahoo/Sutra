// Prompt 3 "Done when" against real Firestore: add a dated v2 through the same code the app uses, check v1
// is kept (closed the day before), and that date lookup returns the right version. Uses a throwaway
// material and removes its docs afterwards so the real library is untouched.
// Run: npm run check:factors
import assert from "node:assert/strict";
import { db } from "../src/lib/firebase/admin";
import { addFactorVersionTx } from "../src/lib/db/factors";
import type { Actor } from "../src/lib/db/write";
import { pickFactor, type Factor } from "../src/lib/ghg/factors";

const M = "ZZ-CHECK";
const admin: Actor = { uid: "check-script", email: "group.admin@demo.sutra.test", role: "group_admin", node: "MEIL-GRP" };
const base = { material_id: M, region: "IN", gwp_set: "AR5", mode: "gases", ch4: "0", n2o: "0", source: "Check", publisher: "Check", citation: "check-factors.ts" };

async function cleanup() {
  const [factors, audit] = await Promise.all([
    db.collection("emission_factors").where("material_id", "==", M).get(),
    db.collection("audit_log").where("collection", "==", "emission_factors").get(),
  ]);
  const batch = db.batch();
  factors.docs.forEach((d) => batch.delete(d.ref));
  audit.docs.filter((d) => String(d.data().doc_id).startsWith(M)).forEach((d) => batch.delete(d.ref));
  batch.delete(db.collection("materials").doc(M));
  await batch.commit();
}

async function main() {
  await cleanup();
  await db.collection("materials").doc(M).set({ code: M, name: "Check material", scope: 2, categories: ["purchased_electricity"], base_unit: "kWh", units: ["kWh"], is_renewable: false, active: true });
  try {
    await addFactorVersionTx(admin, { ...base, valid_from: "2020-04-01", valid_to: "", co2: "0.80" });
    const plan = await addFactorVersionTx(admin, { ...base, valid_from: "2026-04-01", valid_to: "", co2: "0.70" });
    assert.deepEqual(plan, { version: 2, close: { id: `${M}-IN-v1`, valid_to: "2026-03-31" } });

    const snap = await db.collection("emission_factors").where("material_id", "==", M).get();
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Factor);
    assert.equal(all.length, 2, "old version is kept");
    const v1 = all.find((f) => f.version === 1)!;
    assert.equal(v1.valid_to, "2026-03-31");
    assert.equal(v1.gases.co2, "0.80", "old values unchanged");
    console.log("✓ v2 added from 2026-04-01; v1 kept, now ends 2026-03-31, values unchanged");

    const on = (date: string) => pickFactor(all, { materialId: M, date, region: "IN", includeDraft: true })?.version;
    assert.equal(on("2025-12-15"), 1);
    assert.equal(on("2026-03-31"), 1);
    assert.equal(on("2026-04-01"), 2);
    assert.equal(pickFactor(all, { materialId: M, date: "2026-05-01", region: "IN" }), null, "drafts not used until approved");
    console.log("✓ lookup: 2025-12-15 → v1, 2026-03-31 → v1, 2026-04-01 → v2; drafts ignored until approved");

    const audit = await db.collection("audit_log").where("collection", "==", "emission_factors").get();
    const mine = audit.docs.map((d) => d.data()).filter((a) => String(a.doc_id).startsWith(M));
    assert.deepEqual(mine.map((a) => a.action).sort(), ["create", "create", "update"]);
    console.log("✓ audit_log: 2 creates + 1 update (v1 valid_to) recorded");

    await assert.rejects(addFactorVersionTx(admin, { ...base, valid_from: "2025-01-01", valid_to: "", co2: "0.75" }), /must start later/);
    console.log("✓ back-dated version rejected");
  } finally {
    await cleanup();
  }
}

main().then(() => process.exit(0), (e) => (console.error("✗", e.message ?? e), process.exit(1)));
