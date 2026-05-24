"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createOrgUserAction,
  inviteOrgUserAction,
  setUserBanned,
  updateUserRole,
  type UserAdminRow,
} from "@/app/actions/users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { organizationRolePl } from "@/lib/ui-i18n";
import type { OrganizationRole } from "@/generated/prisma";

const ROLES: OrganizationRole[] = [
  "ADMIN",
  "ACCOUNTANT",
  "MANAGER",
  "MEMBER",
  "VIEWER",
];

type Props = {
  users: UserAdminRow[];
  currentUserId: string;
  canAssignOwner: boolean;
};

export function OrgUsersManager({ users, currentUserId, canAssignOwner }: Props) {
  const [pending, startTransition] = useTransition();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const roleOptions = canAssignOwner ? (["OWNER", ...ROLES] as OrganizationRole[]) : ROLES;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Utwórz użytkownika</CardTitle>
          <CardDescription>
            Konto w Supabase Auth przypisane tylko do Twojej organizacji.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const r = await createOrgUserAction(fd);
                if (r.ok) toast.success(r.message ?? "Utworzono.");
                else toast.error(r.error ?? "Błąd");
              });
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="name">Imię i nazwisko</Label>
              <Input id="name" name="name" required disabled={pending} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required disabled={pending} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Hasło tymczasowe</Label>
              <Input id="password" name="password" type="password" minLength={8} required disabled={pending} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="role">Rola</Label>
              <select
                id="role"
                name="role"
                defaultValue="MEMBER"
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                disabled={pending}
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {organizationRolePl(r)}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={pending}>
              Utwórz konto
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zaproś linkiem</CardTitle>
          <CardDescription>Wyślij link rejestracji (ważny 7 dni).</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const r = await inviteOrgUserAction(fd);
                if (r.ok) {
                  toast.success(r.message ?? "Zaproszenie utworzone.");
                  if ("inviteUrl" in r && r.inviteUrl) setInviteUrl(r.inviteUrl);
                } else toast.error(r.error ?? "Błąd");
              });
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="invite-email">E-mail</Label>
              <Input id="invite-email" name="email" type="email" required disabled={pending} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="invite-role">Rola</Label>
              <select
                id="invite-role"
                name="role"
                defaultValue="MEMBER"
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                disabled={pending}
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {organizationRolePl(r)}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="outline" disabled={pending}>
              Generuj zaproszenie
            </Button>
            {inviteUrl ? (
              <p className="text-muted-foreground break-all text-xs">
                Link:{" "}
                <a href={inviteUrl} className="underline">
                  {inviteUrl}
                </a>
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Zespół ({users.length})</CardTitle>
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
                    <form
                      className="flex flex-wrap items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        const role = String(fd.get("role")) as OrganizationRole;
                        startTransition(async () => {
                          const r = await updateUserRole(u.id, role);
                          if (r.ok) toast.success("Rola zapisana.");
                          else toast.error(r.error ?? "Błąd");
                        });
                      }}
                    >
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="border-input bg-background h-8 rounded-md border px-2 text-xs"
                        disabled={u.id === currentUserId}
                      >
                        {roleOptions.map((r) => (
                          <option key={r} value={r}>
                            {organizationRolePl(r)}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="submit"
                        size="sm"
                        variant="secondary"
                        disabled={u.id === currentUserId || pending}
                      >
                        Zapisz
                      </Button>
                    </form>
                  </td>
                  <td className="py-2 pr-4">
                    {u.banned || !u.isActive ? (
                      <Badge variant="outline" className="text-destructive border-destructive/50">
                        Wyłączony
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Aktywny</Badge>
                    )}
                  </td>
                  <td className="py-2">
                    {u.id !== currentUserId ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => {
                          startTransition(async () => {
                            const r = await setUserBanned(u.id, !u.banned);
                            if (r.ok) toast.success(u.banned ? "Przywrócono." : "Wyłączono.");
                            else toast.error(r.error ?? "Błąd");
                          });
                        }}
                      >
                        {u.banned ? "Przywróć" : "Wyłącz"}
                      </Button>
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
  );
}
