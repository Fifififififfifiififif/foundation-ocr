import Link from "next/link";

import { devLoginAvailable, isSupabaseAuthConfigured } from "@/src/modules/auth/config";

type Props = {
  showDevContinue?: boolean;
};

/** Informacja tylko gdy brak kluczy Supabase w .env */
export function AuthSetupNotice({ showDevContinue }: Props) {
  const supabaseReady = isSupabaseAuthConfigured();
  const devAvailable = devLoginAvailable();

  if (supabaseReady) return null;

  return (
    <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <p className="font-medium text-foreground">Supabase Auth nie jest skonfigurowany</p>
      <p className="text-muted-foreground">
        W pliku <code className="text-xs">.env</code> dodaj klucze z panelu Supabase (
        <span className="whitespace-nowrap">Project Settings → API</span>):
      </p>
      <pre className="bg-muted overflow-x-auto rounded p-2 text-xs">
        {`NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>`}
      </pre>
      <p className="text-muted-foreground text-xs">
        Ten sam projekt co <code>DATABASE_URL</code>. Po zmianie zrestartuj{" "}
        <code>npm run dev</code>.
      </p>
      {showDevContinue && devAvailable ? (
        <p className="text-muted-foreground text-xs">
          Możesz też wejść w trybie deweloperskim (użytkownik z seeda / DEV_USER_ID) bez logowania
          hasłem.
        </p>
      ) : null}
      <p className="text-muted-foreground text-xs">
        <Link href="/ustawienia/integracje" className="underline hover:text-foreground">
          Ustawienia → Integracje
        </Link>
      </p>
    </div>
  );
}
