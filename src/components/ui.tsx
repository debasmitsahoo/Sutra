import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
      <div>
        <h1 className="font-serif text-3xl text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, unit, delta }: { label: string; value: string; unit?: string; delta?: string }) {
  return (
    <div className="border border-line bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-2 font-mono text-2xl text-ink">
        {value}
        {unit && <span className="ml-1 text-sm text-muted">{unit}</span>}
      </div>
      {delta && <div className="mt-1 font-mono text-xs text-muted">{delta}</div>}
    </div>
  );
}

const STATUS: Record<string, string> = {
  draft: "border-line text-muted",
  submitted: "border-ink text-ink",
  reviewed: "border-ink text-ink",
  approved: "border-accent text-accent",
  locked: "border-accent bg-accent text-white",
  returned: "border-warn text-warn",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block border px-2 py-0.5 text-xs capitalize ${STATUS[status] ?? STATUS.draft}`}>
      {status}
    </span>
  );
}

export function ScopeBadge({ scope }: { scope: 1 | 2 | 3 }) {
  return <span className="inline-block border border-ink px-1.5 py-0.5 font-mono text-xs text-ink">S{scope}</span>;
}

export function InlineError({ children, warning }: { children: ReactNode; warning?: boolean }) {
  return (
    <p role="alert" className={`mt-1 text-xs ${warning ? "text-warn" : "text-warn font-medium"}`}>
      {warning ? "Warning: " : ""}
      {children}
    </p>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border border-dashed border-line bg-surface px-6 py-12 text-center">
      <div className="font-serif text-xl text-ink">{title}</div>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Button({ variant = "primary", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  const cls =
    variant === "primary"
      ? "bg-accent text-white hover:bg-accent/90"
      : "border border-line bg-surface text-ink hover:border-ink";
  return <button {...p} className={`px-3 py-1.5 text-sm disabled:opacity-50 ${cls} ${p.className ?? ""}`} />;
}
