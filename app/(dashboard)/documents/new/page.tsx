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
import { getAppContext } from "@/lib/app-context";
import { getOrganizationById } from "@/lib/organization-settings";
import prisma from "@/lib/prisma";

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;

  const { organizationId: orgId } = await getAppContext();

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
        description="Prześlij PDF lub skan. Projekt i kontrahent są opcjonalne — możesz przypisać je później lub pozostawić puste."
      />
      <Link
        href="/documents"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex text-sm font-medium transition-colors"
      >
        ← Wróć do listy faktur
      </Link>
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
            ocrEnabled={org.ocrEnabled}
          />
        </CardContent>
      </Card>
    </div>
  );
}
