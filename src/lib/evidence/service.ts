// Evidence vault operations. Every change is one audited transaction (lib/db/write.ts) with its own
// audit action: upload, update, link, unlink, replace, relink, delete. Files themselves are write-once.
import { db } from "@/lib/firebase/admin";
import { ForbiddenError, stageCreate, stageUpdate, type Actor } from "@/lib/db/write";
import { checkFile, docKey, sha256, storageKey, type DocType } from "./files";
import { putObject } from "./storage";

type Doc = Record<string, unknown> & { node_path: string[] };
export type DuplicateInfo = { id: string; reason: "same_file" | "same_vendor_doc_no"; name?: string; project?: string; by?: string; at?: string; hidden?: boolean };
export type UploadResult = { name: string; id?: string; duplicates?: DuplicateInfo[]; error?: string };

const REVIEWERS = ["project_reviewer", "bu_approver", "company_admin", "group_admin"];
const ensureWriter = (a: Actor) => {
  if (a.role === "auditor") throw new ForbiddenError("Auditors have read-only access");
};
const ensureInScope = (a: Actor, d: Doc) => {
  if (!d.node_path.includes(a.node)) throw new ForbiddenError("Outside your organisation scope");
};
const ensureCanChange = (a: Actor, d: Doc) => {
  ensureInScope(a, d);
  if (d.uploaded_by !== a.uid && !REVIEWERS.includes(a.role)) throw new ForbiddenError("Only the uploader or a reviewer can change this file");
};
const active = (d: Doc) => !d.deleted_at && !d.replaced_by;
const ym = (d: Date) => d.toISOString().slice(0, 7);

async function projectFor(actor: Actor, projectId: string) {
  const n = (await db.collection("org_nodes").doc(projectId).get()).data();
  if (!n || n.type !== "project") throw new Error("Pick a project for these files");
  ensureInScope(actor, n as Doc);
  return { id: projectId, node_path: n.node_path as string[] };
}

async function findDuplicates(field: "sha256" | "doc_key", value: string, reason: DuplicateInfo["reason"], exclude: string[] = []) {
  const snap = await db.collection("evidence_files").where(field, "==", value).get();
  return snap.docs.filter((d) => !exclude.includes(d.id) && active(d.data() as Doc)).map((d) => ({ id: d.id, reason }));
}

/** Details of each duplicate the actor may see; others are reported without details. */
export async function describeDuplicates(actor: Actor, dups: { id: string; reason: DuplicateInfo["reason"] }[]): Promise<DuplicateInfo[]> {
  if (!dups.length) return [];
  const docs = (await db.getAll(...dups.map((d) => db.collection("evidence_files").doc(d.id)))).map((d) => d.data() as Doc | undefined);
  const projectIds = [...new Set(docs.map((x) => x?.project_id as string).filter(Boolean))];
  const names = new Map((await db.getAll(...projectIds.map((p) => db.collection("org_nodes").doc(p)))).map((n) => [n.id, n.data()?.name as string]));
  return dups.map((d, i) => {
    const x = docs[i];
    if (!x || !x.node_path.includes(actor.node)) return { ...d, hidden: true };
    const at = (x.created_at as FirebaseFirestore.Timestamp | undefined)?.toDate();
    return {
      ...d, name: x.original_name as string, project: names.get(x.project_id as string) ?? (x.project_id as string), by: x.uploaded_by_email as string,
      at: at?.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }),
    };
  });
}

