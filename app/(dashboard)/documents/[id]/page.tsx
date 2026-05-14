import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";

import {
  submitDeleteDocument,
} from "@/app/actions/documents";
import { DocumentEditForm } from "@/components/documents/document-edit-form";
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
import { ErrorBanner } from "@/components/ui/error-banner";
import { DocumentVerifyOcrPanel } from "@/components/documents/document-verify-ocr";
import prisma from "@/lib/prisma";
import { getAppContext } from "@/lib/app-context";
import type { EditDocumentFieldKey } from "@/lib/document-form-snapshot";
import { UNASSIGNED_LABEL } from "@/lib/optional-relation-ids";
import {
  auditFieldPl,
  auditValuePl,
} from "@/lib/ui-i18n";

export default async function DocumentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { organizationId: orgId, user } = await getAppContext();
  const ownOnly = user.role === "USER";
  const isAdmin = user.role === "ADMIN";
  const { id } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;

  const doc = await prisma.document.findFirst({
    where: { id, organizationId: orgId, ...(ownOnly ? { createdByUserId: user.id } : {}) },
    include: {
      project: true,
      contractor: true,
      createdBy: { select: { email: true } },
    },
  });
  if (!doc) notFound();

  const [projects, contractors, history] = await Promise.all([
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
    prisma.documentHistory.findMany({
      where: { documentId: id, organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    }),
  ]);

  const fileUrl = `/api/files/${encodeURIComponent(doc.filePath)}`;
  const deleteWithId = submitDeleteDocument.bind(null, id);

  const defaultFieldValues: Record<EditDocumentFieldKey, string> = {
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
    expenseCategory: doc.expenseCategory ?? "",
    notes: doc.notes ?? "",
    projectId: doc.projectId ?? "",
    contractorId: doc.contractorId ?? "",
    status: doc.status,
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/documents"
            className="text-muted-foreground text-sm hover:underline"
          >
            ← Dokumenty
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {doc.invoiceNumber ?? "Dokument"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {doc.project?.name ?? UNASSIGNED_LABEL}
            {" · "}
            {doc.contractor?.name ?? UNASSIGNED_LABEL}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {doc.status === "review" && (
            <Button asChild variant="secondary">
              <Link href={`/documents/${id}/verify`}>Weryfikuj OCR</Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <a href={fileUrl} target="_blank" rel="noreferrer">
              Otwórz plik
            </a>
          </Button>
        </div>
      </div>

      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle>Edytuj dokument</CardTitle>
          <CardDescription>
            Zmiany trafiają do dziennika audytu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentEditForm
            documentId={id}
            defaultFieldValues={defaultFieldValues}
            projects={projects}
            contractors={contractors}
          />

          {isAdmin && (
            <form
              action={deleteWithId}
              className="mt-8 border-t border-border pt-6"
            >
              <Button type="submit" variant="destructive" size="sm">
                Usuń dokument
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Śledzenie</CardTitle>
          <CardDescription>
            Powiązanie wydatku z projektem i źródłem finansowania
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs">Projekt</dt>
              <dd>{doc.project?.name ?? UNASSIGNED_LABEL}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Numer grantu</dt>
              <dd>{doc.project?.grantNumber ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Źródło finansowania</dt>
              <dd>{doc.project?.fundingSource ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Kontrahent</dt>
              <dd>{doc.contractor?.name ?? UNASSIGNED_LABEL}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground text-xs">Utworzył</dt>
              <dd>{doc.createdBy?.email ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tekst OCR</CardTitle>
          <CardDescription>Pełny tekst z OCR (Tesseract / PDF)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentVerifyOcrPanel
            documentId={id}
            ocrMeanConfidence={doc.ocrMeanConfidence}
            manualReviewRecommended={doc.ocrManualReviewRecommended}
            qualityReasons={doc.ocrQualityReasons}
          />
          <pre className="bg-muted/50 max-h-64 overflow-auto rounded-lg p-3 text-xs whitespace-pre-wrap">
            {doc.ocrRawText ?? "—"}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historia zmian</CardTitle>
          <CardDescription>Kto, co i kiedy zmienił</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Brak zapisanych edycji.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kiedy</TableHead>
                  <TableHead>Użytkownik</TableHead>
                  <TableHead>Pole</TableHead>
                  <TableHead>Poprzednia</TableHead>
                  <TableHead>Nowa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {format(h.createdAt, "yyyy-MM-dd HH:mm")}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate text-xs">
                      {h.user.email}
                    </TableCell>
                    <TableCell className="text-xs">
                      {auditFieldPl(h.fieldName)}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[140px] truncate text-xs">
                      {auditValuePl(h.fieldName, h.oldValue)}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-xs">
                      {auditValuePl(h.fieldName, h.newValue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
