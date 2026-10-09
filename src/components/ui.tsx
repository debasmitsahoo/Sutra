import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, AlertTriangle, ArrowDownRight, ArrowUpRight, Inbox } from "lucide-react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface shadow-xs ${className}`}>{children}</div>;
}

// `up` = bad for emissions, so rising deltas show warm, falling show green.
export function StatCard({
  label, value, unit, delta, icon: Icon, tone = "text-accent bg-accent-soft",
}: {
  label: string; value: string; unit?: string; delta?: number; icon?: LucideIcon; tone?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        {Icon && <span className={`grid size-9 place-items-center rounded-xl ${tone}`}><Icon className="size-[18px]" /></span>}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="num text-[28px] font-semibold tracking-tight text-ink">{value}</span>
        {unit && <span className="text-sm text-muted">{unit}</span>}
      </div>
      {delta !== undefined && (
        <div className={`mt-2 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
          delta > 0 ? "bg-orange-50 text-warn" : "bg-accent-soft text-accent"
        }`}>
          {delta > 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
          {Math.abs(delta)}% vs last FY
        </div>
      )}
    </Card>
  );
}

const STATUS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 [--dot:#94a3b8]",
  submitted: "bg-blue-50 text-blue-700 [--dot:#3b82f6]",
  reviewed: "bg-violet-50 text-violet-700 [--dot:#8b5cf6]",
  approved: "bg-emerald-50 text-emerald-700 [--dot:#10b981]",
  locked: "bg-slate-900 text-white [--dot:#34d399]",
  returned: "bg-orange-50 text-orange-700 [--dot:#f97316]",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS[status] ?? STATUS.draft}`}>
      <span className="size-1.5 rounded-full bg-(--dot)" />
      {status}
    </span>
  );
}

const SCOPE = {
  1: "bg-orange-50 text-orange-700 ring-orange-200",
  2: "bg-blue-50 text-blue-700 ring-blue-200",
  3: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function ScopeBadge({ scope }: { scope: 1 | 2 | 3 }) {
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${SCOPE[scope]}`}>Scope {scope}</span>;
}

export function InlineError({ children, warning }: { children: ReactNode; warning?: boolean }) {
  const Icon = warning ? AlertTriangle : AlertCircle;
  return (
    <p role="alert" className={`mt-1.5 flex items-start gap-1.5 text-xs ${warning ? "text-warn" : "text-danger"}`}>
      <Icon className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function EmptyState({ title, children, icon: Icon = Inbox, action }: { title: string; children?: ReactNode; icon?: LucideIcon; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent"><Icon className="size-6" /></span>
      <div className="mt-4 font-medium text-ink">{title}</div>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function Button({ variant = "primary", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const cls = {
    primary: "bg-accent text-white shadow-sm hover:bg-emerald-700",
    secondary: "border border-line bg-surface text-ink shadow-xs hover:bg-bg",
    ghost: "text-muted hover:bg-bg hover:text-ink",
  }[variant];
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 ${cls} ${p.className ?? ""}`}
    />
  );
}
