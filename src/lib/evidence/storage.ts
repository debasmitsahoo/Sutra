// Object store for evidence files. ponytail: local disk (./storage, gitignored) for the localhost demo;
// swap these two functions for Firebase Storage (bucket.file(key).save / .download) to move to the cloud.
// Objects are write-once: an existing key is never overwritten.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.env.EVIDENCE_DIR ?? "storage");

function resolveKey(key: string) {
  const p = path.resolve(ROOT, key);
  if (!p.startsWith(ROOT + path.sep)) throw new Error("Invalid storage key");
  return p;
}

export async function putObject(key: string, bytes: Uint8Array) {
  const p = resolveKey(key);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, bytes, { flag: "wx" });
}

export const getObject = (key: string) => readFile(resolveKey(key));
