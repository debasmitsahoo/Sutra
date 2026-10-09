"use client";
import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, EmptyState } from "./ui";

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
  const pageBtn = "grid size-8 place-items-center rounded-lg border border-line bg-surface hover:bg-bg disabled:opacity-40";
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-slate-50/70 text-left text-xs font-medium text-muted">
              {columns.map((c) => (
                <th key={c.key} className={`whitespace-nowrap px-4 py-3 font-medium ${c.numeric ? "text-right" : ""}`}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((r, i) => (
              <tr key={i} className="transition hover:bg-slate-50">
                {columns.map((c) => (
                  <td key={c.key} className={`whitespace-nowrap px-4 py-3 ${c.numeric ? "num text-right" : ""}`}>
                    {c.render ? c.render(r) : String(r[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-muted">
          <span>
            Showing <b className="font-medium text-ink">{page * pageSize + 1}–{Math.min((page + 1) * pageSize, rows.length)}</b> of{" "}
            <b className="font-medium text-ink">{rows.length}</b>
          </span>
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className={pageBtn} aria-label="Previous page">
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs">Page {page + 1} / {pages}</span>
            <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className={pageBtn} aria-label="Next page">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
