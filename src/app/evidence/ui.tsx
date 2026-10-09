"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, FileText, Loader2, RefreshCw, Trash2, Unlink, X } from "lucide-react";
import { FileDropzone } from "@/components/FileDropzone";
import { Button, Card, InlineError } from "@/components/ui";
import { ACCEPT, DOC_TYPES } from "@/lib/evidence/doc-types";
import type { DuplicateInfo, UploadResult } from "@/lib/evidence/service";
import { fmtNum } from "@/lib/format";
import { remove, saveMeta, unlink, type MetaState } from "./actions";

export function DuplicateNotice({ duplicates }: { duplicates?: DuplicateInfo[] }) {
  if (!duplicates?.length) return null;
  return (
    <div className="flex gap-2 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-800 ring-1 ring-inset ring-orange-200">
      <AlertTriangle className="mt-px size-3.5 shrink-0" />
      <div className="space-y-0.5">
        {duplicates.map((d) => (
          <div key={d.id + d.reason}>
            <b>{d.reason === "same_file" ? "Same file" : "Same vendor + bill number"}</b>{" "}
            {d.hidden ? (
              "as a file in another project."
            ) : (
              <>
                as <Link href={`/evidence/${d.id}`} className="underline">{d.name}</Link> ({d.project}) uploaded by {d.by}
                {d.at ? ` on ${d.at}` : ""}.
              </>
            )}
          </div>
        ))}
        <div className="text-orange-700/80">If this is the same bill, delete one copy so it is not counted twice.</div>
      </div>
    </div>
  );
}

type Meta = { doc_type?: string; doc_number?: string; doc_date?: string; vendor?: string; amount_inr?: string };

export function MetaForm({ id, meta, vendors, compact, readOnly }: { id: string; meta: Meta; vendors: string[]; compact?: boolean; readOnly?: boolean }) {
  const [state, action, pending] = useActionState(saveMeta, {} as MetaState);
  const grid = compact ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2";
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <fieldset disabled={readOnly} className={`grid gap-2 ${grid}`}>
        <label className="col-span-2 grid min-w-0 gap-1 text-xs sm:col-span-1">
          <span className="font-medium text-muted">Document type</span>
          <select name="doc_type" defaultValue={meta.doc_type ?? "other"} className="w-full">
            {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-xs">
          <span className="font-medium text-muted">Vendor</span>
          <input name="vendor" defaultValue={meta.vendor} list={`vendors-${id}`} autoComplete="off" className="w-full" />
          <datalist id={`vendors-${id}`}>{vendors.map((v) => <option key={v} value={v} />)}</datalist>
        </label>
        <label className="grid min-w-0 gap-1 text-xs">
          <span className="font-medium text-muted">Bill / doc no.</span>
          <input name="doc_number" defaultValue={meta.doc_number} className="num w-full" />
        </label>
        <label className="grid min-w-0 gap-1 text-xs">
          <span className="font-medium text-muted">Bill date</span>
          <input type="date" name="doc_date" defaultValue={meta.doc_date} className="w-full" />
        </label>
        <label className="grid min-w-0 gap-1 text-xs">
          <span className="font-medium text-muted">Amount ₹</span>
          <input name="amount_inr" defaultValue={meta.amount_inr} inputMode="decimal" className="num w-full" />
        </label>
      </fieldset>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" disabled={pending} className="py-1.5">
            {pending && <Loader2 className="size-3.5 animate-spin" />} Save details
          </Button>
          {state.ok && <span className="flex items-center gap-1 text-xs text-accent"><CheckCircle2 className="size-3.5" /> {state.ok}</span>}
          {state.error && <InlineError>{state.error}</InlineError>}
        </div>
      )}
      <DuplicateNotice duplicates={state.duplicates} />
    </form>
  );
}

