"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authFetch } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        const origin =
          typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL ?? "";
        await authFetch("/request-password-reset", {
          method: "POST",
          body: {
            email: email.trim(),
            redirectTo: `${origin.replace(/\/$/, "")}/reset-hasla`,
          },
        });
        setDone(true);
      } catch {
        setError("Nie udało się wysłać żądania. Spróbuj ponownie.");
      }
    });
  }

  if (done) {
    return (
      <AuthShell
        title="Sprawdź skrzynkę"
        subtitle="Jeśli konto istnieje, wysłaliśmy instrukcję resetu hasła (w trybie deweloperskim link może pojawić się w logu serwera)."
      >
        <Button asChild variant="outline" className="w-full">
          <Link href="/logowanie">Wróć do logowania</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Zapomniane hasło" subtitle="Wyślemy link do ustawienia nowego hasła.">
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Wysyłanie…" : "Wyślij link"}
        </Button>
        <p className="text-muted-foreground text-center text-sm">
          <Link href="/logowanie" className="underline underline-offset-4">
            Wróć do logowania
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
