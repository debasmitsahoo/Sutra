"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { msg } from "@/lib/db/factors";
import { DOC_TYPES, type DocType } from "@/lib/evidence/doc-types";
import { deleteEvidence, describeDuplicates, unlinkEvidence, updateEvidenceMeta, type DuplicateInfo } from "@/lib/evidence/service";

export type MetaState = { error?: string; ok?: string; duplicates?: DuplicateInfo[] };

const blank = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const Meta = z.object({
  doc_type: z.enum(Object.keys(DOC_TYPES) as [DocType]),
  doc_number: z.preprocess(blank, z.string().max(60).optional()),
  doc_date: z.preprocess(blank, z.iso.date().optional()),
  vendor: z.preprocess(blank, z.string().max(120).optional()),
  amount_inr: z.preprocess((v) => blank(v)?.replace(/,/g, ""), z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a number").optional()),
});

export async function saveMeta(_: MetaState, form: FormData): Promise<MetaState> {
  const user = await requireUser();
  try {
    const dups = await updateEvidenceMeta(user, String(form.get("id")), Meta.parse(Object.fromEntries(form)));
    revalidatePath("/evidence", "layout");
    return { ok: "Saved", duplicates: await describeDuplicates(user, dups) };
  } catch (e) {
    return { error: msg(e) };
  }
}

export async function unlink(linkId: string) {
  const user = await requireUser();
  try {
    await unlinkEvidence(user, linkId);
    revalidatePath("/evidence", "layout");
    return {};
  } catch (e) {
    return { error: msg(e) };
  }
}

export async function remove(_: MetaState, form: FormData): Promise<MetaState> {
  const user = await requireUser();
  try {
    await deleteEvidence(user, String(form.get("id")), String(form.get("reason") ?? ""));
  } catch (e) {
    return { error: msg(e) };
  }
  revalidatePath("/evidence", "layout");
  return { ok: "Deleted" };
}
