import Link from "next/link";
import { notFound } from "next/navigation";

import {
  submitDeleteProject,
  submitUpdateProject,
} from "@/app/actions/projects";
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

export default async function EditProjectPage({
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

  const project = await prisma.project.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!project) notFound();

  const updateWithId = submitUpdateProject.bind(null, id);
  const deleteWithId = submitDeleteProject.bind(null, id);

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
          Edytuj projekt
        </h1>
      </div>
      <ErrorBanner message={error} />
      <Card>
        <CardHeader>
          <CardTitle>{project.name}</CardTitle>
          <CardDescription>Zaktualizuj dane projektu</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateWithId} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nazwa projektu</Label>
              <Input
                id="name"
                name="name"
                defaultValue={project.name}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grantNumber">Numer grantu</Label>
              <Input
                id="grantNumber"
                name="grantNumber"
                defaultValue={project.grantNumber}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fundingSource">Źródło finansowania</Label>
              <Input
                id="fundingSource"
                name="fundingSource"
                defaultValue={project.fundingSource}
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
                defaultValue={project.budget?.toString() ?? "0"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={project.description ?? ""}
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit">Zapisz zmiany</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/projects">Anuluj</Link>
              </Button>
            </div>
          </form>

          {isAdmin && (
            <form
              action={deleteWithId}
              className="mt-8 border-t border-border pt-6"
            >
              <p className="text-muted-foreground mb-2 text-sm">
                Usuwaj tylko wtedy, gdy żaden dokument nie wskazuje tego projektu.
              </p>
              <Button type="submit" variant="destructive" size="sm">
                Usuń projekt
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
