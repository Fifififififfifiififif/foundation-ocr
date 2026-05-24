import { InvoiceCalendar } from "@/components/calendar/invoice-calendar";
import { PageHeader } from "@/components/layout/page-header";
import { requireEntitlementModule } from "@/lib/require-entitlement";
import { requirePermission } from "@/lib/require-permission";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function KalendarzPage() {
  await requireEntitlementModule("CALENDAR");
  const { organizationId: orgId } = await requirePermission("calendar.read");

  const [projects, contractors] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.contractor.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex min-h-0 flex-col gap-6 pb-8 md:gap-8 md:pb-10">
      <PageHeader
        title="Kalendarz faktur"
        description="Faktury według daty wystawienia. Kliknij dzień, aby zobaczyć szczegóły i szybkie akcje."
        className="px-4 pt-2 md:px-8 md:pt-4"
      />
      <div className="min-h-0 min-w-0 flex-1 px-4 md:px-8">
        <InvoiceCalendar
          variant="page"
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          contractors={contractors}
        />
      </div>
    </div>
  );
}
