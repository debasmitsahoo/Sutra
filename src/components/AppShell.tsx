"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NAV } from "@/lib/nav";


// ponytail: static FY/node options until org_nodes + financial_years exist (Prompt 2).
const FYS = ["FY 2026-27", "FY 2025-26"];
const NODES = ["MEIL Group", "— MEIL Ltd", "— — Irrigation BU", "— — Power BU"];

const select = "border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none";

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center gap-6 border-b border-line bg-surface px-6">
        <Link href="/" className="font-serif text-xl text-ink">
          Sutra <span className="text-accent">ESG</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <label className="sr-only" htmlFor="fy">Financial year</label>
          <select id="fy" className={select}>{FYS.map((f) => <option key={f}>{f}</option>)}</select>
          <label className="sr-only" htmlFor="node">Organisation node</label>
          <select id="node" className={select}>{NODES.map((n) => <option key={n}>{n}</option>)}</select>
        </div>
      </header>
      <nav className="flex overflow-x-auto border-b border-line bg-surface md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`shrink-0 px-3 py-2 text-sm ${path === n.href ? "text-accent" : "text-muted"}`}>
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="flex">
        <nav className="sticky top-0 hidden h-[calc(100vh-3.5rem)] w-52 shrink-0 border-r border-line bg-surface py-4 md:block">
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`block border-l-2 px-5 py-2 text-sm ${
                  active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <main className="min-w-0 flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
