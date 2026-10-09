"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { inMemoryPersistence, setPersistence, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { clientAuth } from "@/lib/firebase/client";
import { Button, InlineError } from "@/components/ui";
import { login } from "../actions";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      // The browser only exchanges the password for an ID token; the server holds the session.
      await setPersistence(clientAuth, inMemoryPersistence);
      const cred = await signInWithEmailAndPassword(clientAuth, String(f.get("email")), String(f.get("password")));
      const res = await login(await cred.user.getIdToken());
      await signOut(clientAuth);
      if (res.error) {
        setError(res.error);
        return setBusy(false);
      }
      router.replace("/"); // keep the spinner until the dashboard has loaded
      router.refresh();
    } catch {
      setError("Incorrect email or password.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-muted">Use your MEIL work account.</p>
      <div className="mt-8 space-y-4">
        <div className="grid gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" required autoFocus />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {error && <InlineError>{error}</InlineError>}
        <Button type="submit" disabled={busy} className="w-full py-2.5">
          {busy && <Loader2 className="size-4 animate-spin" />} Sign in
        </Button>
      </div>
    </form>
  );
}
