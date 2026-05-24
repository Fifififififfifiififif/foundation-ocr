import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function OdmowaDostepuPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const banned = reason === "banned";

  return (
    <div className="bg-muted/30 flex min-h-full flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>{banned ? "Konto wyłączone" : "Brak dostępu"}</CardTitle>
          <CardDescription>
            {banned
              ? "Twoje konto zostało wyłączone przez administratora. Nie możesz korzystać z aplikacji do czasu przywrócenia dostępu."
              : "Nie masz uprawnień do tej części aplikacji. Skontaktuj się z administratorem organizacji."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!banned ? (
            <Button asChild>
              <Link href="/dashboard">Przejdź do panelu</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/ustawienia/konto">Ustawienia konta</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
