import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { organizationRolePl } from "@/lib/ui-i18n";
import { getAppContext } from "@/lib/app-context";

export default async function KontoSettingsPage() {
  const { user: u } = await getAppContext();

  return (
    <>
      <PageHeader
        title="Konto"
        description="Profil użytkownika roboczego dla tej instancji."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Profil</CardTitle>
            <CardDescription>Dane robocze dla tej instancji aplikacji.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase">Imię i nazwisko</p>
              <p className="font-medium">{u.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase">E-mail</p>
              <p className="font-medium">{u.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase">Rola</p>
              <Badge variant="secondary" className="mt-1">
                {organizationRolePl(u.role)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <ChangePasswordForm />
      </div>

      <Card className="border-border/80 mt-6 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Moduły organizacji</CardTitle>
          <CardDescription>
            Sprawdź, które funkcje (OCR, kalendarz, raporty itd.) są włączone lub wyłączone dla Twojej organizacji.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" asChild>
            <Link href="/ustawienia/moduly">Zobacz listę modułów</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
