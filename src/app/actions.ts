"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminAuth, db } from "@/lib/firebase/admin";
import { getScope, getUser, requireUser, SESSION_COOKIE } from "@/lib/auth";
import { Role } from "@/lib/db/schema";
import { audit, updateDoc } from "@/lib/db/write";

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export async function login(idToken: string): Promise<{ error?: string }> {
  try {
    const t = await adminAuth.verifyIdToken(idToken, true);
    if (Date.now() / 1000 - t.auth_time > 5 * 60) return { error: "Please sign in again." };
    const role = Role.safeParse(t.role);
    if (!role.success || typeof t.node !== "string") return { error: "Your account has no role assigned. Contact your admin." };
    const session = await adminAuth.createSessionCookie(idToken, { expiresIn: FIVE_DAYS_MS });
    (await cookies()).set(SESSION_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: FIVE_DAYS_MS / 1000,
      path: "/",
    });
    const actor = { uid: t.uid, email: t.email ?? "", role: role.data, node: t.node };
    await db.runTransaction(async (tx) => audit(tx, actor, "login", "auth", t.uid, [t.node]));
    return {};
  } catch {
    return { error: "Sign-in failed. Check your email and password." };
  }
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete("node");
  redirect("/login");
}

export async function setScope(kind: "node" | "fy", value: string) {
  const user = await getUser();
  if (!user) redirect("/login");
  const scope = await getScope(user);
  const ok = kind === "node" ? scope.nodes.some((n) => n.id === value) : scope.fys.some((f) => f.id === value);
  if (ok) (await cookies()).set(kind, value, { path: "/", sameSite: "lax", httpOnly: true });
  revalidatePath("/", "layout");
}

export async function renameNode(_: unknown, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser(["company_admin", "group_admin"]);
  const input = z.object({ id: z.string().min(1), name: z.string().trim().min(2).max(120) }).safeParse({
    id: form.get("id"),
    name: form.get("name"),
  });
  if (!input.success) return { error: "Name must be 2–120 characters." };
  try {
    await updateDoc(user, "org_nodes", input.data.id, { name: input.data.name });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
