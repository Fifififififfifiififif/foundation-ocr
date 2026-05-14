import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";

import { DocumentVerifyForm } from "@/components/documents/document-verify-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorBanner } from "@/components/ui/error-banner";
import prisma from "@/lib/prisma";
import { sanitizeOcrErrorQueryParam } from "@/lib/ocr";
import { formatMoneyPl } from "@/lib/format/money";
import type { VerifyDocumentFieldKey } from "@/lib/document-form-snapshot";
import { getAppContext } from "@/lib/app-context";

export default async function VerifyDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ocrErrorRaw = typeof sp.ocrError === "string" ? sp.ocrError : null;
  const ocrError = sanitizeOcrErrorQueryParam(ocrErrorRaw);
  const formError = typeof sp.error === "string" ? sp.error : null;

  const { organizationId: orgId } = await getAppContext();

  const doc = await prisma.document.findFirst({
    where: { id, organizationId: orgId },
    include: { project: true, contractor: true },
  });
  if (!doc) notFound();

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

  const fileUrl = `/api/files/${encodeURIComponent(doc.filePath)}`;

  const defaultFieldValues: Record<VerifyDocumentFieldKey, string> = {
    invoiceNumber: doc.invoiceNumber ?? "",
    issueDate: doc.issueDate ? format(doc.issueDate, "yyyy-MM-dd") : "",
    paymentDate: doc.paymentDate ? format(doc.paymentDate, "yyyy-MM-dd") : "",
    amountNet: doc.amountNet != null ? doc.amountNet.toString() : "",
    amountGross: doc.amountGross != null ? doc.amountGross.toString() : "",
    amountVat: doc.amountVat != null ? doc.amountVat.toString() : "",
    documentType: doc.documentType ?? "",
    ocrVendorName: doc.ocrVendorName ?? "",
    ocrContractorNip: doc.ocrContractorNip ?? "",
    ocrBankAccount: doc.ocrBankAccount ?? "",
    notes: doc.notes ?? "",
    projectId: doc.projectId ?? "",
    contractorId: doc.contractorId ?? "",
    expenseCategory: doc.expenseCategory ?? "",
  };

  const netHint =
    doc.amountNet != null ? formatMoneyPl(Number(doc.amountNet)) : null;
  const grossHint =
    doc.amountGross != null ? formatMoneyPl(Number(doc.amountGross)) : null;
  const vatHint = doc.amountVat != null ? formatMoneyPl(Number(doc.amountVat)) : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <Link
          href={`/documents/${id}`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Dokument
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Weryfikacja OCR
        </h1>
        <p className="text-muted-foreground text-sm">
          Porównaj podgląd z odczytanymi polami, popraw w razie potrzeby.
        </p>
      </div>

      {formError && <ErrorBanner message={formError} />}

      {ocrError && (
        <ErrorBanner
          message={`OCR nie powiódł się: ${ocrError}. Uzupełnij dane ręcznie.`}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="flex flex-col gap-6">
          <Card className="min-h-[480px] overflow-hidden">
            <CardHeader>
              <CardTitle>Podgląd</CardTitle>
              <CardDescription>{doc.fileName}</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 p-0">
              {doc.mimeType === "application/pdf" ? (
                <iframe
                  title="Podgląd dokumentu"
                  src={fileUrl}
                  className="h-[70vh] w-full border-0"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileUrl}
                  alt="Dokument"
                  className="max-h-[70vh] w-full object-contain"
                />
              )}
            </CardContent>
          </Card>

          {doc.ocrRawText && (
            <Card>
              <CardHeader>
                <CardTitle>Tekst OCR</CardTitle>
                <CardDescription>
                  Surowy tekst z OCR lub warstwy PDF — pomoc przy ręcznej korekcie.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted max-h-64 overflow-auto rounded-lg p-3 text-xs whitespace-pre-wrap">
                  {doc.ocrRawText}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Potwierdzone pola</CardTitle>
            <CardDescription>
              Przed zatwierdzeniem wymagane jest ręczne sprawdzenie danych.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentVerifyForm
              documentId={id}
              defaultFieldValues={defaultFieldValues}
              netHint={netHint}
              grossHint={grossHint}
              vatHint={vatHint}
              projects={projects}
              contractors={contractors}
              ocrMeanConfidence={doc.ocrMeanConfidence}
              manualReviewRecommended={doc.ocrManualReviewRecommended}
              qualityReasons={doc.ocrQualityReasons}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
