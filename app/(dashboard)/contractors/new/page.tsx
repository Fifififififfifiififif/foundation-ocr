import Link from "next/link";

import { submitCreateContractor } from "@/app/actions/contractors";
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
import { ErrorBanner } from "@/components/ui/error-banner";
import { Textarea } from "@/components/ui/textarea";

export default async function NewContractorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;

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
          Nowy kontrahent
        </h1>
      </div>
      <ErrorBanner message={error} />
      <Card>
        <CardHeader>
          <CardTitle>Dane kontrahenta</CardTitle>
          <CardDescription>
            NIP jest normalizowany do 10 cyfr przy zapisie.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={submitCreateContractor}
            className="flex flex-col gap-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="name">Nazwa firmy</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nip">NIP</Label>
              <Input
                id="nip"
                name="nip"
                placeholder="5270000000 lub 527-000-00-00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" name="phone" type="tel" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Adres</Label>
              <Textarea id="address" name="address" rows={2} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit">Zapisz</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/contractors">Anuluj</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
