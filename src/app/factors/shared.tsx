import { Globe2 } from "lucide-react";
import type { FactorRow, MaterialRow } from "@/lib/db/library";
import { co2ePerUnit } from "@/lib/ghg/factors";
import { fmtNum } from "@/lib/format";

export function fmtFactor(f: FactorRow, m?: MaterialRow) {
  try {
    const v = co2ePerUnit(f, m?.gwp);
    return v.gte(100) ? fmtNum(v.toNumber(), 1) : v.gte(1) ? fmtNum(v.toNumber(), 3) : v.toSignificantDigits(4).toString();
  } catch {
    return "—";
  }
}

export function RegionChip({ region }: { region: string }) {
  return region === "GLOBAL" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600" title="International default — no Indian value yet">
      <Globe2 className="size-3" /> Global
    </span>
  ) : (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">{region === "IN" ? "India" : region}</span>
  );
}

