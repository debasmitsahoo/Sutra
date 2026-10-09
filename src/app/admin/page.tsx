import { Building2, FolderKanban, Globe2, Layers, type LucideIcon } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { getScope, requireUser } from "@/lib/auth";
import { scopedQuery } from "@/lib/db/read";
import { ROLE_LABEL, type Role } from "@/lib/db/schema";
import { db } from "@/lib/firebase/admin";
import { RenameNode } from "./RenameNode";

const TYPE: Record<string, { icon: LucideIcon; tone: string }> = {
  group: { icon: Globe2, tone: "bg-slate-900 text-white" },
  company: { icon: Building2, tone: "bg-emerald-50 text-emerald-700" },
  bu: { icon: Layers, tone: "bg-blue-50 text-blue-700" },
  project: { icon: FolderKanban, tone: "bg-slate-100 text-slate-600" },
};

const fmtTime = (d?: Date) =>
  d?.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) ?? "";

export default async function AdminPage() {
  const user = await requireUser();
  const canEdit = user.role === "company_admin" || user.role === "group_admin";
  const [{ nodes }, rolesSnap, auditSnap] = await Promise.all([
    getScope(user),
    scopedQuery(user, "user_roles").get(),
    scopedQuery(user, "audit_log").orderBy("at", "desc").limit(50).get(),
  ]);
  const roles = rolesSnap.docs.map((d) => d.data());
  const profiles = roles.length
    ? await db.getAll(...roles.map((r) => db.collection("profiles").doc(r.uid))).then((s) => new Map(s.map((d) => [d.id, d.data()])))
    : new Map();
  const nodeName = new Map(nodes.map((n) => [n.id, n.name]));
  const base = Math.min(...nodes.map((n) => n.node_path.length));
  const counts = nodes.reduce<Record<string, number>>((a, n) => ((a[n.type] = (a[n.type] ?? 0) + 1), a), {});

  return (
    <>
      <PageHeader title="Organisation & access" description="Your part of the MEIL hierarchy, who has access, and every change made." />

      <div className="mb-6 flex flex-wrap gap-2">
        {(["company", "bu", "project"] as const).map((t) =>
          counts[t] ? (
            <span key={t} className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
              <b className="num font-semibold text-ink">{counts[t]}</b>{" "}
              {{ company: ["company", "companies"], bu: ["business unit", "business units"], project: ["project", "projects"] }[t][counts[t] === 1 ? 0 : 1]}
            </span>
          ) : null,
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="overflow-hidden xl:col-span-3">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold">Hierarchy</h2>
            <p className="text-xs text-muted">Group › Company › Business unit › Project</p>
          </div>
          <ul className="max-h-[560px] divide-y divide-line overflow-y-auto">
            {nodes.map((n) => {
              const { icon: Icon, tone } = TYPE[n.type];
              return (
                <li key={n.id} className="flex items-center gap-3 px-5 py-2.5" style={{ paddingLeft: 20 + (n.node_path.length - base) * 22 }}>
                  <span className={`grid size-7 shrink-0 place-items-center rounded-md ${tone}`}><Icon className="size-3.5" /></span>
                  <div className="min-w-0 flex-1">
                    {canEdit ? <RenameNode id={n.id} name={n.name} /> : <div className="truncate text-sm font-medium">{n.name}</div>}
                    <div className="num text-[11px] text-muted">
                      {n.code} · {n.is_overseas ? n.country : `${n.state ?? ""} ${n.country}`}
                      {n.rbi_location_class ? ` · ${n.rbi_location_class.replace("_", "-")}` : ""}
                    </div>
                  </div>
                  {n.is_listed && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">Listed</span>}
                  {n.is_overseas && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Overseas</span>}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="overflow-hidden xl:col-span-2">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold">People</h2>
            <p className="text-xs text-muted">Users see their node and everything below it</p>
          </div>
          <ul className="divide-y divide-line">
            {roles.map((r) => {
              const p = profiles.get(r.uid);
              return (
                <li key={`${r.uid}-${r.role}`} className="flex items-center gap-3 px-5 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                    {(p?.name ?? "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p?.name ?? r.uid}</div>
                    <div className="truncate text-xs text-muted">{p?.email}</div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-medium">{ROLE_LABEL[r.role as Role]}</div>
                    <div className="max-w-40 truncate text-muted">{nodeName.get(r.node_id) ?? r.node_id}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold">Audit log</h2>
          <p className="text-xs text-muted">Append-only. Latest 50 events in your scope.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-slate-50/70 text-left text-xs text-muted">
                <th className="px-5 py-2.5 font-medium">When</th>
                <th className="px-5 py-2.5 font-medium">Who</th>
                <th className="px-5 py-2.5 font-medium">Action</th>
                <th className="px-5 py-2.5 font-medium">Record</th>
                <th className="px-5 py-2.5 font-medium">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {auditSnap.docs.map((d) => {
                const a = d.data();
                return (
                  <tr key={d.id} className="align-top">
                    <td className="num whitespace-nowrap px-5 py-2.5 text-xs text-muted">{fmtTime(a.at?.toDate())}</td>
                    <td className="whitespace-nowrap px-5 py-2.5 text-xs">{a.actor_email}</td>
                    <td className="px-5 py-2.5">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">{a.action}</span>
                    </td>
                    <td className="num whitespace-nowrap px-5 py-2.5 text-xs text-muted">{a.collection}/{a.doc_id}</td>
                    <td className="px-5 py-2.5 text-xs">
                      {a.action === "update" &&
                        Object.keys(a.after ?? {}).map((k) => (
                          <div key={k}>
                            <span className="text-muted">{k}:</span> <s className="text-muted">{String(a.before?.[k])}</s> → {String(a.after[k])}
                          </div>
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {auditSnap.empty && <p className="px-5 py-8 text-center text-sm text-muted">No events yet.</p>}
        </div>
      </Card>
    </>
  );
}
