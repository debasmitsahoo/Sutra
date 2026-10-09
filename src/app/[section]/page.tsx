import { notFound } from "next/navigation";
import { NAV } from "@/lib/nav";
import { EmptyState, PageHeader } from "@/components/ui";

// Placeholder for nav sections not yet built; real routes (e.g. app/record/page.tsx) take precedence.
export default async function Section({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const item = NAV.find((n) => n.href === `/${section}`);
  if (!item) notFound();
  return (
    <>
      <PageHeader title={item.label} />
      <EmptyState icon={item.icon} title={`${item.label} is on the way`}>
        This module is being built in a later phase.
      </EmptyState>
    </>
  );
}
