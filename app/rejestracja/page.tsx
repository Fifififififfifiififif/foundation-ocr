import Link from "next/link";

import { RegisterOrganizationForm } from "@/components/auth/register-organization-form";
import { AuthSetupNotice } from "@/components/auth/auth-setup-notice";
import { isSupabaseAuthConfigured } from "@/src/modules/auth/config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; pending?: string; email?: string }>;
}) {
  const sp = await searchParams;
  const supabaseReady = isSupabaseAuthConfigured();
  const pending = sp.pending === "1";

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle>{pending ? "Potwierdź email" : "Utwórz konto"}</CardTitle>
          <CardDescription>
            {pending
              ? "Konto zostało utworzone w Supabase. Ostatni krok to link w wiadomości email."
              : "Zarejestruj organizację i rozpocznij zarządzanie dokumentami."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!pending ? <AuthSetupNotice /> : null}

          {pending ? (
            <div className="space-y-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
              <p className="font-medium text-foreground">
                Sprawdź skrzynkę{sp.email ? ` (${sp.email})` : ""}
              </p>
              <p className="text-muted-foreground">
                Kliknij link potwierdzający z Supabase, potem{" "}
                <Link href="/logowanie" className="font-medium underline">
                  zaloguj się
                </Link>{" "}
                tym samym emailem i hasłem. Organizacja zostanie utworzona przy pierwszym
                logowaniu.
              </p>
              <p className="text-muted-foreground text-xs">
                Dev: w Supabase → Authentication → Providers → Email możesz wyłączyć „Confirm
                email”, żeby logować od razu bez maila.
              </p>
            </div>
          ) : (
            <>
              <RegisterOrganizationForm
                supabaseReady={supabaseReady}
                error={sp.error}
              />
            </>
          )}

          <p className="text-muted-foreground text-sm">
            Masz konto?{" "}
            <Link href="/logowanie" className="hover:text-foreground font-medium">
              Zaloguj się
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
