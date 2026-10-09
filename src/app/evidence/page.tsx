import Link from "next/link";
import { AlertTriangle, FileStack, Link2, Link2Off, Search, UploadCloud } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { getScope, requireUser } from "@/lib/auth";
import { DOC_TYPES, type DocType } from "@/lib/evidence/doc-types";
import { db } from "@/lib/firebase/admin";
import { fmtINR, fmtNum } from "@/lib/format";
import { FileIcon, UploadPanel } from "./ui";

type Ev = {
  id: string; original_name: string; doc_type: DocType; vendor?: string; doc_number?: string; doc_date?: string; amount_inr?: string;
  month: string; project_id: string; uploaded_by_email: string; size: number; mime: string; link_count: number; version: number;
  duplicate_of: unknown[]; deleted_at: string | null; replaced_by?: string; created_at?: FirebaseFirestore.Timestamp;
};

const PAGE = 50;

export default async function EvidencePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const q = await searchParams;
  const scope = await getScope(user);
  const projects = scope.nodes.filter((n) => n.type === "project");
  const projectName = new Map(projects.map((p) => [p.id, p.name]));

  // ponytail: loads all evidence under the selected node and filters in memory; move filters into
  // indexed Firestore queries + cursor pagination once a node holds tens of thousands of files.
  const snap = await db.collection("evidence_files").where("node_path", "array-contains", scope.node.id).get();
  const all = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Ev)
    .filter((e) => !e.replaced_by)
    .sort((a, b) => (b.created_at?.toMillis() ?? 0) - (a.created_at?.toMillis() ?? 0));
  const live = all.filter((e) => !e.deleted_at);
  const vendors = [...new Set(live.map((e) => e.vendor).filter(Boolean) as string[])].sort();
  const uploaders = [...new Set(live.map((e) => e.uploaded_by_email))].sort();

  const rows = (q.status === "deleted" ? all.filter((e) => e.deleted_at) : live).filter(
    (e) =>
      (!q.project || e.project_id === q.project) &&
      (!q.type || e.doc_type === q.type) &&
      (!q.vendor || (e.vendor ?? "").toLowerCase().includes(q.vendor.toLowerCase())) &&
      (!q.month || e.month === q.month) &&
      (!q.uploader || e.uploaded_by_email === q.uploader) &&
      (q.status !== "linked" || e.link_count > 0) &&
      (q.status !== "unlinked" || e.link_count === 0) &&
      (q.status !== "duplicates" || e.duplicate_of.length > 0),
  );
  const page = Math.max(0, Number(q.page ?? 0) || 0);
  const shown = rows.slice(page * PAGE, (page + 1) * PAGE);
  const href = (patch: Record<string, string | undefined>) =>
    "/evidence?" + new URLSearchParams(Object.entries({ ...q, ...patch }).filter(([, v]) => v) as [string, string][]).toString();

  const stats = [
    { label: "Files", value: live.length, icon: FileStack, tone: "bg-accent-soft text-accent", status: undefined },
    { label: "Linked to records", value: live.filter((e) => e.link_count > 0).length, icon: Link2, tone: "bg-emerald-50 text-emerald-600", status: "linked" },
    { label: "Not linked yet", value: live.filter((e) => e.link_count === 0).length, icon: Link2Off, tone: "bg-slate-100 text-slate-600", status: "unlinked" },
    { label: "Possible duplicates", value: live.filter((e) => e.duplicate_of.length > 0).length, icon: AlertTriangle, tone: "bg-orange-50 text-orange-600", status: "duplicates" },
  ];
  const canUpload = user.role !== "auditor" && projects.length > 0;
  // Preselect only when unambiguous; admins must choose so files never land in the wrong project.
  const defaultProject = scope.node.type === "project" ? scope.node.id : projects.length === 1 ? projects[0].id : "";

  return (
    <>
      <PageHeader
        title="Evidence"
        description={`Bills, invoices and log books for ${scope.node.name}. No bill, no number.`}
        actions={canUpload && !q.upload ? (
          <Link href={href({ upload: "1" })} className="inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700">
            <UploadCloud className="size-4" /> Upload evidence
          </Link>
        ) : undefined}
      />
      {canUpload && q.upload && (
        <UploadPanel projects={projects.map((p) => ({ id: p.id, name: p.name }))} defaultProject={defaultProject} vendors={vendors} closeHref={href({ upload: undefined })} />
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone, status }) => (
          <Link key={label} href={href({ status, page: undefined })}
            className={`flex items-center gap-3 rounded-2xl border bg-surface p-4 shadow-xs transition hover:border-accent/40 ${q.status === status ? "border-accent ring-2 ring-accent/15" : "border-line"}`}>
            <span className={`grid size-10 place-items-center rounded-xl ${tone}`}><Icon className="size-5" /></span>
            <div><div className="num text-xl font-semibold">{fmtNum(value)}</div><div className="text-xs text-muted">{label}</div></div>
          </Link>
        ))}
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-2">
        {q.status && <input type="hidden" name="status" value={q.status} />}
        {q.upload && <input type="hidden" name="upload" value="1" />}
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input name="vendor" defaultValue={q.vendor} placeholder="Vendor" list="vendor-filter" className="w-full pl-9" />
          <datalist id="vendor-filter">{vendors.map((v) => <option key={v} value={v} />)}</datalist>
        </div>
        {projects.length > 1 && (
          <select name="project" defaultValue={q.project ?? ""} className="max-w-56">
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <select name="type" defaultValue={q.type ?? ""}>
          <option value="">All document types</option>
          {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="month" name="month" defaultValue={q.month} aria-label="Month" />
        <select name="uploader" defaultValue={q.uploader ?? ""} className="max-w-56">
          <option value="">Anyone</option>
          {uploaders.map((u) => <option key={u}>{u}</option>)}
        </select>
        <button className="rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium shadow-xs hover:bg-bg">Filter</button>
        {Object.keys(q).some((k) => k !== "upload") && <Link href={q.upload ? "/evidence?upload=1" : "/evidence"} className="px-2 py-2 text-sm text-muted hover:text-ink">Clear</Link>}
        <Link href={href({ status: q.status === "deleted" ? undefined : "deleted", page: undefined })} className="ml-auto px-2 py-2 text-xs text-muted hover:text-ink">
          {q.status === "deleted" ? "Hide deleted" : "Show deleted"}
        </Link>
      </form>

      {shown.length === 0 ? (
        <EmptyState icon={FileStack} title={live.length ? "No files match these filters" : "No evidence uploaded yet"}>
          {live.length ? "Try clearing a filter." : "Upload bills, invoices or log book photos. Each record needs at least one before it can be submitted."}
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-slate-50/70 text-left text-xs text-muted">
                  <th className="px-5 py-2.5 font-medium">File</th>
                  <th className="px-3 py-2.5 font-medium">Vendor · bill no.</th>
                  <th className="px-3 py-2.5 font-medium">Bill date</th>
                  <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-3 py-2.5 font-medium">Project</th>
                  <th className="px-3 py-2.5 font-medium">Uploaded</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((e) => (
                  <tr key={e.id} className="group transition hover:bg-slate-50">
                    <td className="px-5 py-2.5">
                      <Link href={`/evidence/${e.id}`} className="flex items-center gap-3">
                        <FileIcon mime={e.mime} size={e.size} />
                        <div className="min-w-0">
                          <div className="max-w-64 truncate font-medium group-hover:text-accent">{e.original_name}</div>
                          <div className="text-xs text-muted">{DOC_TYPES[e.doc_type]}{e.version > 1 ? ` · v${e.version}` : ""}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="max-w-48 truncate">{e.vendor ?? <span className="text-muted">—</span>}</div>
                      <div className="num text-xs text-muted">{e.doc_number}</div>
                    </td>
                    <td className="num whitespace-nowrap px-3 py-2.5 text-xs">{e.doc_date ?? "—"}</td>
                    <td className="num whitespace-nowrap px-3 py-2.5 text-right">{e.amount_inr ? fmtINR(e.amount_inr) : "—"}</td>
                    <td className="max-w-44 truncate px-3 py-2.5 text-xs">{projectName.get(e.project_id) ?? e.project_id}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted">
                      <div>{e.uploaded_by_email.split("@")[0]}</div>
                      <div className="num">{e.created_at?.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {e.deleted_at ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">Deleted</span>
                        ) : e.link_count > 0 ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Linked · {e.link_count}</span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">Not linked</span>
                        )}
                        {e.duplicate_of.length > 0 && !e.deleted_at && (
                          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700">Duplicate?</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > PAGE && (
            <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm text-muted">
              <span>{page * PAGE + 1}–{Math.min((page + 1) * PAGE, rows.length)} of {fmtNum(rows.length)}</span>
              <div className="flex gap-2">
                {page > 0 && <Link href={href({ page: String(page - 1) })} className="rounded-lg border border-line px-3 py-1 hover:bg-bg">Previous</Link>}
                {(page + 1) * PAGE < rows.length && <Link href={href({ page: String(page + 1) })} className="rounded-lg border border-line px-3 py-1 hover:bg-bg">Next</Link>}
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
