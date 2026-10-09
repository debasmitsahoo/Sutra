// Pure evidence-file rules: allowed types (checked by content, not just the name), size limit,
// collision-proof storage keys and the vendor + document-number duplicate key.
import { createHash, randomUUID } from "node:crypto";

export const MAX_BYTES = 15 * 1024 * 1024;

export { DOC_TYPES, type DocType, ACCEPT } from "./doc-types";

const starts = (b: Uint8Array, sig: number[], at = 0) => sig.every((x, i) => b[at + i] === x);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

// Extension -> served MIME type and a content signature check.
const TYPES: Record<string, { mime: string; ok: (b: Uint8Array) => boolean }> = {
  pdf: { mime: "application/pdf", ok: (b) => starts(b, ascii("%PDF-")) },
  png: { mime: "image/png", ok: (b) => starts(b, [0x89, 0x50, 0x4e, 0x47]) },
  jpg: { mime: "image/jpeg", ok: (b) => starts(b, [0xff, 0xd8, 0xff]) },
  jpeg: { mime: "image/jpeg", ok: (b) => starts(b, [0xff, 0xd8, 0xff]) },
  webp: { mime: "image/webp", ok: (b) => starts(b, ascii("RIFF")) && starts(b, ascii("WEBP"), 8) },
  heic: { mime: "image/heic", ok: (b) => starts(b, ascii("ftyp"), 4) },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ok: (b) => starts(b, [0x50, 0x4b, 0x03, 0x04]) },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ok: (b) => starts(b, [0x50, 0x4b, 0x03, 0x04]) },
  xls: { mime: "application/vnd.ms-excel", ok: (b) => starts(b, [0xd0, 0xcf, 0x11, 0xe0]) },
  doc: { mime: "application/msword", ok: (b) => starts(b, [0xd0, 0xcf, 0x11, 0xe0]) },
  csv: { mime: "text/csv", ok: (b) => !b.subarray(0, 4096).includes(0) },
};

/** Validate a file by size, extension and magic bytes. Returns the extension and MIME type to serve. */
export function checkFile(name: string, bytes: Uint8Array): { ext: string; mime: string } {
  if (bytes.length === 0) throw new Error("File is empty");
  if (bytes.length > MAX_BYTES) throw new Error(`File is larger than ${MAX_BYTES / 1024 / 1024} MB`);
  const ext = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  const t = TYPES[ext];
  if (!t) throw new Error(`.${ext || "?"} files are not allowed. Use PDF, images, Excel, Word or CSV.`);
  if (!t.ok(bytes)) throw new Error(`The content does not look like a real .${ext} file`);
  return { ext: ext === "jpeg" ? "jpg" : ext, mime: t.mime };
}

export const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/**
 * evidence/{company}/{project}/{yyyy}/{mm}/{uuid}.{ext}. The user's file name is never part of the key,
 * so two users uploading "file1.pdf" can never collide; the original name is kept as metadata.
 */
export function storageKey(nodePath: string[], ext: string, at = new Date(), uuid: string = randomUUID()) {
  const [, company = "none", , project = nodePath.at(-1)!] = nodePath;
  const mm = String(at.getUTCMonth() + 1).padStart(2, "0");
  return `evidence/${company}/${project}/${at.getUTCFullYear()}/${mm}/${uuid}.${ext}`;
}

/** Normalised vendor + document number, so "ABC Fuels Pvt. Ltd" / "INV-001" matches "abc fuels pvt ltd" / "inv 001". */
export function docKey(vendor?: string, docNumber?: string) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!vendor?.trim() || !docNumber?.trim()) return undefined;
  return `${norm(vendor)}|${norm(docNumber)}`;
}
