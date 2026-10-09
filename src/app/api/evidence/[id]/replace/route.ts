import { getUser } from "@/lib/auth";
import { replaceEvidence } from "@/lib/evidence/service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Sign in again" }, { status: 401 });
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose a file" }, { status: 400 });
  try {
    const id = await replaceEvidence(user, (await params).id, { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
    return Response.json({ id });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Replace failed" }, { status: 400 });
  }
}
