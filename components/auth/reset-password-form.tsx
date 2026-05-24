"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/src/modules/auth/supabase/client";
import { isSupabaseAuthConfigured } from "@/src/modules/auth/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = React.useState(false);
  const [hasSession, setHasSession] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!isSupabaseAuthConfigured()) {
      setError("Supabase Auth nie jest skonfigurowany.");
      setReady(true);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      if (!data.session) {
        setError("Link wygasł lub sesja nie została ustanowiona. Wyślij link resetu ponownie.");
      }
      setReady(true);
    });
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (password.length < 8) {
      setError("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }
    if (password !== confirm) {
      setError("Hasła nie są identyczne.");
      return;
    }
    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      router.push("/logowanie?reset=1");
      router.refresh();
    } catch {
      setError("Nie udało się ustawić hasła.");
    } finally {
      setPending(false);
    }
  }

  if (!ready) {
    return <p className="text-muted-foreground text-sm">Ładowanie…</p>;
  }

  if (!hasSession) {
    return (
      <div className="space-y-3">
        <p className="text-destructive text-sm">{error}</p>
        <Link href="/zapomniane-haslo" className="text-sm font-medium underline">
          Wyślij nowy link resetu
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nowe hasło</Label>
        <Input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Powtórz hasło</Label>
        <Input id="confirm" name="confirm" type="password" minLength={8} required autoComplete="new-password" />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Zapisywanie…" : "Ustaw hasło"}
      </Button>
    </form>
  );
}
