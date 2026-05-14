import Link from "next/link";

import { submitCreateProject } from "@/app/actions/projects";
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

export default async function NewProjectPage({
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
          href="/projects"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Projekty
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nowy projekt
        </h1>
      </div>
      <ErrorBanner message={error} />
      <Card>
        <CardHeader>
          <CardTitle>Szczegóły projektu</CardTitle>
          <CardDescription>
            Zdefiniuj projekt, numer grantu i budżet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={submitCreateProject} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nazwa projektu</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grantNumber">Numer grantu</Label>
              <Input
                id="grantNumber"
                name="grantNumber"
                placeholder="np. GR-2025-0142"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fundingSource">Źródło finansowania</Label>
              <Input
                id="fundingSource"
                name="fundingSource"
                placeholder="np. EU Erasmus+"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budget">Budżet (PLN)</Label>
              <Input
                id="budget"
                name="budget"
                type="number"
                step="0.01"
                min="0"
                defaultValue="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Opis</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit">Utwórz projekt</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/projects">Anuluj</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
