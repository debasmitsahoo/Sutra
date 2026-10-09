"use client";
import { useActionState, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Plus } from "lucide-react";
import { Button, Card, InlineError } from "@/components/ui";
import { GHG_CATEGORIES } from "@/lib/db/schema";
import { UNITS } from "@/lib/ghg/units";
import { addConversion, addFactorVersion, addMaterial, approveFactor, type FormState } from "./actions";

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <label className="grid min-w-0 gap-1 text-sm [&>input]:w-full [&>select]:w-full [&>textarea]:w-full">
    <span className="font-medium">{label}</span>
    {children}
    {hint && <span className="text-xs text-muted">{hint}</span>}
  </label>
);

function Result({ state }: { state: FormState }) {
  if (state.error) return <InlineError>{state.error}</InlineError>;
  if (state.ok)
    return (
      <p className="flex items-start gap-1.5 text-xs text-accent">
        <CheckCircle2 className="mt-px size-3.5 shrink-0" /> {state.ok}
      </p>
    );
  return null;
}

type Defaults = {
  region: string; gwp_set: string; mode: "gases" | "co2e"; co2: string; ch4: string; n2o: string; other: string; co2e: string;
  source: string; publisher: string; citation: string;
};

export function AddVersionForm({ materialId, baseUnit, hasGwp, defaults }: { materialId: string; baseUnit: string; hasGwp: boolean; defaults?: Defaults }) {
  const [state, action, pending] = useActionState(addFactorVersion, {});
  const [mode, setMode] = useState(defaults?.mode ?? "gases");
  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 font-semibold"><Plus className="size-4 text-accent" /> Add new version</h2>
      <p className="mt-1 text-xs text-muted">The current version is kept and ends the day before the new one starts.</p>
      <form action={action} className="mt-4 grid gap-3">
        <input type="hidden" name="material_id" value={materialId} />
        <input type="hidden" name="mode" value={mode} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Valid from"><input type="date" name="valid_from" required /></Field>
          <Field label="Valid to"><input type="date" name="valid_to" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Region"><input name="region" defaultValue={defaults?.region ?? "IN"} required /></Field>
          <Field label="GWP set">
            <select name="gwp_set" defaultValue={defaults?.gwp_set ?? "AR5"}>
              <option>AR5</option><option>AR6</option><option>AR4</option>
            </select>
          </Field>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs">
          {(["gases", "co2e"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`flex-1 rounded-md py-1 font-medium ${mode === m ? "bg-surface shadow-xs" : "text-muted"}`}>
              {m === "gases" ? "Gas-wise" : "Composite CO2e"}
            </button>
          ))}
        </div>
        {mode === "gases" ? (
          <div className="grid grid-cols-3 gap-2">
            {(["co2", "ch4", "n2o"] as const).map((g) => (
              <Field key={g} label={`${g.toUpperCase()} kg/${baseUnit}`}><input name={g} defaultValue={defaults?.[g]} inputMode="decimal" className="num" /></Field>
            ))}
            {hasGwp && <Field label={`Gas kg/${baseUnit}`}><input name="other" defaultValue={defaults?.other} inputMode="decimal" className="num" /></Field>}
          </div>
        ) : (
          <Field label={`kg CO2e per ${baseUnit}`}><input name="co2e" defaultValue={defaults?.co2e} inputMode="decimal" className="num" /></Field>
        )}
        <Field label="Source"><input name="source" defaultValue={defaults?.source} required /></Field>
        <Field label="Publisher"><input name="publisher" defaultValue={defaults?.publisher} required /></Field>
        <Field label="Citation" hint="Document, version, table and page."><textarea name="citation" rows={2} defaultValue={defaults?.citation} required /></Field>
        <Result state={state} />
        <Button disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Save as draft</Button>
      </form>
    </Card>
  );
}

export function ApproveButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>({});
  return (
    <div className="mt-4 flex items-center gap-3">
      <Button disabled={pending} onClick={() => start(async () => setState(await approveFactor(id)))}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Verified — approve
      </Button>
      <Result state={state} />
    </div>
  );
}

export function AddMaterialForm() {
  const [state, action, pending] = useActionState(addMaterial, {});
  return (
    <details className="group mb-6 rounded-2xl border border-line bg-surface shadow-xs">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 font-semibold">
        <Plus className="size-4 text-accent" /> Add material
      </summary>
      <form action={action} className="grid gap-3 border-t border-line p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Code" hint="e.g. COAL-G10"><input name="code" required className="num uppercase" /></Field>
        <Field label="Name"><input name="name" required /></Field>
        <Field label="Scope"><select name="scope"><option value="1">Scope 1</option><option value="2">Scope 2</option><option value="3">Scope 3</option></select></Field>
        <Field label="Base unit"><select name="base_unit">{UNITS.map((u) => <option key={u}>{u}</option>)}</select></Field>
        <Field label="Other entry units" hint="Comma separated, e.g. kL, t"><input name="units" /></Field>
        <Field label="Energy GJ per base unit" hint="For the BRSR energy table"><input name="ncv_gj_per_unit" inputMode="decimal" className="num" /></Field>
        <Field label="GWP AR5 / AR6" hint="Fugitive gases only">
          <div className="grid grid-cols-2 gap-2"><input name="gwp_ar5" inputMode="decimal" className="num" /><input name="gwp_ar6" inputMode="decimal" className="num" /></div>
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="is_renewable" className="size-4" /> Renewable source</label>
        <fieldset className="sm:col-span-2 lg:col-span-4">
          <legend className="mb-1 text-sm font-medium">Categories</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(GHG_CATEGORIES).map(([k, v]) => (
              <label key={k} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs has-checked:border-accent has-checked:bg-accent-soft has-checked:text-accent">
                <input type="checkbox" name="categories" value={k} className="sr-only" /> {v}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Help text for data entry"><input name="help" /></Field>
        <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-3">
          <Button disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Add material</Button>
          <Result state={state} />
        </div>
      </form>
    </details>
  );
}

export function AddConversionForm({ materials }: { materials: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(addConversion, {});
  return (
    <details className="mb-6 rounded-2xl border border-line bg-surface shadow-xs">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 font-semibold">
        <Plus className="size-4 text-accent" /> Add conversion
      </summary>
      <form action={action} className="grid items-end gap-3 border-t border-line p-5 sm:grid-cols-5">
        <Field label="1 ×"><select name="from_unit">{UNITS.map((u) => <option key={u}>{u}</option>)}</select></Field>
        <Field label="equals"><input name="factor" required inputMode="decimal" className="num" /></Field>
        <Field label="of"><select name="to_unit" defaultValue="kg">{UNITS.map((u) => <option key={u}>{u}</option>)}</select></Field>
        <Field label="Only for material" hint="Leave blank for all">
          <select name="material_id"><option value="">All materials</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
        </Field>
        <Button disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Add</Button>
        <div className="sm:col-span-5"><Result state={state} /></div>
      </form>
    </details>
  );
}
