import { getUser } from "@/lib/auth";
import { uploadEvidence } from "@/lib/evidence/service";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Sign in again" }, { status: 401 });
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) return Response.json({ error: "No files" }, { status: 400 });
  if (files.length > 20) return Response.json({ error: "Upload at most 20 files at a time" }, { status: 400 });
  try {
    const results = await uploadEvidence(
      user,
      String(form.get("project_id") ?? ""),
      await Promise.all(files.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) }))),
    );
    return Response.json({ results });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
