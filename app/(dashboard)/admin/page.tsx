import Link from "next/link";
import { Shield } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSuperAdmin } from "@/lib/require-permission";

export default async function SuperAdminPage() {
  await requireSuperAdmin();

  return (
    <div>
      <PageHeader
        title="Panel platformy"
        description="Zarządzanie organizacjami, modułami i subskrypcjami (Super Admin)."
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="size-4" />
              Organizacje
            </CardTitle>
            <CardDescription>Twórz i zarządzaj tenantami.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/organizations" className="text-sm font-medium hover:underline">
              Przejdź →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Moduły</CardTitle>
            <CardDescription>Włączaj funkcje per organizacja.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/modules" className="text-sm font-medium hover:underline">
              Przejdź →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audyt</CardTitle>
            <CardDescription>Dziennik zdarzeń platformy.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/audit" className="text-sm font-medium hover:underline">
              Przejdź →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
