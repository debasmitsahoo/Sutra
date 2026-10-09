import Link from "next/link";
import { ArrowRight, Factory, Fuel, Plane, Receipt, ShieldCheck, Truck, Zap } from "lucide-react";
import { ScopeDonut, TrendChart } from "@/components/charts";
import { Card, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { fmtNum } from "@/lib/format";

// Sample figures only — replaced by aggregation views in Prompt 8.
const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const TREND = MONTHS.map((month, i) => ({
  month,
  s1: 3600 + Math.round(Math.sin(i / 2) * 500) + i * 40,
  s2: 1700 + Math.round(Math.cos(i / 3) * 250),
  s3: 9800 + Math.round(Math.sin(i / 1.5) * 1200) + i * 90,
}));
const total = (k: "s1" | "s2" | "s3") => TREND.reduce((a, r) => a + r[k], 0);
const SCOPES = [
  { name: "Scope 1", value: total("s1"), color: "#f97316" },
  { name: "Scope 2", value: total("s2"), color: "#3b82f6" },
  { name: "Scope 3", value: total("s3"), color: "#8b5cf6" },
];
const ALL = SCOPES.reduce((a, s) => a + s.value, 0);

const ACTIONS = [
  { label: "Fuel issue", hint: "HSD, coal, LPG", icon: Fuel, tone: "bg-orange-50 text-orange-600" },
  { label: "Electricity bill", hint: "Grid, solar, PPA", icon: Zap, tone: "bg-blue-50 text-blue-600" },
  { label: "Business travel", hint: "Flights, trains, hotels", icon: Plane, tone: "bg-violet-50 text-violet-600" },
  { label: "Material purchase", hint: "Steel, cement, cables", icon: Truck, tone: "bg-emerald-50 text-emerald-600" },
];

const PENDING = [
  { what: "HSD issue · DG-02 · 4,200 L", where: "Kaleshwaram LIS Pkg 8", status: "submitted" },
  { what: "Grid electricity · Sep 2026", where: "Polavaram HEP", status: "reviewed" },
  { what: "SF6 top-up · GIS Bay 3 · 12 kg", where: "Zojila Tunnel", status: "returned" },
  { what: "Flight HYD → DEL · 3 pax", where: "MEIL Corporate", status: "submitted" },
];

export default function Dashboard() {
  return (
    <>
      <PageHeader
        title="Welcome back"
        description="Here's how MEIL Group is tracking for FY 2026-27."
        actions={
          <Link href="/record" className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700">
            Record activity <ArrowRight className="size-4" />
          </Link>
        }
      />

      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
        Sample data — live figures appear once activities are approved
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Scope 1 · Direct" value={fmtNum(total("s1"))} unit="tCO2e" delta={4.2} icon={Factory} tone="bg-orange-50 text-orange-600" />
        <StatCard label="Scope 2 · Electricity" value={fmtNum(total("s2"))} unit="tCO2e" delta={-6.8} icon={Zap} tone="bg-blue-50 text-blue-600" />
        <StatCard label="Scope 3 · Value chain" value={fmtNum(total("s3"))} unit="tCO2e" delta={2.1} icon={Truck} tone="bg-violet-50 text-violet-600" />
        <StatCard label="Evidence coverage" value="97.4" unit="%" icon={ShieldCheck} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Monthly emissions</h2>
              <p className="text-xs text-muted">tCO2e by scope, April to March</p>
            </div>
            <div className="flex gap-3 text-xs text-muted">
              {SCOPES.map((s) => (
                <span key={s.name} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: s.color }} />{s.name}
                </span>
              ))}
            </div>
          </div>
          <TrendChart data={TREND} />
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Scope split</h2>
          <p className="text-xs text-muted">Share of total footprint</p>
          <div className="relative">
            <ScopeDonut data={SCOPES} />
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <div className="num text-lg font-semibold">{fmtNum(ALL / 1000, 1)}k</div>
                <div className="text-[11px] text-muted">tCO2e</div>
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            {SCOPES.map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-sm">
                <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 text-muted">{s.name}</span>
                <span className="num font-medium">{fmtNum((s.value / ALL) * 100, 1)}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Quick record</h2>
          <div className="grid grid-cols-2 gap-3">
            {ACTIONS.map(({ label, hint, icon: Icon, tone }) => (
              <Link key={label} href="/record" className="group rounded-xl border border-line p-3 transition hover:border-accent/40 hover:shadow-sm">
                <span className={`grid size-9 place-items-center rounded-lg ${tone}`}><Icon className="size-[18px]" /></span>
                <div className="mt-2.5 text-sm font-medium group-hover:text-accent">{label}</div>
                <div className="text-xs text-muted">{hint}</div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Needs your attention</h2>
            <Link href="/approvals" className="text-sm font-medium text-accent hover:underline">View all</Link>
          </div>
          <ul className="divide-y divide-line">
            {PENDING.map((p) => (
              <li key={p.what} className="flex items-center gap-3 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><Receipt className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.what}</div>
                  <div className="truncate text-xs text-muted">{p.where}</div>
                </div>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
