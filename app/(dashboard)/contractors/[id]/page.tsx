import Link from "next/link";
import { notFound } from "next/navigation";

import {
  submitDeleteContractor,
  submitUpdateContractor,
} from "@/app/actions/contractors";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBanner } from "@/components/ui/error-banner";
import prisma from "@/lib/prisma";
import { getAppContext } from "@/lib/app-context";

export default async function EditContractorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { organizationId: orgId } = await getAppContext();
  const isAdmin = true;
  const { id } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;

  const contractor = await prisma.contractor.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!contractor) notFound();

  const updateWithId = submitUpdateContractor.bind(null, id);
  const deleteWithId = submitDeleteContractor.bind(null, id);

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <Link
          href="/contractors"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Kontrahenci
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Edytuj kontrahenta
        </h1>
      </div>
      <ErrorBanner message={error} />
      <Card>
        <CardHeader>
          <CardTitle>{contractor.name}</CardTitle>
          <CardDescription>Zaktualizuj dane dostawcy</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateWithId} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nazwa firmy</Label>
              <Input
                id="name"
                name="name"
                defaultValue={contractor.name}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nip">NIP</Label>
              <Input
                id="nip"
                name="nip"
                defaultValue={contractor.nip ?? ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={contractor.email ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={contractor.phone ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Adres</Label>
              <Textarea
                id="address"
                name="address"
                rows={2}
                defaultValue={contractor.address ?? ""}
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit">Zapisz zmiany</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/contractors">Anuluj</Link>
              </Button>
            </div>
          </form>

          {isAdmin && (
            <form
              action={deleteWithId}
              className="mt-8 border-t border-border pt-6"
            >
              <p className="text-muted-foreground mb-2 text-sm">
                Usuwaj tylko wtedy, gdy żaden dokument nie wskazuje tego
                kontrahenta.
              </p>
              <Button type="submit" variant="destructive" size="sm">
                Usuń kontrahenta
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
