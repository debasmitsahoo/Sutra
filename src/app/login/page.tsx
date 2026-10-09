import Image from "next/image";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await getUser()) redirect("/");
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[1.25fr_1fr]">
      <div className="relative m-3 hidden overflow-hidden rounded-3xl bg-side lg:block">
        <Image src="/login-esg.webp" alt="" fill priority sizes="60vw" className="object-cover object-left" />

        {/* progressive blur: sharp photo at the top, frosted at the bottom behind the text */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 backdrop-blur-xl [mask-image:linear-gradient(to_top,black_45%,transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        <div className="absolute left-6 top-6 flex items-center gap-2.5 rounded-full border border-white/15 bg-black/25 py-1.5 pl-1.5 pr-4 backdrop-blur-md">
          <span className="grid size-7 place-items-center rounded-full bg-accent text-sm font-bold text-white">S</span>
          <span className="text-sm font-semibold text-white">Sutra <span className="text-emerald-300">ESG</span></span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-10">
          <h2 className="max-w-lg text-3xl font-semibold leading-tight tracking-tight text-white">
            Evidence-backed BRSR reporting, from project site to group board.
          </h2>
          <p className="mt-3 max-w-lg text-sm text-white/75">
            Scope 1, 2 and 3 emissions with every number traced to its bill, Indian emission factors and SEBI-format reports.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/85 backdrop-blur">
            <ShieldCheck className="size-3.5 text-emerald-300" /> No bill, no number.
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <LoginForm />
      </div>
    </div>
  );
}
