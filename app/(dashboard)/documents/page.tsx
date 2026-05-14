import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceFilters } from "@/components/invoices/invoice-filters";
import {
  InvoicesPageClient,
  type InvoiceRow,
} from "@/components/invoices/invoices-page-client";
import prisma from "@/lib/prisma";
import { documentStatusPl } from "@/lib/ui-i18n";
import { getAppContext } from "@/lib/app-context";
import type { DocumentStatus } from "@/generated/prisma";
import { buildDocumentWhere, documentOrderBy } from "@/lib/queries/document-list";
import { UNASSIGNED_LABEL } from "@/lib/optional-relation-ids";

const PAGE_SIZE = 20;

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { organizationId: orgId, user } = await getAppContext();
  const ownOnly = user.role === "USER";
  const isAdmin = user.role === "ADMIN";
  const sp = await searchParams;

  const q = typeof sp.q === "string" ? sp.q : "";
  const projectId = typeof sp.projectId === "string" ? sp.projectId : undefined;
  const contractorId = typeof sp.contractorId === "string" ? sp.contractorId : undefined;
  const status =
    typeof sp.status === "string" && ["draft", "review", "approved"].includes(sp.status)
      ? (sp.status as DocumentStatus)
      : undefined;
  const from = typeof sp.from === "string" ? sp.from : undefined;
  const to = typeof sp.to === "string" ? sp.to : undefined;
  const minGross = typeof sp.minGross === "string" ? sp.minGross : undefined;
  const maxGross = typeof sp.maxGross === "string" ? sp.maxGross : undefined;
  const sort = typeof sp.sort === "string" ? sp.sort : undefined;
  const archivedOnly = isAdmin && sp.archived === "1";
  const noProject = sp.noProject === "1";
  const noContractor = sp.noContractor === "1";
  const pageRaw = typeof sp.page === "string" ? Number.parseInt(sp.page, 10) : 1;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const where = buildDocumentWhere({
    organizationId: orgId,
    q: q || undefined,
    projectId,
    contractorId,
    noProject: noProject || undefined,
    noContractor: noContractor || undefined,
    status,
    from,
    to,
    minGross,
    maxGross,
    sort,
    archivedOnly,
    createdByUserId: ownOnly ? user.id : undefined,
  });

  const globalWhere = ownOnly
    ? { organizationId: orgId, archived: false, createdByUserId: user.id }
    : { organizationId: orgId };

  const [totalCount, globalCount, documents, projects, contractors] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.count({ where: globalWhere }),
    prisma.document.findMany({
      where,
      orderBy: documentOrderBy(sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        project: { select: { name: true, grantNumber: true, fundingSource: true } },
        contractor: { select: { name: true } },
      },
    }),
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

  const exportParams = new URLSearchParams();
  if (projectId) exportParams.set("projectId", projectId);
  if (contractorId) exportParams.set("contractorId", contractorId);
  if (noProject) exportParams.set("noProject", "1");
  if (noContractor) exportParams.set("noContractor", "1");
  if (status) exportParams.set("status", status);
  if (from) exportParams.set("from", from);
  if (to) exportParams.set("to", to);
  const exportHref = `/api/documents/export?${exportParams.toString()}`;

  const rows: InvoiceRow[] = documents.map((d) => ({
    id: d.id,
    invoiceNumber: d.invoiceNumber,
    projectUnassigned: !d.project,
    contractorUnassigned: !d.contractor,
    projectName: d.project?.name ?? UNASSIGNED_LABEL,
    grantLabel: d.project
      ? `${d.project.grantNumber} · ${d.project.fundingSource}`
      : "—",
    contractorName: d.contractor?.name ?? UNASSIGNED_LABEL,
    amountGross: d.amountGross?.toString() ?? null,
    status: d.status,
    statusLabel: documentStatusPl(d.status),
    archived: d.archived,
    fileName: d.fileName,
    filePath: d.filePath,
  }));

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const pageHref = (p: number) => {
    const n = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (typeof v === "string" && k !== "page") n.set(k, v);
    }
    n.set("page", String(p));
    return `/documents?${n.toString()}`;
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 pb-24">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Faktury</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Lista dokumentów kosztowych z OCR, statusami weryfikacji i eksportem dla księgowości.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 md:mt-0">
          <Button variant="outline" size="sm" asChild>
            <a href={exportHref}>Eksport CSV (widok)</a>
          </Button>
          <Button size="sm" asChild>
            <Link href="/documents/new">Dodaj fakturę</Link>
          </Button>
        </div>
      </div>

      <Suspense
        fallback={
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        }
      >
        <InvoiceFilters
          projects={projects}
          contractors={contractors}
          isAdmin={isAdmin}
          defaults={{
            q,
            projectId: projectId ?? "",
            contractorId: contractorId ?? "",
            status: status ?? "",
            from: from ?? "",
            to: to ?? "",
            minGross: minGross ?? "",
            maxGross: maxGross ?? "",
            sort: sort ?? "",
            noProject: noProject ? "1" : "",
            noContractor: noContractor ? "1" : "",
            archived: archivedOnly ? "1" : "",
          }}
        />
      </Suspense>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
          <div>
            <CardTitle className="text-base">Wyniki</CardTitle>
            <CardDescription>
              {totalCount}{" "}
              {totalCount === 1 ? "faktura" : totalCount < 5 ? "faktury" : "faktur"}
              {totalPages > 1 ? ` · strona ${page} z ${totalPages}` : ""}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <InvoicesPageClient
            rows={rows}
            totalCount={totalCount}
            hasInvoicesGlobally={globalCount > 0}
            isAdmin={isAdmin}
          />

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={pageHref(page - 1)}>Poprzednia</Link>
                </Button>
              )}
              <span className="text-muted-foreground text-sm tabular-nums">
                Strona {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={pageHref(page + 1)}>Następna</Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!isAdmin && (
        <p className="text-muted-foreground text-xs">
          Usuwanie dokumentów i widok archiwum są dostępne dla administratora.
        </p>
      )}
    </div>
  );
}
