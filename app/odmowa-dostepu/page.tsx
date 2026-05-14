import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export default function OdmowaDostepuPage() {
  return (
    <AuthShell title="Brak dostępu" subtitle="Nie masz uprawnień do tej części aplikacji. Skontaktuj się z administratorem organizacji.">
      <div className="flex flex-col gap-3">
        <Button asChild>
          <Link href="/dashboard">Przejdź do panelu</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/ustawienia">Ustawienia</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
