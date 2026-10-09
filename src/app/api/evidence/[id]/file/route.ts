// Downloads are never public: every request needs a valid session and the file must be in the user's scope.
import { getUser } from "@/lib/auth";
import { getObject } from "@/lib/evidence/storage";
import { db } from "@/lib/firebase/admin";

const INLINE = /^(application\/pdf|image\/(png|jpeg|webp))$/;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Sign in again", { status: 401 });
  const doc = (await db.collection("evidence_files").doc((await params).id).get()).data();
  if (!doc || !(doc.node_path as string[]).includes(user.node)) return new Response("Not found", { status: 404 });
  const bytes = await getObject(doc.storage_key);
  const inline = INLINE.test(doc.mime) && !new URL(req.url).searchParams.has("download");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(doc.original_name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=300",
    },
  });
}
