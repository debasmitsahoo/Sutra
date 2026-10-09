import { EmptyState, PageHeader, StatCard } from "@/components/ui";

export default function Dashboard() {
  return (
    <>
      <PageHeader title="Dashboard" description="Group emissions, evidence coverage and pending items" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Scope 1" value="—" unit="tCO2e" />
        <StatCard label="Scope 2" value="—" unit="tCO2e" />
        <StatCard label="Scope 3" value="—" unit="tCO2e" />
        <StatCard label="Evidence coverage" value="—" unit="%" />
      </div>
      <div className="mt-6">
        <EmptyState title="No approved data yet">Record activities to see totals here.</EmptyState>
      </div>
    </>
  );
}
