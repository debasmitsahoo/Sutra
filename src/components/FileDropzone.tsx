"use client";
import { useRef, useState } from "react";
import { Camera, UploadCloud } from "lucide-react";

// Native drag-drop + file input; the camera input opens the phone camera for bill photos.
export function FileDropzone({
  onFiles,
  accept = "application/pdf,image/*,.xlsx,.xls,.csv,.doc,.docx",
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => (onFiles(Array.from(e.target.files ?? [])), (e.target.value = ""));
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      onDragOver={(e) => (e.preventDefault(), setOver(true))}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
        over ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent/50 hover:bg-slate-50"
      }`}
    >
      <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
        <UploadCloud className="size-6" />
      </span>
      <div className="mt-3 text-sm">
        <span className="font-medium text-accent">Click to upload</span> <span className="text-muted">or drag and drop</span>
      </div>
      <div className="mt-1 text-xs text-muted">Bills, invoices, log sheets · PDF, images, Excel, Word</div>
      <button
        type="button"
        onClick={(e) => (e.stopPropagation(), camera.current?.click())}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-xs hover:bg-bg sm:hidden"
      >
        <Camera className="size-4" /> Take photo of bill
      </button>
      <input ref={input} type="file" multiple accept={accept} className="hidden" onChange={pick} />
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
    </div>
  );
}
