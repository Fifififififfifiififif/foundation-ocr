import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Placeholder — brak zewnętrznego uwierzytelniania w tej instancji. */
export function ChangePasswordForm() {
  return (
    <Card className="border-border/80 max-w-md shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Zmiana hasła</CardTitle>
        <CardDescription>
          W tej konfiguracji instancji nie ma centralnej zmiany hasła — użyj konta systemowego lub bazy, jeśli dotyczy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">Brak dostępnej akcji.</p>
      </CardContent>
    </Card>
  );
}
