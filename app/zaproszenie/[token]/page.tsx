import Link from "next/link";

import { acceptInviteAction, getInviteByToken } from "@/app/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InviteAcceptPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return (
      <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Zaproszenie nieważne</CardTitle>
            <CardDescription>Link wygasł lub został już wykorzystany.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/logowanie" className="text-sm font-medium hover:underline">
              Przejdź do logowania
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Dołącz do organizacji</CardTitle>
          <CardDescription>
            Zaproszenie do <strong>{invite.organization.name}</strong> ({invite.email})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={acceptInviteAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <div className="space-y-2">
              <Label htmlFor="name">Imię i nazwisko</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Hasło (min. 8 znaków)</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            {sp.error ? <p className="text-destructive text-sm">{sp.error}</p> : null}
            <Button type="submit" className="w-full">
              Akceptuj i utwórz konto
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
