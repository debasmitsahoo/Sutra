"use client";
import { useActionState, useState } from "react";
import { Check, Pencil } from "lucide-react";
import { InlineError } from "@/components/ui";
import { renameNode } from "../actions";

export function RenameNode({ id, name }: { id: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(async (prev: unknown, f: FormData) => {
    const r = await renameNode(prev, f);
    if (r.ok) setEditing(false);
    return r;
  }, {});

  if (!editing)
    return (
      <button onClick={() => setEditing(true)} className="group flex max-w-full items-center gap-1.5 text-left text-sm font-medium">
        <span className="truncate">{name}</span>
        <Pencil className="size-3 shrink-0 text-muted opacity-0 group-hover:opacity-100" />
      </button>
    );

  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <input name="name" defaultValue={name} autoFocus className="h-7 py-0 text-sm" onKeyDown={(e) => e.key === "Escape" && setEditing(false)} />
      <button disabled={pending} className="grid size-7 place-items-center rounded-md bg-accent text-white" aria-label="Save">
        <Check className="size-3.5" />
      </button>
      {state.error && <InlineError>{state.error}</InlineError>}
    </form>
  );
}
