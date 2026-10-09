import {
  BarChart3, CheckCircle2, FileStack, FileText, FlaskConical, LayoutDashboard, ListChecks, PlusCircle, Settings,
} from "lucide-react";

export const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Capture",
    items: [
      { href: "/record", label: "Record activity", icon: PlusCircle },
      { href: "/activities", label: "Activities", icon: ListChecks },
      { href: "/evidence", label: "Evidence", icon: FileStack },
    ],
  },
  {
    label: "Review & report",
    items: [
      { href: "/approvals", label: "Approvals", icon: CheckCircle2 },
      { href: "/brsr", label: "BRSR", icon: FileText },
      { href: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Setup",
    items: [
      { href: "/factors", label: "Factors", icon: FlaskConical },
      { href: "/admin", label: "Admin", icon: Settings },
    ],
  },
];

export const NAV = NAV_GROUPS.flatMap((g) => g.items);
