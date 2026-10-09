"use client";
import { useState, type ReactNode } from "react";
import { EmptyState } from "./ui";

export type Column<T> = { key: string; header: string; numeric?: boolean; render?: (row: T) => ReactNode };

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  pageSize = 25,
  empty = "No records",
}: {
  columns: Column<T>[];
  rows: T[];
  pageSize?: number;
  empty?: string;
}) {
  const [page, setPage] = useState(0);
  if (!rows.length) return <EmptyState title={empty} />;
  const pages = Math.ceil(rows.length / pageSize);
  const shown = rows.slice(page * pageSize, (page + 1) * pageSize);
  return (
    <div className="border border-line bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              {columns.map((c) => (
                <th key={c.key} className={`px-3 py-2 font-normal ${c.numeric ? "text-right" : ""}`}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i} className="border-b border-line last:border-0 hover:bg-bg">
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2 ${c.numeric ? "text-right font-mono" : ""}`}>
                    {c.render ? c.render(r) : String(r[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-line px-3 py-2 text-xs text-muted">
          <span className="font-mono">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, rows.length)} of {rows.length}
          </span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className="disabled:opacity-40">Prev</button>
            <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
