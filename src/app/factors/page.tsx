import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, FlaskConical } from "lucide-react";
import { Card, PageHeader, ScopeBadge, StatusBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { loadLibrary, type FactorRow } from "@/lib/db/library";
import { GHG_CATEGORIES } from "@/lib/db/schema";
import { fmtNum } from "@/lib/format";
import { AddConversionForm, AddMaterialForm } from "./forms";
import { fmtFactor, RegionChip } from "./shared";

const TABS = [
  { id: "factors", label: "Emission factors" },
  { id: "materials", label: "Materials" },
  { id: "units", label: "Units" },
] as const;

const SCOPE_TITLE = { 1: "Scope 1 · Direct", 2: "Scope 2 · Purchased energy", 3: "Scope 3 · Value chain" } as const;

export default async function FactorsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser();
  const { tab = "factors" } = await searchParams;
  const { materials, factors, conversions } = await loadLibrary();
  const byId = new Map(materials.map((m) => [m.id, m]));

  // Latest version per material x region.
  const latest = new Map<string, FactorRow>();
  for (const f of factors) {
    const k = `${f.material_id}|${f.region}`;
    if ((latest.get(k)?.version ?? 0) < f.version) latest.set(k, f);
  }
  const rows = [...latest.values()].sort((a, b) => {
    const ma = byId.get(a.material_id), mb = byId.get(b.material_id);
    return (ma?.scope ?? 9) - (mb?.scope ?? 9) || (ma?.name ?? "").localeCompare(mb?.name ?? "");
  });
  const drafts = rows.filter((f) => f.status === "draft").length;
  const isGroupAdmin = user.role === "group_admin";

  return (
    <>
      <PageHeader
        title="Emission factors"
        description="Versioned, cited factors. Each activity uses the approved version in force on its date — old versions are never overwritten."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4">
          <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><FlaskConical className="size-5" /></span>
          <div><div className="num text-xl font-semibold">{materials.length}</div><div className="text-xs text-muted">Materials & activities</div></div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="size-5" /></span>
          <div><div className="num text-xl font-semibold">{rows.length - drafts}</div><div className="text-xs text-muted">Approved, in use</div></div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600"><AlertTriangle className="size-5" /></span>
          <div><div className="num text-xl font-semibold">{drafts}</div><div className="text-xs text-muted">Drafts to verify{isGroupAdmin ? " & approve" : ""}</div></div>
        </Card>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-line bg-surface p-1 shadow-xs sm:inline-flex">
        {TABS.map((t) => (
          <Link key={t.id} href={`/factors?tab=${t.id}`}
            className={`flex-1 whitespace-nowrap rounded-lg px-4 py-1.5 text-center text-sm font-medium transition ${tab === t.id ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "factors" &&
        ([1, 2, 3] as const).map((scope) => (
          <Card key={scope} className="mb-6 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
              <ScopeBadge scope={scope} />
              <h2 className="font-semibold">{SCOPE_TITLE[scope]}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-slate-50/70 text-left text-xs text-muted">
                    <th className="px-5 py-2.5 font-medium">Material</th>
                    <th className="px-3 py-2.5 font-medium">Region</th>
                    <th className="px-3 py-2.5 text-right font-medium">kg CO2e per unit</th>
                    <th className="px-3 py-2.5 font-medium">Version</th>
                    <th className="px-3 py-2.5 font-medium">Source</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.filter((f) => byId.get(f.material_id)?.scope === scope).map((f) => {
                    const m = byId.get(f.material_id);
                    return (
                      <tr key={f.id} className="group transition hover:bg-slate-50">
                        <td className="px-5 py-2.5">
                          <Link href={`/factors/${f.material_id}`} className="font-medium group-hover:text-accent">{m?.name ?? f.material_id}</Link>
                          <div className="text-[11px] text-muted">{m?.categories.map((c) => GHG_CATEGORIES[c]).join(" · ")}</div>
                        </td>
                        <td className="px-3 py-2.5"><RegionChip region={f.region} /></td>
                        <td className="num whitespace-nowrap px-3 py-2.5 text-right">
                          {fmtFactor(f, m)} <span className="text-xs text-muted">/ {f.unit}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted">
                          <span className="num font-medium text-ink">v{f.version}</span> · from {f.valid_from}
                        </td>
                        <td className="max-w-56 truncate px-3 py-2.5 text-xs text-muted" title={f.citation}>{f.publisher}</td>
                        <td className="px-3 py-2.5"><StatusBadge status={f.status} /></td>
                        <td className="px-3 py-2.5 text-right">
                          <Link href={`/factors/${f.material_id}`} aria-label={`Open ${m?.name}`} className="text-muted group-hover:text-accent">
                            <ArrowRight className="size-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}

      {tab === "materials" && (
        <>
          {isGroupAdmin && <AddMaterialForm />}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-slate-50/70 text-left text-xs text-muted">
                    <th className="px-5 py-2.5 font-medium">Code</th>
                    <th className="px-3 py-2.5 font-medium">Name</th>
                    <th className="px-3 py-2.5 font-medium">Scope</th>
                    <th className="px-3 py-2.5 font-medium">Base unit</th>
                    <th className="px-3 py-2.5 font-medium">Entry units</th>
                    <th className="px-3 py-2.5 text-right font-medium">GJ / unit</th>
                    <th className="px-3 py-2.5 text-right font-medium">GWP AR5 / AR6</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {materials.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="num px-5 py-2.5 text-xs"><Link href={`/factors/${m.id}`} className="hover:text-accent">{m.code}</Link></td>
                      <td className="px-3 py-2.5">
                        {m.name}
                        {m.is_renewable && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Renewable</span>}
                      </td>
                      <td className="px-3 py-2.5"><ScopeBadge scope={m.scope} /></td>
                      <td className="num px-3 py-2.5 text-xs">{m.base_unit}</td>
                      <td className="num px-3 py-2.5 text-xs text-muted">{m.units.join(", ")}</td>
                      <td className="num px-3 py-2.5 text-right text-xs">{m.ncv_gj_per_unit ?? "—"}</td>
                      <td className="num px-3 py-2.5 text-right text-xs">{m.gwp ? `${fmtNum(m.gwp.AR5 ?? 0)} / ${fmtNum(m.gwp.AR6 ?? 0)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === "units" && (
        <>
          {isGroupAdmin && <AddConversionForm materials={materials.map((m) => ({ id: m.id, name: m.name }))} />}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-slate-50/70 text-left text-xs text-muted">
                    <th className="px-5 py-2.5 font-medium">Conversion</th>
                    <th className="px-3 py-2.5 font-medium">Applies to</th>
                    <th className="px-3 py-2.5 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {conversions.sort((a, b) => (a.material_id ?? "").localeCompare(b.material_id ?? "")).map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="num px-5 py-2.5">1 {c.from_unit} = {c.factor} {c.to_unit}</td>
                      <td className="px-3 py-2.5 text-xs">{c.material_id ? byId.get(c.material_id)?.name ?? c.material_id : <span className="text-muted">All materials</span>}</td>
                      <td className="px-3 py-2.5 text-xs text-muted">{c.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-line px-5 py-3 text-xs text-muted">
              Conversions work both ways and chain — e.g. diesel bought in tonnes converts t → kg → L using its density.
            </p>
          </Card>
        </>
      )}
    </>
  );
}
