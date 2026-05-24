"use client";

import * as React from "react";
import { toast } from "sonner";

import { createSupabaseBrowserClient } from "@/src/modules/auth/supabase/client";
import { isSupabaseAuthConfigured } from "@/src/modules/auth/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [pending, setPending] = React.useState(false);

  if (!isSupabaseAuthConfigured()) {
    return (
      <Card className="border-border/80 max-w-md shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Zmiana hasła</CardTitle>
          <CardDescription>
            Wymaga skonfigurowanego Supabase Auth (NEXT_PUBLIC_SUPABASE_URL i klucz anon).
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (password.length < 8) {
      toast.error("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }
    if (password !== confirm) {
      toast.error("Hasła nie są identyczne.");
      return;
    }
    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) toast.error(error.message);
      else {
        toast.success("Hasło zostało zmienione.");
        e.currentTarget.reset();
      }
    } catch {
      toast.error("Nie udało się zmienić hasła.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-border/80 max-w-md shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Zmiana hasła</CardTitle>
        <CardDescription>Ustaw nowe hasło do swojego konta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nowe hasło</Label>
            <Input id="new-password" name="password" type="password" minLength={8} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password-confirm">Powtórz hasło</Label>
            <Input id="new-password-confirm" name="confirm" type="password" minLength={8} required />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Zapisywanie…" : "Zmień hasło"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
