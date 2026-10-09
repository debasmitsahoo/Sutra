"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, Building2, CalendarRange, ChevronDown, Menu, Search, X } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";

// ponytail: static FY/node options until org_nodes + financial_years exist (Prompt 2).
const FYS = ["FY 2026-27", "FY 2025-26"];
const NODES = ["MEIL Group", "MEIL Ltd", "Irrigation BU", "Power BU"];

function Pill({ icon: Icon, label, options }: { icon: typeof Bell; label: string; options: string[] }) {
  return (
    <label className="relative flex items-center gap-2 rounded-lg border border-line bg-surface py-1.5 pl-3 pr-8 text-sm shadow-xs hover:border-slate-300">
      <Icon className="size-4 text-muted" />
      <span className="sr-only">{label}</span>
      <select className="appearance-none border-0 bg-transparent p-0 font-medium shadow-none focus:ring-0">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-4 text-muted" />
    </label>
  );
}

function Sidebar({ path }: { path: string }) {
  return (
    <div className="flex h-full flex-col bg-side text-slate-300">
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid size-8 place-items-center rounded-lg bg-accent font-bold text-white">S</span>
        <span className="text-[15px] font-semibold text-white">
          Sutra <span className="text-emerald-400">ESG</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((g) => (
          <div key={g.label}>
            <div className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">{g.label}</div>
            {g.items.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? path === "/" : path.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    active ? "bg-white/10 font-medium text-white" : "hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className={`size-[18px] ${active ? "text-emerald-400" : "text-slate-500"}`} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="m-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
        <span className="grid size-8 place-items-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-300">GA</span>
        <div className="min-w-0 text-xs">
          <div className="truncate font-medium text-white">Group Admin</div>
          <div className="truncate text-slate-500">MEIL Group</div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-60 lg:block">
        <Sidebar path={path} />
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">
            <Sidebar path={path} />
            <button onClick={() => setOpen(false)} className="absolute right-3 top-5 text-slate-400" aria-label="Close menu">
              <X className="size-5" />
            </button>
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-bg lg:hidden" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <div className="relative hidden max-w-sm flex-1 md:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input placeholder="Search projects, bills, materials…" className="w-full bg-bg pl-9 shadow-none" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Pill icon={CalendarRange} label="Financial year" options={FYS} />
            <div className="hidden sm:block"><Pill icon={Building2} label="Organisation" options={NODES} /></div>
            <button className="relative rounded-lg p-2 text-muted hover:bg-bg hover:text-ink" aria-label="Notifications">
              <Bell className="size-5" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-warn ring-2 ring-surface" />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
