// Adding a factor version: validate, plan (pure, lib/ghg/factors.ts), then close the previous version and
// create the new draft in ONE audited transaction. Shared by the server action and scripts/check-factors.ts.
import { z } from "zod";
import { GwpSet } from "./schema";
import { stageCreate, stageUpdate, type Actor } from "./write";
import { db } from "@/lib/firebase/admin";
import { planNewVersion, type Factor } from "@/lib/ghg/factors";

export const dec = z.string().trim().regex(/^\d+(\.\d+)?$/, "Enter a number");
// Blank or absent (field hidden in the other entry mode) both mean "not given".
const optDec = z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : undefined), dec.optional());
const date = z.iso.date("Pick a date");
export const msg = (e: unknown) => (e instanceof z.ZodError ? e.issues.map((i) => `${i.path.join(".") || "field"}: ${i.message}`).join(" · ") : e instanceof Error ? e.message : "Could not save");

export const VersionInput = z
  .object({
    material_id: z.string().min(1),
    region: z.string().trim().toUpperCase().regex(/^([A-Z]{2}|GLOBAL)$/, "Use a 2-letter country code or GLOBAL"),
    valid_from: date,
    valid_to: z.preprocess((v) => (typeof v === "string" && v ? v : null), date.nullable()),
    gwp_set: GwpSet,
    mode: z.enum(["gases", "co2e"]),
    co2: optDec, ch4: optDec, n2o: optDec, other: optDec, co2e: optDec,
    source: z.string().trim().min(2, "Source is required"),
    publisher: z.string().trim().min(2, "Publisher is required"),
    citation: z.string().trim().min(2, "Citation is required"),
  })
  .refine((v) => (v.mode === "co2e" ? v.co2e : v.co2 ?? v.ch4 ?? v.n2o ?? v.other), "Enter at least one emission value");

export async function addFactorVersionTx(actor: Actor, raw: Record<string, unknown>) {
  const v = VersionInput.parse(raw);
  const material = await db.collection("materials").doc(v.material_id).get();
  if (!material.exists) throw new Error("Unknown material");
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(db.collection("emission_factors").where("material_id", "==", v.material_id));
    const existing = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Factor);
    const plan = planNewVersion(existing, v);
    if (plan.close) {
      const prev = snap.docs.find((d) => d.id === plan.close!.id)!;
      stageUpdate(tx, actor, "emission_factors", prev.id, prev.data(), { valid_to: plan.close.valid_to });
    }
    stageCreate(tx, actor, "emission_factors", {
      material_id: v.material_id, region: v.region, unit: material.data()!.base_unit,
      gases: v.mode === "co2e" ? { co2: "0", ch4: "0", n2o: "0" } : { co2: v.co2 ?? "0", ch4: v.ch4 ?? "0", n2o: v.n2o ?? "0", other: v.other },
      co2e: v.mode === "co2e" ? v.co2e : undefined,
      gwp_set: v.gwp_set, valid_from: v.valid_from, valid_to: v.valid_to, version: plan.version,
      source: v.source, publisher: v.publisher, citation: v.citation, status: "draft", created_by: actor.email,
    }, `${v.material_id}-${v.region}-v${plan.version}`);
    return plan;
  });
}
