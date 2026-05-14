"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/auth-client";
import { describeAuthClientError } from "@/lib/auth-client-errors";

export function RegisterForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }
    if (password !== password2) {
      setError("Hasła muszą być takie same.");
      return;
    }
    start(async () => {
      const res = await signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      if (res.error) {
        const raw = describeAuthClientError(res.error);
        const lower = raw.toLowerCase();
        if (lower.includes("already") || lower.includes("unique") || lower.includes("exists")) {
          setError("Ten adres e-mail jest już zarejestrowany.");
        } else if (lower.includes("origin") || lower.includes("forbidden") || lower.includes("csrf")) {
          setError(
            "Odrzucono żądanie (origin / CSRF). Używaj tego samego adresu co w BETTER_AUTH_URL (np. localhost vs 127.0.0.1) albo dopisz origin do BETTER_AUTH_TRUSTED_ORIGINS.",
          );
        } else {
          setError(raw || "Rejestracja nie powiodła się.");
        }
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <AuthShell title="Rejestracja" subtitle="Tworzysz nową organizację — zostaniesz jej administratorem.">
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <div className="space-y-2">
          <Label htmlFor="name">Imię i nazwisko</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
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
        <div className="space-y-2">
          <Label htmlFor="password">Hasło</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password2">Potwierdź hasło</Label>
          <Input
            id="password2"
            type="password"
            required
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Tworzenie konta…" : "Utwórz konto"}
        </Button>
        <p className="text-muted-foreground text-center text-sm">
          Masz już konto?{" "}
          <Link href="/logowanie" className="text-foreground font-medium underline underline-offset-4">
            Zaloguj się
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
