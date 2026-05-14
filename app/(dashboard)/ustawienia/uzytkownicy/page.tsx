import { redirect } from "next/navigation";

import {
  createInvitedUserAction,
  listOrgUsers,
  setUserBannedAction,
  updateUserRoleAction,
} from "@/app/actions/users";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/app-context";
import { organizationRolePl } from "@/lib/ui-i18n";
import type { OrganizationRole } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const ROLES: OrganizationRole[] = ["ADMIN", "ACCOUNTANT", "MANAGER", "USER"];

export default async function UzytkownicyPage() {
  const { user: me } = await getAppContext();
  if (me.role !== "ADMIN") {
    redirect("/odmowa-dostepu");
  }

  const users = await listOrgUsers();

  return (
    <>
      <PageHeader
        title="Użytkownicy"
        description="Lista kont w Twojej organizacji, role i dezaktywacja dostępu."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dodaj użytkownika</CardTitle>
            <CardDescription>Konto z hasłem startowym.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createInvitedUserAction} className="grid gap-3">
              <div className="space-y-1">
                <Label htmlFor="name">Imię i nazwisko</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Hasło startowe</Label>
                <Input id="password" name="password" type="password" minLength={8} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="role">Rola</Label>
                <select
                  id="role"
                  name="role"
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  defaultValue="USER"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {organizationRolePl(r)}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit">Utwórz konto</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Lista użytkowników</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">Nazwa</th>
                  <th className="py-2 pr-4">E-mail</th>
                  <th className="py-2 pr-4">Rola</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-border/60 border-b">
                    <td className="py-2 pr-4 font-medium">{u.name}</td>
                    <td className="text-muted-foreground py-2 pr-4">{u.email}</td>
                    <td className="py-2 pr-4">
                      <form action={updateUserRoleAction} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="userId" value={u.id} />
                        <select
                          name="role"
                          defaultValue={u.role}
                          className="border-input bg-background h-8 rounded-md border px-2 text-xs"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {organizationRolePl(r)}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" size="sm" variant="secondary">
                          Zapisz
                        </Button>
                      </form>
                    </td>
                    <td className="py-2 pr-4">
                      {u.banned ? (
                        <Badge variant="outline" className="text-destructive border-destructive/50">
                          Wyłączony
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Aktywny</Badge>
                      )}
                    </td>
                    <td className="py-2">
                      {u.id !== me.id ? (
                        <form action={setUserBannedAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="banned" value={u.banned ? "0" : "1"} />
                          <Button type="submit" size="sm" variant="outline">
                            {u.banned ? "Przywróć" : "Wyłącz"}
                          </Button>
                        </form>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