export async function uploadEvidence(actor: Actor, projectId: string, files: { name: string; bytes: Uint8Array }[]): Promise<UploadResult[]> {
  ensureWriter(actor);
  const project = await projectFor(actor, projectId);
  const results: UploadResult[] = [];
  for (const f of files) {
    try {
      const { ext, mime } = checkFile(f.name, f.bytes);
      const hash = sha256(f.bytes);
      const now = new Date();
      const key = storageKey(project.node_path, ext, now);
      const dups = await findDuplicates("sha256", hash, "same_file");
      await putObject(key, f.bytes);
      const id = await db.runTransaction(async (tx) =>
        stageCreate(tx, actor, "evidence_files", {
          storage_key: key, original_name: f.name.slice(0, 200), uploaded_by: actor.uid, uploaded_by_email: actor.email,
          sha256: hash, size: f.bytes.length, mime, doc_type: "other", month: ym(now), duplicate_of: dups, link_count: 0,
          version: 1, project_id: project.id, node_path: project.node_path,
        }, undefined, "upload"),
      );
      results.push({ name: f.name, id, duplicates: await describeDuplicates(actor, dups) });
    } catch (e) {
      results.push({ name: f.name, error: e instanceof Error ? e.message : "Upload failed" });
    }
  }
  return results;
}

export type EvidenceMeta = { doc_type: DocType; doc_number?: string; doc_date?: string; vendor?: string; amount_inr?: string };

export async function updateEvidenceMeta(actor: Actor, id: string, meta: EvidenceMeta) {
  ensureWriter(actor);
  const key = docKey(meta.vendor, meta.doc_number);
  return db.runTransaction(async (tx) => {
    const ref = db.collection("evidence_files").doc(id);
    const snap = await tx.get(ref);
    const cur = snap.data() as Doc | undefined;
    if (!cur || !active(cur)) throw new Error("This file was deleted or replaced");
    ensureCanChange(actor, cur);
    const sameNo = key ? await tx.get(db.collection("evidence_files").where("doc_key", "==", key)) : null;
    const vendorDups = (sameNo?.docs ?? []).filter((d) => d.id !== id && active(d.data() as Doc)).map((d) => ({ id: d.id, reason: "same_vendor_doc_no" as const }));
    const fileDups = (cur.duplicate_of as DuplicateInfo[]).filter((d) => d.reason === "same_file");
    stageUpdate(tx, actor, "evidence_files", id, cur, {
      ...meta, doc_key: key, month: meta.doc_date ? meta.doc_date.slice(0, 7) : cur.month, duplicate_of: [...fileDups, ...vendorDups],
    });
    return vendorDups;
  });
}

const TARGET = { activity: "activity_records", data_point: "data_points" } as const;

export async function linkEvidence(actor: Actor, evidenceId: string, targetType: keyof typeof TARGET, targetId: string) {
  ensureWriter(actor);
  return db.runTransaction(async (tx) => {
    const evRef = db.collection("evidence_files").doc(evidenceId);
    const [ev, target, existing] = await Promise.all([
      tx.get(evRef),
      tx.get(db.collection(TARGET[targetType]).doc(targetId)),
      tx.get(db.collection("evidence_links").where("evidence_id", "==", evidenceId)),
    ]);
    const e = ev.data() as Doc | undefined;
    const t = target.data() as Doc | undefined;
    if (!e || !active(e)) throw new Error("Evidence file not found");
    if (!t || t.deleted_at) throw new Error("Record not found");
    ensureInScope(actor, e);
    ensureInScope(actor, t);
    if (!t.node_path.includes(e.project_id as string)) throw new Error("Evidence and record must belong to the same project");
    if (existing.docs.some((l) => !l.data().deleted_at && l.data().target_id === targetId)) throw new Error("Already linked to this record");
    const linkId = stageCreate(tx, actor, "evidence_links", {
      evidence_id: evidenceId, target_type: targetType, target_id: targetId, node_path: t.node_path, created_by: actor.uid,
    }, undefined, "link");
    stageUpdate(tx, actor, "evidence_files", evidenceId, e, { link_count: (e.link_count as number) + 1 }, "link");
    return linkId;
  });
}

