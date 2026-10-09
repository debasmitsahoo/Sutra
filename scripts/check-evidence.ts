// Prompt 4 "Done when" against real Firestore + the local file store, through the same service the app uses:
// two users upload "file1.pdf" without collision; the same bill twice is flagged; vendor + bill number
// duplicates are flagged; audit_log shows upload, link, replace, unlink and delete. Cleans up afterwards.
// Run: npm run check:evidence
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/lib/firebase/admin";
import type { Actor } from "../src/lib/db/write";
import { sha256 } from "../src/lib/evidence/files";
import { deleteEvidence, linkEvidence, replaceEvidence, unlinkEvidence, updateEvidenceMeta, uploadEvidence } from "../src/lib/evidence/service";
import { getObject } from "../src/lib/evidence/storage";

const P1 = ["MEIL-GRP", "MEIL-LTD", "BU-IRR", "P-IRR-01"];
const user1: Actor = { uid: "check-user-1", email: "project.user@demo.sutra.test", role: "project_user", node: "P-IRR-01" };
const user2: Actor = { uid: "check-user-2", email: "project.user2@demo.sutra.test", role: "project_user", node: "P-IRR-02" };
const pdf = (s: string) => new TextEncoder().encode(`%PDF-1.4\n% ${s}\n%%EOF\n`);
const ACT = "zz-check-activity";
const created: string[] = [];

async function cleanup() {
  const ev = await db.collection("evidence_files").where("uploaded_by", "in", [user1.uid, user2.uid]).get();
  const ids = [...new Set([...created, ...ev.docs.map((d) => d.id)])];
  const keys = ev.docs.map((d) => d.data().storage_key as string);
  const links = await db.collection("evidence_links").where("target_id", "==", ACT).get();
  const audit = await db.collection("audit_log").where("actor_uid", "in", [user1.uid, user2.uid]).get();
  const batch = db.batch();
  [...ev.docs, ...links.docs, ...audit.docs].forEach((d) => batch.delete(d.ref));
  batch.delete(db.collection("activity_records").doc(ACT));
  await batch.commit();
  await Promise.all(keys.map((k) => rm(path.resolve("storage", k), { force: true })));
  return ids.length;
}

async function main() {
  await cleanup();
  // 1. Two users, same file name, different projects.
  const [a] = await uploadEvidence(user1, "P-IRR-01", [{ name: "file1.pdf", bytes: pdf("bill A") }]);
  const [b] = await uploadEvidence(user2, "P-IRR-02", [{ name: "file1.pdf", bytes: pdf("bill B") }]);
  assert.ok(a.id && b.id, a.error ?? b.error);
  const [da, dbb] = (await db.getAll(db.collection("evidence_files").doc(a.id!), db.collection("evidence_files").doc(b.id!))).map((d) => d.data()!);
  assert.notEqual(da.storage_key, dbb.storage_key);
  assert.equal(da.original_name, "file1.pdf");
  assert.equal(sha256(await getObject(da.storage_key)), sha256(pdf("bill A")), "user 1's file intact");
  assert.equal(sha256(await getObject(dbb.storage_key)), sha256(pdf("bill B")), "user 2's file intact");
  console.log(`✓ two users uploaded file1.pdf → ${da.storage_key} and ${dbb.storage_key}; both intact`);

  // 2. Same bill twice.
  const [again] = await uploadEvidence(user1, "P-IRR-01", [{ name: "scan-copy.pdf", bytes: pdf("bill A") }]);
  assert.deepEqual(again.duplicates?.map((d) => [d.id, d.reason]), [[a.id, "same_file"]]);
  console.log(`✓ same bill uploaded again is flagged: duplicate of ${again.duplicates![0].name} (same file)`);

  // 3. Same vendor + bill number, different file.
  const [photo] = await uploadEvidence(user1, "P-IRR-01", [{ name: "photo.jpg", bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]) }]);
  await updateEvidenceMeta(user1, a.id!, { doc_type: "fuel_bill", vendor: "ABC Fuels Pvt. Ltd", doc_number: "INV-0071", doc_date: "2026-05-14", amount_inr: "389550" });
  const flagged = await updateEvidenceMeta(user1, photo.id!, { doc_type: "fuel_bill", vendor: "abc fuels pvt ltd", doc_number: "inv 0071" });
  assert.deepEqual(flagged.map((d) => d.id), [a.id]);
  console.log("✓ same vendor + bill number (different file) is flagged");

  // 4. Link, scope rules, replace, unlink, delete.
  await db.collection("activity_records").doc(ACT).set({ project_id: "P-IRR-01", node_path: P1, status: "draft", deleted_at: null });
  const linkId = await linkEvidence(user1, a.id!, "activity", ACT);
  await assert.rejects(linkEvidence(user2, b.id!, "activity", ACT), /scope/);
  await assert.rejects(linkEvidence(user1, a.id!, "activity", ACT), /Already linked/);
  await assert.rejects(deleteEvidence(user2, a.id!, "not my file"), /scope/);
  const v2 = await replaceEvidence(user1, a.id!, { name: "file1-corrected.pdf", bytes: pdf("bill A corrected") });
  const [old, cur, link] = (await db.getAll(
    db.collection("evidence_files").doc(a.id!), db.collection("evidence_files").doc(v2), db.collection("evidence_links").doc(linkId),
  )).map((d) => d.data()!);
  assert.equal(old.replaced_by, v2);
  assert.equal(cur.version, 2);
  assert.equal(cur.vendor, "ABC Fuels Pvt. Ltd", "metadata carried to the new version");
  assert.equal(link.evidence_id, v2, "link moved to the new version");
  assert.equal(sha256(await getObject(old.storage_key)), sha256(pdf("bill A")), "v1 file kept");
  console.log("✓ link → replace: v2 created, v1 kept, link moved to v2; other project and other user blocked");
  await unlinkEvidence(user1, linkId);
  await deleteEvidence(user1, again.id!, "Duplicate scan of the same bill");

  // 5. Audit trail.
  const audit = await db.collection("audit_log").where("actor_uid", "in", [user1.uid, user2.uid]).get();
  const actions = new Set(audit.docs.map((d) => d.data().action));
  for (const a of ["upload", "update", "link", "replace", "relink", "unlink", "delete"]) assert.ok(actions.has(a), `audit has ${a}`);
  const del = audit.docs.map((d) => d.data()).find((x) => x.action === "delete")!;
  assert.equal(del.after.deleted_reason, "Duplicate scan of the same bill");
  console.log(`✓ audit_log: ${[...actions].sort().join(", ")} (${audit.size} entries); delete keeps its reason`);
}

main()
  .then(cleanup, async (e) => (await cleanup(), Promise.reject(e)))
  .then((n) => (console.log(`  cleaned up ${n} test files`), process.exit(0)), (e) => (console.error("✗", e.message ?? e), process.exit(1)));
