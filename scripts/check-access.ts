// Prompt 2 "Done when" check, against the real Firebase project (seed + deployed rules required):
//  1. Firestore rules: a project user sees only their project; group admin sees all; clients cannot write.
//  2. Server write path: out-of-scope updates are refused; updates land in audit_log.
// Run: npm run check:access
import assert from "node:assert/strict";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, query, setDoc, where } from "firebase/firestore";
import { firebaseConfig } from "../src/lib/firebase/client";
import { db } from "../src/lib/firebase/admin";
import { ForbiddenError, updateDoc, type Actor } from "../src/lib/db/write";
import { DEMO_PASSWORD } from "./demo";

const app = initializeApp(firebaseConfig, "check");
const auth = getAuth(app);
const fs = getFirestore(app);

const denied = async (p: Promise<unknown>) => {
  try {
    await p;
    return false;
  } catch (e) {
    return (e as { code?: string }).code === "permission-denied";
  }
};

async function as(email: string) {
  const { user } = await signInWithEmailAndPassword(auth, email, DEMO_PASSWORD);
  const { claims } = await user.getIdTokenResult();
  return claims.node as string;
}

async function main() {
  // --- 1. rules (client SDK, as the signed-in user) ---
  let node = await as("project.user@demo.sutra.test");
  const mine = await getDocs(query(collection(fs, "org_nodes"), where("node_path", "array-contains", node)));
  assert.deepEqual(mine.docs.map((d) => d.id), ["P-IRR-01"], "project user should see only their project");
  assert.ok(await denied(getDoc(doc(fs, "org_nodes", "P-IRR-02"))), "project user must not read another project");
  assert.ok(await denied(getDocs(collection(fs, "org_nodes"))), "unscoped list must be denied");
  assert.ok(await denied(setDoc(doc(fs, "org_nodes", "P-IRR-01"), { name: "hacked" })), "client writes must be denied");
  assert.ok(await denied(addDoc(collection(fs, "audit_log"), { action: "forged" })), "audit_log must not accept client writes");
  console.log("✓ project user: sees 1 node (own project), other project + writes denied");
  await signOut(auth);

  node = await as("group.admin@demo.sutra.test");
  const all = await getDocs(query(collection(fs, "org_nodes"), where("node_path", "array-contains", node)));
  assert.equal(all.size, 31, "group admin should see group + 3 companies + 5 BUs + 22 projects");
  console.log(`✓ group admin: sees all ${all.size} nodes`);
  await signOut(auth);

  // --- 2. server write path (Admin SDK through lib/db/write.ts) ---
  const companyAdmin: Actor = { uid: "check-script", email: "company.admin@demo.sutra.test", role: "company_admin", node: "MEIL-LTD" };
  await assert.rejects(updateDoc(companyAdmin, "org_nodes", "P-PWR-01", { name: "Not mine" }), ForbiddenError);
  console.log("✓ company admin cannot update a node in another company");

  const ref = db.collection("org_nodes").doc("P-IRR-01");
  const original = (await ref.get()).data()!.name as string;
  await updateDoc(companyAdmin, "org_nodes", "P-IRR-01", { name: `${original} (check)` });
  await updateDoc(companyAdmin, "org_nodes", "P-IRR-01", { name: original });
  const log = await db.collection("audit_log").where("doc_id", "==", "P-IRR-01").get();
  const rename = log.docs.map((d) => d.data()).find((a) => a.after?.name === `${original} (check)`);
  assert.ok(rename && rename.before.name === original && rename.actor_email === companyAdmin.email, "audit entry with before/after");
  console.log(`✓ audit_log recorded the change (before → after, actor); ${log.size} entries for P-IRR-01`);
}

main().then(() => process.exit(0), (e) => (console.error("✗", e.message ?? e), process.exit(1)));
