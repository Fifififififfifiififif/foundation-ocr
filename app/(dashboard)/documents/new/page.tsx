import Link from "next/link";

import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorBanner } from "@/components/ui/error-banner";
import { getOrganizationById } from "@/lib/organization-settings";
import { mayRunOcrPipeline } from "@/src/modules/permissions/check";
import { requirePermission } from "@/lib/require-permission";
import prisma from "@/lib/prisma";

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;

  const ctx = await requirePermission("documents.write");
  const { organizationId: orgId, enabledModules } = ctx;

  const [projects, contractors, org] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, grantNumber: true },
      orderBy: { name: "asc" },
    }),
    prisma.contractor.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, nip: true },
      orderBy: { name: "asc" },
    }),
    getOrganizationById(orgId),
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Nowa faktura"
        description="Prześlij PDF lub skan — OCR opcjonalnie wypełni pola. Możesz też utworzyć fakturę bez pliku."
      />
      <div className="text-muted-foreground mb-6 flex flex-wrap gap-4 text-sm">
        <Link href="/documents" className="hover:text-foreground font-medium transition-colors">
          ← Lista faktur
        </Link>
        <Link href="/documents/manual/new" className="hover:text-foreground font-medium transition-colors">
          Utwórz fakturę ręcznie (bez OCR)
        </Link>
      </div>
      <ErrorBanner message={error} />
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>Przesłanie pliku</CardTitle>
          <CardDescription>
            Obsługiwane formaty: PDF, JPG, PNG. Limit rozmiaru zgodny z ustawieniami OCR.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUploadForm
            projects={projects}
            contractors={contractors}
            maxUploadBytes={org.maxUploadBytes}
            ocrEnabled={mayRunOcrPipeline(enabledModules, org.ocrEnabled, ctx.entitlement)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
