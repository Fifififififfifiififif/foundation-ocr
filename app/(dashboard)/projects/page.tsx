import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import prisma from "@/lib/prisma";
import { requireEntitlementModule } from "@/lib/require-entitlement";
import { canManageUsers } from "@/src/modules/permissions/hierarchy";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireEntitlementModule("PROJECTS");
  const { organizationId: orgId, user } = ctx;
  const isAdmin = canManageUsers(user.role);
  const sp = await searchParams;
  const search = typeof sp.q === "string" ? sp.q.trim() : "";

  const projects = await prisma.project.findMany({
    where: {
      organizationId: orgId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { grantNumber: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Projekty i granty
          </h1>
          <p className="text-muted-foreground text-sm">
            Każdy dokument kosztowy jest powiązany z projektem.
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">Nowy projekt</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Szukaj</CardTitle>
          <CardDescription>Filtruj po nazwie lub numerze grantu</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex gap-2">
            <input
              name="q"
              defaultValue={search}
              placeholder="Szukaj…"
              className="border-input bg-background h-8 flex-1 rounded-lg border px-3 text-sm outline-none"
            />
            <Button type="submit" size="sm">
              Szukaj
            </Button>
            {search && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/projects">Wyczyść</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wszystkie projekty</CardTitle>
          <CardDescription>Budżet i metadane finansowania</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead>Nr grantu</TableHead>
                <TableHead>Źródło</TableHead>
                <TableHead className="text-right">Budżet</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.grantNumber}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {p.fundingSource}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.budget?.toString() ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/projects/${p.id}`}>Edytuj</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {projects.length === 0 && (
            <p className="text-muted-foreground p-4 text-sm">
              {search
                ? "Brak wyników dla podanego zapytania."
                : "Brak projektów. Utwórz projekt, aby powiązać z nim dokumenty."}
            </p>
          )}
        </CardContent>
      </Card>

      {!isAdmin && (
        <p className="text-muted-foreground text-xs">
          Tylko administrator może usuwać projekty.
        </p>
      )}
    </div>
  );
}
