// The only way data is written. Each write is Zod-validated, scope-checked and paired with an
// audit_log entry in the same transaction. Nothing is hard-deleted (softDelete sets deleted_at).
// ponytail: append-only audit is enforced by this module + firestore.rules (no client writes);
// add a Cloud Function trigger if writes ever bypass the server.
import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import { COLLECTIONS, type Collection, type Role } from "./schema";

export type Actor = { uid: string; email: string; role: Role; node: string };

export class ForbiddenError extends Error {}

const inScope = (actor: Actor, nodePath: unknown) => Array.isArray(nodePath) && nodePath.includes(actor.node);

export function audit(
  tx: Transaction,
  actor: Actor | null,
  action: string,
  collection: string,
  docId: string,
  nodePath: string[],
  before: unknown = null,
  after: unknown = null,
) {
  tx.create(db.collection("audit_log").doc(), {
    action,
    collection,
    doc_id: docId,
    actor_uid: actor?.uid ?? "system",
    actor_email: actor?.email ?? "system",
    actor_role: actor?.role ?? "system",
    before,
    after,
    node_path: nodePath,
    at: FieldValue.serverTimestamp(),
  });
}

export async function createDoc(actor: Actor, coll: Collection, data: unknown, id?: string) {
  const parsed = COLLECTIONS[coll].parse(data) as Record<string, unknown>;
  const nodePath = (parsed.node_path as string[] | undefined) ?? [actor.node];
  if (parsed.node_path && !inScope(actor, parsed.node_path)) throw new ForbiddenError("Outside your organisation scope");
  const ref = id ? db.collection(coll).doc(id) : db.collection(coll).doc();
  await db.runTransaction(async (tx) => {
    tx.create(ref, { ...parsed, created_at: FieldValue.serverTimestamp() });
    audit(tx, actor, "create", coll, ref.id, nodePath, null, parsed);
  });
  return ref.id;
}

export async function updateDoc(actor: Actor, coll: Collection, id: string, patch: Record<string, unknown>) {
  const ref = db.collection(coll).doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error(`${coll}/${id} not found`);
    const { created_at, updated_at: _, ...before } = snap.data()!; // eslint-disable-line @typescript-eslint/no-unused-vars
    if (before.node_path && !inScope(actor, before.node_path)) throw new ForbiddenError("Outside your organisation scope");
    const after = COLLECTIONS[coll].parse({ ...before, ...patch }) as Record<string, unknown>;
    if (JSON.stringify(after.node_path) !== JSON.stringify(before.node_path)) throw new ForbiddenError("node_path is immutable");
    tx.set(ref, { ...after, created_at, updated_at: FieldValue.serverTimestamp() });
    const changed = Object.keys(after).filter((k) => JSON.stringify(after[k]) !== JSON.stringify(before[k]));
    audit(
      tx, actor, "update", coll, id, (before.node_path as string[]) ?? [actor.node],
      Object.fromEntries(changed.map((k) => [k, before[k] ?? null])),
      Object.fromEntries(changed.map((k) => [k, after[k] ?? null])),
    );
  });
}

export async function softDelete(actor: Actor, coll: Collection, id: string, reason: string) {
  if (reason.trim().length < 3) throw new Error("A reason is required to delete");
  await updateDoc(actor, coll, id, { deleted_at: new Date().toISOString(), deleted_reason: reason.trim() });
}
