"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { addFactorVersionTx, dec, msg } from "@/lib/db/factors";
import { stageCreate, updateDoc } from "@/lib/db/write";
import { db } from "@/lib/firebase/admin";
import { UNITS } from "@/lib/ghg/units";

export type FormState = { error?: string; ok?: string };

export async function addFactorVersion(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(["group_admin", "company_admin"]);
  try {
    const plan = await addFactorVersionTx(user, Object.fromEntries(form));
    revalidatePath("/factors", "layout");
    return { ok: `Saved v${plan.version} as draft${plan.close ? `; previous version now ends ${plan.close.valid_to}` : ""}. A group admin must approve it.` };
  } catch (e) {
    return { error: msg(e) };
  }
}

export async function approveFactor(id: string): Promise<FormState> {
  const user = await requireUser(["group_admin"]);
  try {
    const snap = await db.collection("emission_factors").doc(id).get();
    if (snap.data()?.status !== "draft") throw new Error("Only draft factors can be approved");
    await updateDoc(user, "emission_factors", id, { status: "approved", approved_by: user.email, approved_at: new Date().toISOString() });
    revalidatePath("/factors", "layout");
    return { ok: "Approved" };
  } catch (e) {
    return { error: msg(e) };
  }
}

const csv = (v: FormDataEntryValue | null) => String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export async function addMaterial(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(["group_admin"]);
  try {
    const code = String(form.get("code") ?? "").trim().toUpperCase();
    const exists = await db.collection("materials").doc(code).get();
    if (exists.exists) throw new Error(`${code} already exists`);
    const base = String(form.get("base_unit"));
    const ar5 = form.get("gwp_ar5"), ar6 = form.get("gwp_ar6");
    await db.runTransaction(async (tx) =>
      stageCreate(tx, user, "materials", {
        code, name: form.get("name"), scope: Number(form.get("scope")), categories: form.getAll("categories"),
        base_unit: base, units: [...new Set([base, ...csv(form.get("units"))])],
        ncv_gj_per_unit: String(form.get("ncv_gj_per_unit") ?? "").trim() || undefined,
        is_renewable: form.get("is_renewable") === "on",
        gwp: ar5 || ar6 ? { ...(ar5 ? { AR5: Number(ar5) } : {}), ...(ar6 ? { AR6: Number(ar6) } : {}) } : undefined,
        help: String(form.get("help") ?? "").trim() || undefined,
      }, code),
    );
    revalidatePath("/factors", "layout");
    return { ok: `Added ${code}. Now add its first factor version.` };
  } catch (e) {
    return { error: msg(e) };
  }
}

export async function addConversion(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(["group_admin"]);
  try {
    const unit = z.enum(UNITS);
    const c = z.object({ from_unit: unit, to_unit: unit, factor: dec, material_id: z.string().transform((v) => v || undefined) }).parse(Object.fromEntries(form));
    if (c.from_unit === c.to_unit) throw new Error("Pick two different units");
    const id = `${c.from_unit}-${c.to_unit}${c.material_id ? `-${c.material_id}` : ""}`;
    await db.runTransaction(async (tx) => stageCreate(tx, user, "unit_conversions", c, id));
    revalidatePath("/factors", "layout");
    return { ok: `Added 1 ${c.from_unit} = ${c.factor} ${c.to_unit}` };
  } catch (e) {
    return { error: (e as { code?: number }).code === 6 ? "That conversion already exists" : msg(e) };
  }
}
