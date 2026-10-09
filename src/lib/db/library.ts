import { cache } from "react";
import { db } from "@/lib/firebase/admin";
import type { Factor } from "@/lib/ghg/factors";
import type { ConversionRow } from "@/lib/ghg/units";
import type { Material } from "./schema";
import type { z } from "zod";

export type MaterialRow = z.infer<typeof Material> & { id: string };
export type FactorRow = Factor & {
  unit: string; source: string; publisher: string; citation: string; verify_note?: string;
  approved_by?: string; approved_at?: string; created_by?: string;
};

// ponytail: reference data is small (~60 materials, a few hundred factor versions); loaded whole per request.
export const loadLibrary = cache(async () => {
  const [m, f, c] = await Promise.all([
    db.collection("materials").get(),
    db.collection("emission_factors").get(),
    db.collection("unit_conversions").get(),
  ]);
  const strip = <T,>(d: FirebaseFirestore.QueryDocumentSnapshot) => {
    const { created_at, updated_at, ...rest } = d.data(); // eslint-disable-line @typescript-eslint/no-unused-vars
    return { id: d.id, ...rest } as T;
  };
  return {
    materials: m.docs.map((d) => strip<MaterialRow>(d)).sort((a, b) => a.scope - b.scope || a.name.localeCompare(b.name)),
    factors: f.docs.map((d) => strip<FactorRow>(d)),
    conversions: c.docs.map((d) => strip<ConversionRow & { id: string; note?: string }>(d)),
  };
});
