import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppContext } from "@/lib/app-context";
import prisma from "@/lib/prisma";

export default async function WelcomeOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; new?: string; joined?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getAppContext();
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { name: true, slug: true },
  });

  const title =
    sp.joined === "1"
      ? "Dołączyłeś do organizacji"
      : sp.new === "1"
        ? "Witaj w Twojej organizacji"
        : "Workspace organizacji";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={title}
        description={
          sp.org
            ? `„${decodeURIComponent(sp.org)}” jest gotowa do pracy.`
            : org
              ? `„${org.name}” — izolowany workspace SaaS.`
              : "Zarządzaj dokumentami, fakturami i zespołem w jednym miejscu."
        }
      />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Co dalej?</CardTitle>
          <CardDescription>
            Jesteś{" "}
            <strong>
              {ctx.user.role === "OWNER" ? "właścicielem organizacji" : "członkiem zespołu"}
            </strong>
            . Twoje dane są oddzielone od innych tenantów na platformie.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard">Przejdź do panelu</Link>
          </Button>
          {(ctx.user.role === "OWNER" || ctx.user.role === "ADMIN") && (
            <Button variant="outline" asChild>
              <Link href="/ustawienia/uzytkownicy">Zaproś zespół</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/ustawienia/organizacja">Ustawienia organizacji</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
