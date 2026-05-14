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
import { getAppContext } from "@/lib/app-context";

export default async function ContractorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { organizationId: orgId } = await getAppContext();
  const isAdmin = true;
  const sp = await searchParams;
  const search = typeof sp.q === "string" ? sp.q.trim() : "";

  const contractors = await prisma.contractor.findMany({
    where: {
      organizationId: orgId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { nip: { contains: search, mode: "insensitive" } },
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
            Kontrahenci
          </h1>
          <p className="text-muted-foreground text-sm">
            Dostawcy powiązani z fakturami.
          </p>
        </div>
        <Button asChild>
          <Link href="/contractors/new">Nowy kontrahent</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Szukaj</CardTitle>
          <CardDescription>Filtruj po nazwie lub NIP</CardDescription>
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
                <Link href="/contractors">Wyczyść</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Katalog</CardTitle>
          <CardDescription>Nazwa, NIP i kontakt</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead>NIP</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractors.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="tabular-nums">
                    {c.nip ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate">
                    {c.email ?? "—"}
                  </TableCell>
                  <TableCell>{c.phone ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/contractors/${c.id}`}>Edytuj</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {contractors.length === 0 && (
            <p className="text-muted-foreground p-4 text-sm">
              {search
                ? "Brak wyników dla podanego zapytania."
                : "Brak kontrahentów."}
            </p>
          )}
        </CardContent>
      </Card>

      {!isAdmin && (
        <p className="text-muted-foreground text-xs">
          Tylko administrator może usuwać kontrahentów.
        </p>
      )}
    </div>
  );
}
