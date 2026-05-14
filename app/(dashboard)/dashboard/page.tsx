import Link from "next/link";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { pl } from "date-fns/locale";

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
import { DashboardCharts } from "@/components/analytics/dashboard-charts";
import { InvoiceCalendar } from "@/components/calendar/invoice-calendar";
import { PageHeader } from "@/components/layout/page-header";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { parseDashboardPrefs } from "@/lib/dashboard-prefs";
import { formatMoneyPl } from "@/lib/format/money";
import { getAppContext } from "@/lib/app-context";
import { getOrganizationById } from "@/lib/organization-settings";
import { isPrismaMissingSchemaObject } from "@/lib/prisma-recoverable";
import { breadcrumbSegmentPl } from "@/lib/i18n/navigation";
import { UNASSIGNED_LABEL } from "@/lib/optional-relation-ids";
import { documentStatusPl } from "@/lib/ui-i18n";

export default async function DashboardPage() {
  const { organizationId: orgId } = await getAppContext();
  const orgWhere = { organizationId: orgId };
  const orgRow = await getOrganizationById(orgId);

  try {
    await prisma.document.findFirst({ where: orgWhere, select: { id: true } });
  } catch (e) {
    if (isPrismaMissingSchemaObject(e)) {
      return (
        <div className="flex flex-col gap-6">
          <PageHeader
            title={breadcrumbSegmentPl.dashboard}
            description="W bazie nie ma jeszcze tabel aplikacji (np. document). Pulpit ze statystykami jest wyłączony, dopóki nie wdrożysz migracji."
          />
          <Card className="border-border/80 max-w-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Co zrobić</CardTitle>
              <CardDescription>Z katalogu projektu, na tej samej bazie co DATABASE_URL w pliku .env:</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 font-mono text-sm">
              <p>
                <code className="bg-muted rounded px-1.5 py-0.5">npm run db:deploy</code>
              </p>
              <p>
                Opcjonalnie przykładowe dane:{" "}
                <code className="bg-muted rounded px-1.5 py-0.5">npm run db:seed</code>
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
    throw e;
  }

  const since = startOfMonth(subMonths(new Date(), 11));

  const [
    totalDocuments,
    totalOcr,
    awaiting,
    overduePayments,
    expenseAgg,
    byProject,
    projects,
    recent,
    statusGroup,
    contractorGroup,
    allContractors,
    currentMonthAgg,
  ] = await Promise.all([
    prisma.document.count({ where: { ...orgWhere, archived: false } }),
    prisma.document.count({ where: { ...orgWhere, archived: false, ocrRawText: { not: null } } }),
    prisma.document.count({ where: { ...orgWhere, archived: false, status: "review" } }),
    prisma.document.count({
      where: {
        ...orgWhere,
        archived: false,
        paymentDate: { not: null, lt: new Date() },
        status: { not: "approved" },
      },
    }),
    prisma.document.aggregate({
      where: { ...orgWhere, archived: false },
      _sum: { amountGross: true },
    }),
    prisma.document.groupBy({
      by: ["projectId"],
      where: { ...orgWhere, archived: false },
      _sum: { amountGross: true },
      orderBy: { _sum: { amountGross: "desc" } },
    }),
    prisma.project.findMany({
      where: orgWhere,
      select: { id: true, name: true, budget: true },
    }),
    prisma.document.findMany({
      where: { ...orgWhere, archived: false },
      take: 8,
      orderBy: { updatedAt: "desc" },
      include: {
        project: { select: { name: true } },
        contractor: { select: { name: true } },
      },
    }),
    prisma.document.groupBy({
      by: ["status"],
      where: { ...orgWhere, archived: false },
      _count: { id: true },
    }),
    prisma.document.groupBy({
      by: ["contractorId"],
      where: { ...orgWhere, archived: false },
      _sum: { amountGross: true },
      orderBy: { _sum: { amountGross: "desc" } },
      take: 8,
    }),
    prisma.contractor.findMany({
      where: orgWhere,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.document.aggregate({
      where: {
        ...orgWhere,
        archived: false,
        issueDate: {
          gte: startOfMonth(new Date()),
          lte: endOfMonth(new Date()),
        },
      },
      _sum: { amountGross: true },
      _count: true,
    }),
  ]);

  const organization = orgRow;
  const dashPrefs = parseDashboardPrefs(organization.dashboardPreferences);

  const projectName = Object.fromEntries(projects.map((p) => [p.id, p.name]));
  const totalExpensesNum = Number(expenseAgg._sum.amountGross ?? 0);

  const trendRows = await prisma.$queryRaw<
    { ym: string; brutto: unknown; doc_count: bigint; with_ocr: bigint }[]
  >(Prisma.sql`
    SELECT
      to_char("issueDate", 'YYYY-MM') AS ym,
      COALESCE(SUM("amountGross"), 0) AS brutto,
      COUNT(*)::bigint AS doc_count,
      COUNT(*) FILTER (
        WHERE "ocrRawText" IS NOT NULL AND length(trim("ocrRawText")) > 0
      )::bigint AS with_ocr
    FROM "document"
    WHERE "organizationId" = ${orgId}
      AND archived = false
      AND "issueDate" IS NOT NULL
      AND "issueDate" >= ${since}
    GROUP BY to_char("issueDate", 'YYYY-MM')
    ORDER BY ym ASC
  `);

  const monthlySpend = trendRows.map((r) => ({
    month: r.ym,
    brutto: Math.round(Number(r.brutto) * 100) / 100,
  }));

  const ocrActivity = trendRows.map((r) => {
    const total = Number(r.doc_count);
    const withOcr = Number(r.with_ocr);
    return {
      month: r.ym,
      total,
      withOcr,
      withoutOcr: Math.max(0, total - withOcr),
      rate: total ? Math.round((100 * withOcr) / total) : 0,
    };
  });

  const statusData = (["draft", "review", "approved"] as const).map((s) => {
    const row = statusGroup.find((x) => x.status === s);
    return { name: documentStatusPl(s), value: row?._count.id ?? 0 };
  });

  const cName = Object.fromEntries(allContractors.map((c) => [c.id, c.name]));
  const contractorSpend = contractorGroup.map((c) => ({
    name: c.contractorId ? (cName[c.contractorId] ?? c.contractorId) : UNASSIGNED_LABEL,
    brutto: Math.round(Number(c._sum.amountGross ?? 0) * 100) / 100,
  }));

  const spentByProject = Object.fromEntries(
    byProject.map((b) => [b.projectId ?? "", Number(b._sum.amountGross ?? 0)]),
  );
  const unassignedProjectSpent = spentByProject[""] ?? 0;
  const projectUsage = [
    ...projects.map((p) => ({
      name: p.name.length > 18 ? `${p.name.slice(0, 18)}…` : p.name,
      fullName: p.name,
      budget: p.budget != null ? Number(p.budget) : 0,
      spent: Math.round((spentByProject[p.id] ?? 0) * 100) / 100,
    })),
    ...(unassignedProjectSpent > 0
      ? [
          {
            name: "Bez projektu",
            fullName: UNASSIGNED_LABEL,
            budget: 0,
            spent: Math.round(unassignedProjectSpent * 100) / 100,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={breadcrumbSegmentPl.dashboard}
        description="Przegląd faktur, OCR i wydatków — dane w czasie rzeczywistym z bazy."
      />

      {dashPrefs.widgets.kpi && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border/80 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md">
              <CardHeader className="flex flex-col items-center pb-2 text-center">
                <CardTitle className="text-muted-foreground w-full text-xs font-medium uppercase">
                  Faktury łącznie
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center text-center">
                <p className="text-3xl font-semibold tabular-nums">{totalDocuments}</p>
                <CardDescription className="mt-2 w-full text-balance text-center text-xs leading-relaxed sm:text-sm">
                  Aktywne (bez archiwum)
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md">
              <CardHeader className="flex flex-col items-center pb-2 text-center">
                <CardTitle className="text-muted-foreground w-full text-xs font-medium uppercase">
                  Z OCR
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center text-center">
                <p className="text-3xl font-semibold tabular-nums">{totalOcr}</p>
                <CardDescription className="mt-2 w-full text-balance text-center text-xs leading-relaxed sm:text-sm">
                  Przetworzone lokalnie (OCR)
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md">
              <CardHeader className="flex flex-col items-center pb-2 text-center">
                <CardTitle className="text-muted-foreground w-full text-xs font-medium uppercase">
                  Do weryfikacji
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center text-center">
                <p className="text-3xl font-semibold tabular-nums">{awaiting}</p>
                <CardDescription className="mt-2 w-full text-balance text-center text-xs leading-relaxed sm:text-sm">
                  Status: weryfikacja
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md">
              <CardHeader className="flex flex-col items-center pb-2 text-center">
                <CardTitle className="text-muted-foreground w-full text-xs font-medium uppercase">
                  Wydatki brutto
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center text-center">
                <p className="text-3xl font-semibold tabular-nums">{formatMoneyPl(totalExpensesNum)}</p>
                <CardDescription className="mt-2 w-full text-balance text-center text-xs leading-relaxed sm:text-sm">
                  Suma zapisanych kwot
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-2">
            <Card className="border-border/80 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md">
              <CardHeader className="flex flex-col items-center pb-2 text-center">
                <CardTitle className="text-muted-foreground w-full text-xs font-medium uppercase">
                  Przeterminowane płatności
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center text-center">
                <p className="text-3xl font-semibold tabular-nums">{overduePayments}</p>
                <CardDescription className="mt-2 w-full text-balance text-center text-xs leading-relaxed sm:text-sm">
                  Termin płatności minął, status inny niż zatwierdzony
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md">
              <CardHeader className="flex flex-col items-center pb-2 text-center">
                <CardTitle className="text-muted-foreground w-full text-xs font-medium uppercase">
                  Wydatki brutto — bieżący miesiąc
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center text-center">
                <p className="text-3xl font-semibold tabular-nums">
                  {formatMoneyPl(Number(currentMonthAgg._sum.amountGross ?? 0))}
                </p>
                <CardDescription className="mt-2 w-full text-balance text-center text-xs leading-relaxed sm:text-sm">
                  {currentMonthAgg._count}{" "}
                  {currentMonthAgg._count === 1 ? "faktura" : currentMonthAgg._count < 5 ? "faktury" : "faktur"} wg daty
                  wystawienia
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {dashPrefs.widgets.calendar && (
      <Card className="border-border/80 w-full shadow-sm transition-all duration-200 hover:border-border hover:shadow-md">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl space-y-1">
              <CardTitle className="text-xl tracking-tight">Kalendarz faktur</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Faktury według daty wystawienia. Kliknij dzień, aby zobaczyć listę i szybkie akcje. Filtry odświeżają
                dane automatycznie.
              </CardDescription>
            </div>
            <div className="bg-muted/50 border-border/60 shrink-0 rounded-xl border px-5 py-4 text-left sm:min-w-[12rem] sm:text-right">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">Bieżący miesiąc</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                {currentMonthAgg._count}{" "}
                {currentMonthAgg._count === 1 ? "faktura" : currentMonthAgg._count < 5 ? "faktury" : "faktur"}
              </p>
              <p className="text-muted-foreground mt-2 text-xs leading-snug">
                Suma brutto (wg daty wystawienia w tym miesiącu)
              </p>
              <p className="text-foreground mt-1 text-lg font-semibold tabular-nums">
                {formatMoneyPl(Number(currentMonthAgg._sum.amountGross ?? 0))}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pt-2 pb-8 sm:px-6 sm:pt-4">
          <InvoiceCalendar
            variant="embedded"
            projects={projects.map((p) => ({ id: p.id, name: p.name }))}
            contractors={allContractors}
          />
        </CardContent>
      </Card>
      )}

      {dashPrefs.widgets.charts && (
      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Analityka</h2>
            <p className="text-muted-foreground max-w-2xl text-sm">
              Wydatki, statusy, kontrahenci, OCR oraz wykorzystanie budżetu — dane z ostatnich 12 miesięcy wg daty
              wystawienia.
            </p>
          </div>
        </div>
        <DashboardCharts
          monthlySpend={monthlySpend}
          ocrActivity={ocrActivity}
          statusData={statusData}
          contractorSpend={contractorSpend}
          projectUsage={projectUsage}
          kpiSpendTotal={totalExpensesNum}
          kpiOcrCount={totalOcr}
          kpiDocumentCount={totalDocuments}
        />
      </section>
      )}

      {dashPrefs.widgets.projectsBreakdown && (
      <Card className="border-border/80 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Wydatki wg projektu</CardTitle>
            <CardDescription>Suma kwot brutto przypisanych do projektu</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/documents">Faktury</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {byProject.length === 0 ? (
            <p className="text-muted-foreground text-sm">Brak danych o wydatkach.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projekt</TableHead>
                  <TableHead className="text-right">Suma brutto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byProject.map((row) => (
                  <TableRow key={row.projectId ?? "none"}>
                    <TableCell>
                      {row.projectId ? (projectName[row.projectId] ?? row.projectId) : UNASSIGNED_LABEL}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row._sum.amountGross != null
                        ? formatMoneyPl(Number(row._sum.amountGross))
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      )}

      {dashPrefs.widgets.recent && (
      <Card className="border-border/80 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Ostatnia aktywność</CardTitle>
            <CardDescription>
              Ostatnie zmiany — {format(new Date(), "d MMMM yyyy", { locale: pl })}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/documents">Wszystkie faktury</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">Brak dokumentów.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faktura</TableHead>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Kontrahent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aktualizacja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Link href={`/documents/${d.id}`} className="font-medium hover:underline">
                        {d.invoiceNumber ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate">
                      {d.project?.name ?? UNASSIGNED_LABEL}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate">
                      {d.contractor?.name ?? UNASSIGNED_LABEL}
                    </TableCell>
                    <TableCell>{documentStatusPl(d.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {format(d.updatedAt, "yyyy-MM-dd HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
