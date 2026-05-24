import Link from "next/link";

import {
  createOrganizationManuallyAction,
  impersonateOrganizationFormAction,
  setOrganizationStatusAction,
} from "@/app/actions/admin";
import { OrganizationSubscriptionForm } from "@/components/admin/organization-subscription-form";
import { OrganizationVerifiedBadge } from "@/components/organization/organization-verified-badge";
import { PageHeader } from "@/components/layout/page-header";
import { requireSuperAdmin } from "@/lib/require-permission";
import prisma from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminOrganizationsPage() {
  await requireSuperAdmin();

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true, documents: true } },
      subscription: { select: { plan: true, status: true } },
    },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Organizacje"
        description="Wszystkie tenanty — plany, status, moduły, impersonacja."
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Utwórz organizację ręcznie</CardTitle>
          <CardDescription>Nowy tenant + właściciel (OWNER) po emailu.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createOrganizationManuallyAction} className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="organizationName">Nazwa organizacji</Label>
              <Input id="organizationName" name="organizationName" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ownerEmail">Email właściciela</Label>
              <Input id="ownerEmail" name="ownerEmail" type="email" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ownerName">Imię właściciela</Label>
              <Input id="ownerName" name="ownerName" />
            </div>
            <Button type="submit" className="sm:col-span-3 w-fit">
              Utwórz tenant
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nazwa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Członkowie</TableHead>
              <TableHead>Dokumenty</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{o.name}</span>
                    <OrganizationVerifiedBadge verifiedAt={o.verifiedAt} compact />
                  </div>
                  <span className="text-muted-foreground block text-xs">{o.slug}</span>
                </TableCell>
                <TableCell className="text-xs">
                  {o.krs ? <span className="block">KRS {o.krs}</span> : null}
                  {o.nip ? <span className="text-muted-foreground block">NIP {o.nip}</span> : null}
                  {!o.krs && !o.nip ? <span className="text-muted-foreground">—</span> : null}
                </TableCell>
                <TableCell>
                  {o.status === "suspended" ? (
                    <Badge variant="outline" className="text-destructive border-destructive/50">
                      Zawieszona
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Aktywna</Badge>
                  )}
                </TableCell>
                <TableCell>{o._count.members}</TableCell>
                <TableCell>{o._count.documents}</TableCell>
                <TableCell>
                  <OrganizationSubscriptionForm
                    organizationId={o.id}
                    plan={o.subscription?.plan ?? "free"}
                    status={o.subscription?.status ?? "trialing"}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/modules?org=${o.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      Moduły
                    </Link>
                    <form action={impersonateOrganizationFormAction}>
                      <input type="hidden" name="organizationId" value={o.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Wejdź jako tenant
                      </Button>
                    </form>
                    {o.status === "active" ? (
                      <form action={setOrganizationStatusAction}>
                        <input type="hidden" name="organizationId" value={o.id} />
                        <input type="hidden" name="status" value="suspended" />
                        <Button type="submit" size="sm" variant="destructive">
                          Zawieś
                        </Button>
                      </form>
                    ) : (
                      <form action={setOrganizationStatusAction}>
                        <input type="hidden" name="organizationId" value={o.id} />
                        <input type="hidden" name="status" value="active" />
                        <Button type="submit" size="sm" variant="secondary">
                          Aktywuj
                        </Button>
                      </form>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
