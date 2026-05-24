import Link from "next/link";
import { Suspense } from "react";

import { signInWithPassword } from "@/app/actions/auth";
import { AuthQueryToasts } from "@/components/auth/auth-query-toasts";
import { AuthSetupNotice } from "@/components/auth/auth-setup-notice";
import { DevContinueButton } from "@/components/auth/dev-continue-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isSupabaseAuthConfigured } from "@/src/modules/auth/config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    error?: string;
    signedOut?: string;
    hint?: string;
    confirmed?: string;
  }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/dashboard";
  const supabaseReady = isSupabaseAuthConfigured();

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={null}>
        <AuthQueryToasts />
      </Suspense>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Zaloguj się</CardTitle>
          <CardDescription>
            Platforma dokumentów i faktur dla dowolnej organizacji.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AuthSetupNotice showDevContinue />

          <form action={signInWithPassword} className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                disabled={!supabaseReady}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                disabled={!supabaseReady}
              />
            </div>
            {sp.error ? (
              <p className="text-destructive text-sm">{sp.error}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={!supabaseReady}>
              Zaloguj
            </Button>
          </form>

          <DevContinueButton />

          <div className="text-muted-foreground flex flex-col gap-2 text-sm">
            <Link href="/zapomniane-haslo" className="hover:text-foreground">
              Zapomniałeś hasła?
            </Link>
            <Link href="/rejestracja" className="hover:text-foreground">
              Utwórz konto organizacji
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
