import Link from "next/link";

import { ManualInvoiceForm } from "@/components/invoices/manual-invoice-form";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/ui/error-banner";
import { getAppContext } from "@/lib/app-context";
import { getOrganizationById } from "@/lib/organization-settings";
import { requirePermission } from "@/lib/require-permission";
import prisma from "@/lib/prisma";

export default async function ManualInvoiceNewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("documents.write");
  const sp = await searchParams;
  const { organizationId: orgId } = await getAppContext();

  const [projects, contractors, org] = await Promise.all([
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
    getOrganizationById(orgId),
  ]);

  return (
    <div className="mx-auto max-w-4xl pb-0">
      <PageHeader
        title="Nowa faktura — ręcznie"
        description="Wypełnij dane ręcznie. Opcjonalnie dołącz skan — zostanie zapisany bez OCR."
      />
      <div className="mb-4 flex gap-3 text-sm">
        <Link href="/documents" className="text-muted-foreground hover:text-foreground">
          ← Lista faktur
        </Link>
        <Link href="/documents/new" className="text-muted-foreground hover:text-foreground">
          Prześlij z OCR
        </Link>
      </div>
      <ErrorBanner message={sp.error ?? null} />
      <ManualInvoiceForm
        projects={projects}
        contractors={contractors}
        maxUploadBytes={org.maxUploadBytes}
        organizationNip={org.nip}
        submitLabel="Utwórz fakturę"
      />
    </div>
  );
}
