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

// stage* add a write + its audit entry to an open transaction, so callers can combine several
// writes atomically (e.g. close factor v1 and create v2). createDoc/updateDoc wrap them for one-offs.
export function stageCreate(tx: Transaction, actor: Actor, coll: Collection, data: unknown, id?: string, action = "create") {
  const parsed = COLLECTIONS[coll].parse(data) as Record<string, unknown>;
  const nodePath = (parsed.node_path as string[] | undefined) ?? [actor.node];
  if (parsed.node_path && !inScope(actor, parsed.node_path)) throw new ForbiddenError("Outside your organisation scope");
  const ref = id ? db.collection(coll).doc(id) : db.collection(coll).doc();
  tx.create(ref, { ...parsed, created_at: FieldValue.serverTimestamp() });
  audit(tx, actor, action, coll, ref.id, nodePath, null, parsed);
  return ref.id;
}

/** `current` must have been read with tx.get in the same transaction. */
export function stageUpdate(
  tx: Transaction, actor: Actor, coll: Collection, id: string, current: Record<string, unknown>, patch: Record<string, unknown>, action = "update",
) {
  const { created_at, updated_at: _, ...before } = current; // eslint-disable-line @typescript-eslint/no-unused-vars
  if (before.node_path && !inScope(actor, before.node_path)) throw new ForbiddenError("Outside your organisation scope");
  const after = COLLECTIONS[coll].parse({ ...before, ...patch }) as Record<string, unknown>;
  if (JSON.stringify(after.node_path) !== JSON.stringify(before.node_path)) throw new ForbiddenError("node_path is immutable");
  tx.set(db.collection(coll).doc(id), { ...after, created_at, updated_at: FieldValue.serverTimestamp() });
  const changed = Object.keys(after).filter((k) => JSON.stringify(after[k]) !== JSON.stringify(before[k]));
  audit(
    tx, actor, action, coll, id, (before.node_path as string[]) ?? [actor.node],
    Object.fromEntries(changed.map((k) => [k, before[k] ?? null])),
    Object.fromEntries(changed.map((k) => [k, after[k] ?? null])),
  );
}

export async function createDoc(actor: Actor, coll: Collection, data: unknown, id?: string) {
  return db.runTransaction(async (tx) => stageCreate(tx, actor, coll, data, id));
}

export async function updateDoc(actor: Actor, coll: Collection, id: string, patch: Record<string, unknown>) {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(db.collection(coll).doc(id));
    if (!snap.exists) throw new Error(`${coll}/${id} not found`);
    stageUpdate(tx, actor, coll, id, snap.data()!, patch);
  });
}

export async function softDelete(actor: Actor, coll: Collection, id: string, reason: string) {
  if (reason.trim().length < 3) throw new Error("A reason is required to delete");
  await updateDoc(actor, coll, id, { deleted_at: new Date().toISOString(), deleted_reason: reason.trim() });
}