export function UploadPanel({ projects, defaultProject, vendors, closeHref }: {
  projects: { id: string; name: string }[]; defaultProject: string; vendors: string[]; closeHref: string;
}) {
  const router = useRouter();
  const [project, setProject] = useState(defaultProject);
  const [busy, setBusy] = useState<string[]>([]);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState("");

  async function upload(files: File[]) {
    if (!files.length) return;
    if (!project) return setError("Choose the project these files belong to first.");
    setError("");
    setBusy(files.map((f) => f.name));
    const body = new FormData();
    body.set("project_id", project);
    files.forEach((f) => body.append("files", f));
    try {
      const res = await fetch("/api/evidence", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Upload failed");
      else setResults((r) => [...json.results, ...r]);
      router.refresh();
    } catch {
      setError("Upload failed — check your connection and try again.");
    } finally {
      setBusy([]);
    }
  }

  return (
    <Card className="mb-6 w-full p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-semibold">Upload evidence</h2>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-muted">Project</span>
          <select value={project} onChange={(e) => (setProject(e.target.value), setError(""))} className={`max-w-72 ${project ? "" : "border-warn"}`}>
            <option value="" disabled>Choose a project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <Link href={closeHref} className="rounded-md p-1 text-muted hover:bg-bg" aria-label="Close upload panel">
          <X className="size-4" />
        </Link>
      </div>
      <FileDropzone onFiles={upload} accept={ACCEPT} />
      <p className="mt-2 text-xs text-muted">Up to 15 MB each, 20 files at a time. Files are checked by content, hashed and stored under a unique name.</p>
      {error && <InlineError>{error}</InlineError>}
      {(busy.length > 0 || results.length > 0) && (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
          {busy.map((n) => (
            <li key={n} className="flex items-center gap-3 px-4 py-3 text-sm">
              <Loader2 className="size-4 animate-spin text-accent" /> {n}
            </li>
          ))}
          {results.map((r, i) => (
            <li key={(r.id ?? r.name) + i} className="space-y-3 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                {r.error ? <AlertTriangle className="size-4 text-danger" /> : <CheckCircle2 className="size-4 text-accent" />}
                <span className="font-medium">{r.name}</span>
                {r.id && <Link href={`/evidence/${r.id}`} className="ml-auto text-xs font-medium text-accent hover:underline">Open</Link>}
              </div>
              {r.error && <InlineError>{r.error}</InlineError>}
              <DuplicateNotice duplicates={r.duplicates} />
              {r.id && <MetaForm id={r.id} meta={{}} vendors={vendors} compact />}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function ReplaceButton({ id }: { id: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function onFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    const body = new FormData();
    body.set("file", file);
    const res = await fetch(`/api/evidence/${id}/replace`, { method: "POST", body });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error);
    router.push(`/evidence/${json.id}`);
  }
  return (
    <div>
      <Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Replace with new version
      </Button>
      <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {error && <InlineError>{error}</InlineError>}
    </div>
  );
}

export function DeleteForm({ id, links }: { id: string; links: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (p: MetaState, f: FormData) => {
    const r = await remove(p, f);
    if (r.ok) router.push("/evidence");
    return r;
  }, {});
  if (!open)
    return (
      <Button variant="ghost" onClick={() => setOpen(true)} className="text-danger hover:bg-red-50 hover:text-danger">
        <Trash2 className="size-4" /> Delete
      </Button>
    );
  return (
    <form action={action} className="w-full space-y-2 rounded-xl bg-red-50 p-4">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm font-medium text-red-800">Delete this file?</p>
      <p className="text-xs text-red-700">
        It stays in the audit trail and can be reviewed, but is no longer usable as evidence.
        {links > 0 && ` It will be unlinked from ${links} record${links > 1 ? "s" : ""}, which will then need new evidence.`}
      </p>
      <textarea name="reason" required minLength={5} rows={2} placeholder="Reason (required), e.g. duplicate scan of bill INV-0071" className="w-full" />
      {state.error && <InlineError>{state.error}</InlineError>}
      <div className="flex gap-2">
        <Button disabled={pending} className="bg-danger hover:bg-red-700">{pending && <Loader2 className="size-4 animate-spin" />} Delete file</Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}

export function UnlinkButton({ linkId }: { linkId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <>
      <button
        disabled={pending}
        onClick={() => start(async () => setError((await unlink(linkId)).error ?? ""))}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-bg hover:text-danger"
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : <Unlink className="size-3" />} Unlink
      </button>
      {error && <InlineError>{error}</InlineError>}
    </>
  );
}

export function FileIcon({ mime, size }: { mime: string; size: number }) {
  const label = mime.includes("pdf") ? "PDF" : mime.startsWith("image/") ? "IMG" : mime.includes("sheet") || mime.includes("excel") || mime.includes("csv") ? "XLS" : "DOC";
  const tone = { PDF: "bg-red-50 text-red-600", IMG: "bg-blue-50 text-blue-600", XLS: "bg-emerald-50 text-emerald-600", DOC: "bg-slate-100 text-slate-600" }[label];
  return (
    <span className={`grid size-10 shrink-0 place-items-center rounded-lg text-[10px] font-bold ${tone}`} title={`${fmtNum(size / 1024, 0)} KB`}>
      <FileText className="size-4" />
      {label}
    </span>
  );
}
