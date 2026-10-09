import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { adminAuth, db } from "@/lib/firebase/admin";
import { visibleNodes } from "@/lib/db/read";
import { Role } from "@/lib/db/schema";
import type { Actor } from "@/lib/db/write";

export const SESSION_COOKIE = "session";
export type SessionUser = Actor & { name: string };

// Role and node live in Firebase custom claims (set by scripts/seed.ts or user admin).
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    const t = await adminAuth.verifySessionCookie(cookie, true);
    const role = Role.safeParse(t.role);
    if (!role.success || typeof t.node !== "string") return null;
    return { uid: t.uid, email: t.email ?? "", name: (t.name as string) ?? t.email ?? "User", role: role.data, node: t.node };
  } catch {
    return null;
  }
});

export async function requireUser(roles?: Role[]) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/");
  return user;
}

// Current FY + node selection (top bar), validated against what the user may see.
export const getScope = cache(async (user: SessionUser) => {
  const jar = await cookies();
  const [nodes, fySnap] = await Promise.all([
    visibleNodes(user),
    db.collection("financial_years").orderBy("start", "desc").get(),
  ]);
  const fys = fySnap.docs.map((d) => ({ id: d.id, label: d.data().label as string }));
  const node = nodes.find((n) => n.id === jar.get("node")?.value) ?? nodes.find((n) => n.id === user.node) ?? nodes[0];
  const fy = fys.find((f) => f.id === jar.get("fy")?.value) ?? fys[0];
  return { nodes, node, fys, fy };
});
