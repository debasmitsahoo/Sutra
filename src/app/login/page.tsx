import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await getUser()) redirect("/");
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-side p-10 text-slate-300 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-accent font-bold text-white">S</span>
          <span className="text-lg font-semibold text-white">Sutra <span className="text-emerald-400">ESG</span></span>
        </div>
        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-white">
            Evidence-backed BRSR reporting, from project site to group board.
          </h2>
          <p className="mt-4 max-w-md text-sm text-slate-400">
            Scope 1, 2 and 3 emissions with every number traced to its bill, Indian emission factors and SEBI-format reports.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="size-4 text-emerald-400" /> No bill, no number.
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <LoginForm />
      </div>
    </div>
  );
}
