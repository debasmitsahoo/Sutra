import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText, History, Link2, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { visibleNodes } from "@/lib/db/read";
import { DOC_TYPES, type DocType } from "@/lib/evidence/doc-types";
import { describeDuplicates, type DuplicateInfo } from "@/lib/evidence/service";
import { db } from "@/lib/firebase/admin";
import { fmtNum } from "@/lib/format";
import { DeleteForm, DuplicateNotice, MetaForm, ReplaceButton, UnlinkButton } from "../ui";

type Ev = Record<string, unknown> & {
  original_name: string; mime: string; size: number; sha256: string; doc_type: DocType; version: number; node_path: string[];
  project_id: string; uploaded_by: string; uploaded_by_email: string; link_count: number; duplicate_of: DuplicateInfo[];
  replaces_id?: string; replaced_by?: string; deleted_at: string | null; deleted_reason?: string; storage_key: string;
  created_at?: FirebaseFirestore.Timestamp;
};
const when = (t?: FirebaseFirestore.Timestamp) =>
  t?.toDate().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) ?? "";

const ACTION_LABEL: Record<string, string> = {
  upload: "Uploaded", update: "Details edited", link: "Linked", unlink: "Unlinked", replace: "Replaced", relink: "Link moved", delete: "Deleted",
};

export default async function EvidenceDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const snap = await db.collection("evidence_files").doc(id).get();
  const e = snap.data() as Ev | undefined;
  if (!e || !e.node_path.includes(user.node)) notFound();

  // Version chain: walk back via replaces_id and forward via replaced_by.
  const chain: (Ev & { id: string })[] = [{ ...e, id }];
  for (let cur = e; cur.replaces_id; ) {
    const prev = (await db.collection("evidence_files").doc(cur.replaces_id).get()).data() as Ev;
    chain.push({ ...prev, id: cur.replaces_id });
    cur = prev;
  }
  for (let cur = e; cur.replaced_by; ) {
    const next = (await db.collection("evidence_files").doc(cur.replaced_by).get()).data() as Ev;
    chain.unshift({ ...next, id: cur.replaced_by });
    cur = next;
  }
  const ids = chain.map((c) => c.id);
  const [linksSnap, auditSnap, nodes, duplicates, vendorSnap] = await Promise.all([
    db.collection("evidence_links").where("evidence_id", "==", id).get(),
    db.collection("audit_log").where("doc_id", "in", ids.slice(0, 30)).get(),
    visibleNodes(user),
    describeDuplicates(user, e.duplicate_of),
    db.collection("evidence_files").where("project_id", "==", e.project_id).select("vendor").get(),
  ]);
  const links = linksSnap.docs.filter((l) => !l.data().deleted_at);
  const audit = auditSnap.docs.map((d) => d.data()).sort((a, b) => (b.at?.toMillis() ?? 0) - (a.at?.toMillis() ?? 0));
  const vendors = [...new Set(vendorSnap.docs.map((d) => d.data().vendor).filter(Boolean))] as string[];
  const project = nodes.find((n) => n.id === e.project_id)?.name ?? e.project_id;
  const isCurrent = !e.replaced_by && !e.deleted_at;
  const canChange = isCurrent && user.role !== "auditor" && (e.uploaded_by === user.uid || ["project_reviewer", "bu_approver", "company_admin", "group_admin"].includes(user.role));
  const src = `/api/evidence/${id}/file`;

  return (
    <>
      <Link href="/evidence" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Evidence
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">{DOC_TYPES[e.doc_type]}</span>
            <span className="num rounded-md bg-slate-900 px-2 py-0.5 font-semibold text-white">v{e.version}</span>
            {e.deleted_at && <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">Deleted</span>}
            {e.replaced_by && <Link href={`/evidence/${e.replaced_by}`} className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 hover:underline">Older version — open current</Link>}
          </div>
          <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight">{e.original_name}</h1>
          <p className="mt-1 text-sm text-muted">{project} · uploaded by {e.uploaded_by_email} · {when(e.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`${src}?download`} className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium shadow-xs hover:bg-bg">
            <Download className="size-4" /> Download
          </a>
          {canChange && <ReplaceButton id={id} />}
          {canChange && <DeleteForm id={id} links={links.length} />}
        </div>
      </div>

      {e.deleted_at && (
        <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          Deleted {e.deleted_at.slice(0, 10)} — reason: <b>{e.deleted_reason}</b>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="overflow-hidden lg:col-span-3">
          {e.mime === "application/pdf" ? (
            <iframe src={src} title={e.original_name} className="h-[70vh] w-full bg-slate-50" />
          ) : e.mime.startsWith("image/") && e.mime !== "image/heic" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={e.original_name} className="max-h-[70vh] w-full bg-slate-50 object-contain" />
          ) : (
            <div className="flex h-72 flex-col items-center justify-center gap-3 bg-slate-50 text-sm text-muted">
              <FileText className="size-10" /> No preview for this file type.
              <a href={`${src}?download`} className="font-medium text-accent hover:underline">Download to view</a>
            </div>
          )}
          <div className="num flex flex-wrap gap-x-6 gap-y-1 border-t border-line px-5 py-3 text-[11px] text-muted">
            <span>{fmtNum(e.size / 1024, 1)} KB · {e.mime}</span>
            <span className="flex items-center gap-1" title="SHA-256 fingerprint of the file content">
              <ShieldCheck className="size-3 text-accent" /> sha256 {e.sha256.slice(0, 16)}…
            </span>
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {!e.deleted_at && <DuplicateNotice duplicates={duplicates} />}

          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Bill details</h2>
            <MetaForm
              id={id}
              readOnly={!canChange}
              vendors={vendors}
              meta={{ doc_type: e.doc_type, doc_number: e.doc_number as string, doc_date: e.doc_date as string, vendor: e.vendor as string, amount_inr: e.amount_inr as string }}
            />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><Link2 className="size-4 text-accent" /> Linked records</h2>
            {links.length === 0 ? (
              <p className="text-sm text-muted">Not linked yet. Attach it while recording an activity — records cannot be submitted without evidence.</p>
            ) : (
              <ul className="divide-y divide-line">
                {links.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 py-2 text-sm">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs">{l.data().target_type === "activity" ? "Activity" : "KPI data point"}</span>
                    <span className="num truncate text-xs text-muted">{l.data().target_id}</span>
                    {canChange && <span className="ml-auto"><UnlinkButton linkId={l.id} /></span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {chain.length > 1 && (
            <Card className="p-5">
              <h2 className="mb-3 font-semibold">Versions</h2>
              <ul className="space-y-2 text-sm">
                {chain.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <span className="num rounded-md bg-slate-100 px-1.5 text-xs">v{c.version}</span>
                    <Link href={`/evidence/${c.id}`} className={`truncate ${c.id === id ? "font-semibold" : "text-muted hover:text-ink"}`}>{c.original_name}</Link>
                    <span className="ml-auto whitespace-nowrap text-xs text-muted">{when(c.created_at)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><History className="size-4 text-accent" /> Activity</h2>
            <ol className="space-y-3 border-l border-line pl-4">
              {audit.map((a, i) => (
                <li key={i} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-surface bg-accent" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{ACTION_LABEL[a.action] ?? a.action}</span>
                    <span className="text-xs text-muted">{a.actor_email}</span>
                  </div>
                  <div className="text-xs text-muted">{when(a.at)}{a.after?.deleted_reason ? ` · ${a.after.deleted_reason}` : ""}</div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