export async function unlinkEvidence(actor: Actor, linkId: string) {
  ensureWriter(actor);
  await db.runTransaction(async (tx) => {
    const link = await tx.get(db.collection("evidence_links").doc(linkId));
    const l = link.data() as Doc | undefined;
    if (!l || l.deleted_at) throw new Error("Link not found");
    const ev = await tx.get(db.collection("evidence_files").doc(l.evidence_id as string));
    const e = ev.data() as Doc;
    ensureInScope(actor, l);
    stageUpdate(tx, actor, "evidence_links", linkId, l, { deleted_at: new Date().toISOString(), deleted_reason: "Unlinked" }, "unlink");
    stageUpdate(tx, actor, "evidence_files", ev.id, e, { link_count: Math.max(0, (e.link_count as number) - 1) }, "unlink");
  });
}

/** New version of a file: new object + new doc (version + 1); old doc points to it; links move across. */
export async function replaceEvidence(actor: Actor, id: string, file: { name: string; bytes: Uint8Array }) {
  ensureWriter(actor);
  const { ext, mime } = checkFile(file.name, file.bytes);
  const hash = sha256(file.bytes);
  const old = (await db.collection("evidence_files").doc(id).get()).data() as Doc | undefined;
  if (!old || !active(old)) throw new Error("This file was already deleted or replaced");
  ensureCanChange(actor, old);
  if (old.sha256 === hash) throw new Error("The new file is identical to the current version");
  const dups = await findDuplicates("sha256", hash, "same_file", [id]);
  const key = storageKey(old.node_path, ext);
  await putObject(key, file.bytes);
  return db.runTransaction(async (tx) => {
    const [snap, links] = await Promise.all([
      tx.get(db.collection("evidence_files").doc(id)),
      tx.get(db.collection("evidence_links").where("evidence_id", "==", id)),
    ]);
    const cur = snap.data() as Doc;
    if (!active(cur)) throw new Error("This file was already deleted or replaced");
    const live = links.docs.filter((l) => !l.data().deleted_at);
    const { created_at, updated_at, ...meta } = cur; // eslint-disable-line @typescript-eslint/no-unused-vars
    const newId = stageCreate(tx, actor, "evidence_files", {
      ...meta, storage_key: key, original_name: file.name.slice(0, 200), sha256: hash, size: file.bytes.length, mime,
      uploaded_by: actor.uid, uploaded_by_email: actor.email, version: (cur.version as number) + 1, replaces_id: id,
      duplicate_of: [...dups, ...(cur.duplicate_of as DuplicateInfo[]).filter((d) => d.reason === "same_vendor_doc_no")],
      link_count: live.length,
    }, undefined, "replace");
    stageUpdate(tx, actor, "evidence_files", id, cur, { replaced_by: newId, link_count: 0 }, "replace");
    for (const l of live) stageUpdate(tx, actor, "evidence_links", l.id, l.data(), { evidence_id: newId }, "relink");
    return newId;
  });
}

export async function deleteEvidence(actor: Actor, id: string, reason: string) {
  ensureWriter(actor);
  if (reason.trim().length < 5) throw new Error("Give a reason (at least 5 characters)");
  await db.runTransaction(async (tx) => {
    const [snap, links] = await Promise.all([
      tx.get(db.collection("evidence_files").doc(id)),
      tx.get(db.collection("evidence_links").where("evidence_id", "==", id)),
    ]);
    const cur = snap.data() as Doc | undefined;
    if (!cur || !active(cur)) throw new Error("This file was already deleted or replaced");
    ensureCanChange(actor, cur);
    const now = new Date().toISOString();
    for (const l of links.docs.filter((x) => !x.data().deleted_at))
      stageUpdate(tx, actor, "evidence_links", l.id, l.data(), { deleted_at: now, deleted_reason: `File deleted: ${reason.trim()}` }, "unlink");
    stageUpdate(tx, actor, "evidence_files", id, cur, { deleted_at: now, deleted_reason: reason.trim(), link_count: 0 }, "delete");
  });
}
