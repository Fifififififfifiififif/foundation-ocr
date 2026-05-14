"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authFetch } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [pending, start] = useTransition();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Brak tokenu resetu. Użyj linku z wiadomości.");
      return;
    }
    if (password.length < 8) {
      setError("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }
    if (password !== password2) {
      setError("Hasła muszą być takie same.");
      return;
    }
    start(async () => {
      try {
        await authFetch("/reset-password", {
          method: "POST",
          body: { newPassword: password, token },
        });
        router.push("/logowanie?komunikat=haslo-zmienione");
        router.refresh();
      } catch {
        setError("Token wygasł lub jest nieprawidłowy. Poproś o nowy link.");
      }
    });
  }

  return (
    <AuthShell title="Nowe hasło" subtitle="Ustaw nowe hasło dla swojego konta.">
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <div className="space-y-2">
          <Label htmlFor="password">Nowe hasło</Label>
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
        <Button type="submit" className="w-full" disabled={pending || !token}>
          {pending ? "Zapisywanie…" : "Zapisz hasło"}
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
