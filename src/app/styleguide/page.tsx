"use client";
import { useState } from "react";
import { DataTable } from "@/components/DataTable";
import { FileDropzone } from "@/components/FileDropzone";
import { Button, EmptyState, InlineError, PageHeader, ScopeBadge, StatCard, StatusBadge } from "@/components/ui";
import { fmtINR, fmtNum } from "@/lib/format";

const COLORS = [
  ["bg", "#F5F3EE"], ["surface", "#FFFFFF"], ["ink", "#141414"], ["muted", "#6B6B66"],
  ["line", "#D9D5CC"], ["accent", "#1E5B43"], ["warn", "#C2410C"],
];

const ROWS = Array.from({ length: 32 }, (_, i) => ({
  date: `2026-04-${String((i % 28) + 1).padStart(2, "0")}`,
  project: ["Kaleshwaram LIS", "Polavaram HEP", "Zojila Tunnel"][i % 3],
  scope: ((i % 3) + 1) as 1 | 2 | 3,
  material: ["HSD", "Grid electricity", "Steel (TMT)"][i % 3],
  co2e: 1234.5 * (i + 1),
  status: ["draft", "submitted", "approved", "locked"][i % 4],
}));

export default function Styleguide() {
  const [files, setFiles] = useState<File[]>([]);
  return (
    <div className="space-y-10">
      <PageHeader title="Styleguide" description="Tokens and components used across Sutra ESG" actions={<><Button variant="secondary">Cancel</Button><Button>Submit</Button></>} />

      <section>
        <h2 className="mb-3 font-serif text-xl">Colour</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {COLORS.map(([n, hex]) => (
            <div key={n} className="border border-line bg-surface">
              <div className="h-12 border-b border-line" style={{ background: hex }} />
              <div className="p-2 text-xs">{n}<div className="font-mono text-muted">{hex}</div></div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl">Type</h2>
        <div className="space-y-2 border border-line bg-surface p-4">
          <div className="font-serif text-3xl">Instrument Serif — Business Responsibility and Sustainability Report</div>
          <div>Inter — Record diesel issued to DG-02 at Kaleshwaram LIS Package 8.</div>
          <div className="font-mono">IBM Plex Mono — {fmtNum(12345678.9, 2)} kg · {fmtINR(250000000)}</div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl">Stat cards</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Scope 1" value={fmtNum(48213.4, 1)} unit="tCO2e" delta="+4.2% vs FY 2025-26" />
          <StatCard label="Scope 2" value={fmtNum(21870, 1)} unit="tCO2e" />
          <StatCard label="Scope 3" value={fmtNum(312450.8, 1)} unit="tCO2e" />
          <StatCard label="Evidence coverage" value="97.4" unit="%" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl">Badges</h2>
        <div className="flex flex-wrap gap-2">
          {["draft", "submitted", "reviewed", "approved", "locked", "returned"].map((s) => <StatusBadge key={s} status={s} />)}
          <ScopeBadge scope={1} /><ScopeBadge scope={2} /><ScopeBadge scope={3} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl">Form and validation</h2>
        <div className="grid max-w-md gap-1 border border-line bg-surface p-4">
          <label htmlFor="qty" className="text-xs text-muted">Quantity (L)</label>
          <input id="qty" defaultValue="0" className="font-mono" />
          <InlineError>Quantity must be greater than zero.</InlineError>
          <InlineError warning>42% higher than last month for DG-02. Add a note.</InlineError>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl">File dropzone</h2>
        <FileDropzone onFiles={(f) => setFiles((p) => [...p, ...f])} />
        {files.length > 0 && <ul className="mt-2 font-mono text-xs text-muted">{files.map((f, i) => <li key={i}>{f.name} · {fmtNum(f.size)} B</li>)}</ul>}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl">Data table</h2>
        <DataTable
          pageSize={10}
          rows={ROWS}
          columns={[
            { key: "date", header: "Date", render: (r) => <span className="font-mono">{r.date}</span> },
            { key: "project", header: "Project" },
            { key: "scope", header: "Scope", render: (r) => <ScopeBadge scope={r.scope} /> },
            { key: "material", header: "Material" },
            { key: "co2e", header: "kgCO2e", numeric: true, render: (r) => fmtNum(r.co2e, 1) },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl">Empty state</h2>
        <EmptyState title="No evidence linked">Attach a bill, log sheet or invoice before submitting.</EmptyState>
      </section>
    </div>
  );
}
