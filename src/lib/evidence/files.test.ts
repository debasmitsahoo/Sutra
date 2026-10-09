import { describe, expect, it } from "vitest";
import { ACCEPT } from "./doc-types";
import { checkFile, docKey, MAX_BYTES, sha256, storageKey } from "./files";

const pdf = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n");
const P1 = ["MEIL-GRP", "MEIL-LTD", "BU-IRR", "P-IRR-01"];
const P2 = ["MEIL-GRP", "MEIL-LTD", "BU-IRR", "P-IRR-02"];

describe("evidence files", () => {
  it("two users uploading file1.pdf get different keys; the name is not in the key", () => {
    const at = new Date("2026-05-14T10:00:00Z");
    const a = storageKey(P1, "pdf", at);
    const b = storageKey(P2, "pdf", at);
    const c = storageKey(P1, "pdf", at);
    expect(a).toMatch(/^evidence\/MEIL-LTD\/P-IRR-01\/2026\/05\/[0-9a-f-]{36}\.pdf$/);
    expect(new Set([a, b, c]).size).toBe(3);
    expect(a).not.toContain("file1");
  });

  it("accepts real files and rejects renamed or oversized ones", () => {
    expect(checkFile("Bill.PDF", pdf)).toEqual({ ext: "pdf", mime: "application/pdf" });
    expect(checkFile("photo.jpeg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toEqual({ ext: "jpg", mime: "image/jpeg" });
    expect(() => checkFile("virus.pdf", new Uint8Array([0x4d, 0x5a, 0x90]))).toThrow(/does not look like/);
    expect(() => checkFile("run.exe", new Uint8Array([0x4d, 0x5a]))).toThrow(/not allowed/);
    expect(() => checkFile("big.pdf", new Uint8Array(MAX_BYTES + 1))).toThrow(/larger/);
    expect(() => checkFile("empty.pdf", new Uint8Array())).toThrow(/empty/);
  });

  it("the upload picker accepts exactly the types the server allows", () => {
    for (const ext of ACCEPT.split(",")) expect(() => checkFile(`x${ext}`, new Uint8Array([1]))).not.toThrow(/not allowed/);
  });

  it("the same bill hashes the same; vendor + number match ignores case and punctuation", () => {
    expect(sha256(pdf)).toBe(sha256(new Uint8Array(pdf)));
    expect(sha256(pdf)).toMatch(/^[0-9a-f]{64}$/);
    expect(docKey("ABC Fuels Pvt. Ltd", "INV-001")).toBe(docKey("abc fuels pvt ltd", "inv 001"));
    expect(docKey("ABC Fuels", "")).toBeUndefined();
  });
});
