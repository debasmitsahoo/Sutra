import Image from "next/image";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await getUser()) redirect("/");
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-side p-10 text-slate-300 lg:flex">
        <Image src="/login-esg.webp" alt="" fill priority sizes="50vw" className="scale-105 object-cover object-[30%_center] blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-side via-side/50 to-side/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-side/40 to-transparent" />

        <div className="relative flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-accent font-bold text-white">S</span>
          <span className="text-lg font-semibold text-white">Sutra <span className="text-emerald-400">ESG</span></span>
        </div>
        <div className="relative max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
            Evidence-backed BRSR reporting, from project site to group board.
          </h2>
          <p className="mt-4 text-sm text-slate-300">
            Scope 1, 2 and 3 emissions with every number traced to its bill, Indian emission factors and SEBI-format reports.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="size-4 text-emerald-400" /> No bill, no number.
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <LoginForm />
      </div>
    </div>
  );
}
