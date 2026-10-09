"use client";
import { useRef, useState } from "react";

// Native drag-drop + file input; `capture` lets mobile open the camera for bill photos.
export function FileDropzone({
  onFiles,
  accept = "application/pdf,image/*,.xlsx,.xls,.csv,.doc,.docx",
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
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
      className={`cursor-pointer border border-dashed px-6 py-8 text-center text-sm ${
        over ? "border-accent bg-accent/5 text-accent" : "border-line bg-surface text-muted"
      }`}
    >
      <div className="text-ink">Drop bills, invoices or log sheets here</div>
      <div className="mt-1 text-xs">or click to browse · PDF, images, Excel, Word</div>
      <input
        ref={input}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => (onFiles(Array.from(e.target.files ?? [])), (e.target.value = ""))}
      />
    </div>
  );
}
