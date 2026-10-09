import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CalendarSearch, CheckCircle2, Info } from "lucide-react";
import { Card, ScopeBadge, StatusBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { loadLibrary } from "@/lib/db/library";
import { GHG_CATEGORIES } from "@/lib/db/schema";
import { GWP, pickFactor } from "@/lib/ghg/factors";
import { fmtNum } from "@/lib/format";
import { AddVersionForm, ApproveButton } from "../forms";
import { fmtFactor, RegionChip } from "../shared";

export default async function MaterialPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ on?: string; region?: string }>;
}) {
  const user = await requireUser();
  const { code } = await params;
  const q = await searchParams;
  const { materials, factors } = await loadLibrary();
  const m = materials.find((x) => x.id === decodeURIComponent(code));
  if (!m) notFound();

  const history = factors.filter((f) => f.material_id === m.id).sort((a, b) => a.region.localeCompare(b.region) || b.version - a.version);
  const regions = [...new Set(history.map((f) => f.region))];
  const latest = history[0];
  const on = q.on && /^\d{4}-\d{2}-\d{2}$/.test(q.on) ? q.on : new Date().toISOString().slice(0, 10);
  const region = q.region ?? (regions.includes("IN") ? "IN" : regions[0] ?? "IN");
  const approved = pickFactor(history, { materialId: m.id, date: on, region });
  const anyVersion = approved ?? pickFactor(history, { materialId: m.id, date: on, region, includeDraft: true });
  const canAdd = user.role === "group_admin" || user.role === "company_admin";

  return (
    <>
      <Link href="/factors" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> All factors
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <ScopeBadge scope={m.scope} />
            <span className="num text-xs text-muted">{m.code}</span>
            {m.is_renewable && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Renewable</span>}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{m.name}</h1>
          <p className="mt-1 text-sm text-muted">{m.categories.map((c) => GHG_CATEGORIES[c]).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ["Base unit", m.base_unit],
            ["Entry units", m.units.join(", ")],
            ...(m.ncv_gj_per_unit ? [["Energy", `${m.ncv_gj_per_unit} GJ/${m.base_unit}`]] : []),
            ...(m.gwp ? [["GWP AR5 / AR6", `${fmtNum(m.gwp.AR5 ?? 0)} / ${fmtNum(m.gwp.AR6 ?? 0)}`]] : []),
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-line bg-surface px-3 py-2 shadow-xs">
              <div className="text-muted">{k}</div>
              <div className="num mt-0.5 font-medium text-ink">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {m.help && (
        <div className="mb-6 flex gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Info className="mt-0.5 size-4 shrink-0" /> {m.help}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="font-semibold">Version history</h2>
          {history.map((f) => {
            const inUse = approved?.id === f.id;
            return (
              <Card key={f.id} className={`p-5 ${inUse ? "ring-2 ring-accent/30" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="num rounded-md bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">v{f.version}</span>
                  <RegionChip region={f.region} />
                  <span className="num text-sm text-muted">
                    {f.valid_from} → {f.valid_to ?? "open"}
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    {inUse && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">Applies on {on}</span>}
                    <StatusBadge status={f.status} />
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {(f.co2e !== undefined
                    ? [["CO2e (composite)", f.co2e]]
                    : [["CO2", f.gases.co2], ["CH4", f.gases.ch4], ["N2O", f.gases.n2o], ...(f.gases.other ? [["Gas (other)", f.gases.other]] : [])]
                  ).map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-slate-50 px-3 py-2">
                      <div className="text-[11px] text-muted">{k} kg/{f.unit}</div>
                      <div className="num text-sm">{v}</div>
                    </div>
                  ))}
                  <div className="rounded-lg bg-accent-soft px-3 py-2">
                    <div className="text-[11px] text-accent">kg CO2e/{f.unit} · {f.gwp_set}</div>
                    <div className="num text-sm font-semibold text-accent">{fmtFactor(f, m)}</div>
                  </div>
                </div>

                <dl className="mt-4 grid gap-1 text-xs sm:grid-cols-[110px_1fr]">
                  <dt className="text-muted">Source</dt><dd>{f.source}</dd>
                  <dt className="text-muted">Publisher</dt><dd>{f.publisher}</dd>
                  <dt className="text-muted">Citation</dt><dd className="text-muted">{f.citation}</dd>
                  {f.approved_by && (<><dt className="text-muted">Approved</dt><dd>{f.approved_by} · {f.approved_at?.slice(0, 10)}</dd></>)}
                  {f.created_by && f.created_by !== "seed" && (<><dt className="text-muted">Added by</dt><dd>{f.created_by}</dd></>)}
                </dl>

                {f.verify_note && f.status === "draft" && (
                  <div className="mt-4 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <AlertTriangle className="mt-px size-3.5 shrink-0" /> {f.verify_note}
                  </div>
                )}
                {f.status === "draft" && user.role === "group_admin" && <ApproveButton id={f.id} />}
              </Card>
            );
          })}
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold"><CalendarSearch className="size-4 text-accent" /> Which factor applies?</h2>
            <p className="mt-1 text-xs text-muted">Calculations pick the approved version in force on the activity date.</p>
            <form className="mt-4 grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <input type="date" name="on" defaultValue={on} aria-label="Activity date" />
                <select name="region" defaultValue={region} aria-label="Region">
                  {[...new Set([...regions, "IN", "GLOBAL"])].map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <button className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium shadow-xs hover:bg-bg">Look up</button>
            </form>
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
              {approved ? (
                <div className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
                  <div>
                    <b>v{approved.version}</b> ({approved.region}) applies on <span className="num">{on}</span>:{" "}
                    <span className="num font-semibold">{fmtFactor(approved, m)}</span> kg CO2e/{approved.unit}
                    {approved.region !== region && <div className="mt-1 text-xs text-amber-700">No {region} factor — using the GLOBAL default.</div>}
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 text-amber-800">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <div>
                    No approved factor on <span className="num">{on}</span>.
                    {anyVersion && <> v{anyVersion.version} is still a draft and needs group admin approval.</>}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {canAdd && (
            <AddVersionForm
              materialId={m.id}
              baseUnit={m.base_unit}
              hasGwp={!!m.gwp}
              defaults={latest && {
                region: latest.region, gwp_set: latest.gwp_set, mode: latest.co2e !== undefined ? "co2e" : "gases",
                co2: latest.gases.co2, ch4: latest.gases.ch4, n2o: latest.gases.n2o, other: latest.gases.other ?? "", co2e: latest.co2e ?? "",
                source: latest.source, publisher: latest.publisher, citation: latest.citation,
              }}
            />
          )}
          <p className="text-xs text-muted">GWP values: CH4 {GWP.AR5.ch4} (AR5) / {GWP.AR6.ch4} (AR6) · N2O {GWP.AR5.n2o} / {GWP.AR6.n2o}</p>
        </div>
      </div>
    </>
  );
}
