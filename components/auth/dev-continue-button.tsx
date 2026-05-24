import { continueAsDevAction } from "@/app/actions/auth";
import { devLoginAvailable, isSupabaseAuthConfigured } from "@/src/modules/auth/config";
import { Button } from "@/components/ui/button";

export function DevContinueButton() {
  if (!devLoginAvailable() || isSupabaseAuthConfigured()) return null;

  return (
    <form action={continueAsDevAction} className="pt-2">
      <Button type="submit" variant="outline" className="w-full">
        Kontynuuj w trybie deweloperskim
      </Button>
      <p className="text-muted-foreground mt-2 text-center text-xs">
        Używa konta z seeda (DEV_USER_ID) — bez hasła Supabase.
      </p>
    </form>
  );
}
