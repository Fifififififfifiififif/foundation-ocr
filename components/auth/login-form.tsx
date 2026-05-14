"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth-client";
import { describeAuthClientError } from "@/lib/auth-client-errors";

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await signIn.email({
        email: email.trim(),
        password,
        rememberMe: remember,
      });
      if (res.error) {
        setError(describeAuthClientError(res.error) || "Nie udało się zalogować.");
        return;
      }
      const cb = sp.get("callbackUrl");
      router.push(cb && cb.startsWith("/") ? cb : "/dashboard");
      router.refresh();
    });
  }

  return (
    <AuthShell title="Logowanie" subtitle="Dostęp do rejestru dokumentów Twojej organizacji.">
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Hasło</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
          <Label htmlFor="remember" className="text-sm font-normal">
            Zapamiętaj mnie
          </Label>
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Logowanie…" : "Zaloguj"}
        </Button>
        <p className="text-muted-foreground text-center text-sm">
          <Link href="/zapomniane-haslo" className="underline underline-offset-4">
            Zapomniałeś hasła?
          </Link>
        </p>
        <p className="text-muted-foreground text-center text-sm">
          Nie masz konta?{" "}
          <Link href="/rejestracja" className="text-foreground font-medium underline underline-offset-4">
            Zarejestruj się
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
