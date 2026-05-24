import Link from "next/link";
import { startOfMonth, subMonths } from "date-fns";

import { DashboardCharts } from "@/components/analytics/dashboard-charts";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { UNASSIGNED_LABEL } from "@/lib/optional-relation-ids";
import { documentStatusPl } from "@/lib/ui-i18n";
import { requireEntitlementModule } from "@/lib/require-entitlement";

export default async function RaportyPage() {
  const { organizationId: orgId } = await requireEntitlementModule("ANALYTICS");
  const since = startOfMonth(subMonths(new Date(), 11));
  const docWhere = { organizationId: orgId, archived: false as const };

  const [
    byProject,
    projects,
    statusGroup,
    contractorGroup,
    trendRows,
    totalDocuments,
    totalOcr,
    expenseAgg,
  ] = await Promise.all([
    prisma.document.groupBy({
      by: ["projectId"],
      where: docWhere,
      _sum: { amountGross: true },
      orderBy: { _sum: { amountGross: "desc" } },
    }),
    prisma.project.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, budget: true },
    }),
    prisma.document.groupBy({
      by: ["status"],
      where: docWhere,
      _count: { id: true },
    }),
    prisma.document.groupBy({
      by: ["contractorId"],
      where: docWhere,
      _sum: { amountGross: true },
      orderBy: { _sum: { amountGross: "desc" } },
      take: 8,
    }),
    prisma.$queryRaw<
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
      WHERE archived = false
        AND "organizationId" = ${orgId}
        AND "issueDate" IS NOT NULL
        AND "issueDate" >= ${since}
      GROUP BY to_char("issueDate", 'YYYY-MM')
      ORDER BY ym ASC
    `),
    prisma.document.count({ where: docWhere }),
    prisma.document.count({ where: { ...docWhere, ocrRawText: { not: null } } }),
    prisma.document.aggregate({
      where: docWhere,
      _sum: { amountGross: true },
    }),
  ]);

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

  const kpiSpendTotal = Number(expenseAgg._sum.amountGross ?? 0);

  const statusData = (["draft", "review", "approved"] as const).map((s) => {
    const row = statusGroup.find((x) => x.status === s);
    return { name: documentStatusPl(s), value: row?._count.id ?? 0 };
  });

  const contractors = await prisma.contractor.findMany({
    where: {
      organizationId: orgId,
      id: {
        in: contractorGroup.map((c) => c.contractorId).filter((id): id is string => id != null),
      },
    },
    select: { id: true, name: true },
  });
  const cName = Object.fromEntries(contractors.map((c) => [c.id, c.name]));
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          className="mb-0"
          title="Raporty"
          description="Wykresy trendów wydatków, statusów faktur, kontrahentów oraz wykorzystania budżetu projektów."
        />
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">Pulpit</Link>
        </Button>
      </div>

      <DashboardCharts
        monthlySpend={monthlySpend}
        ocrActivity={ocrActivity}
        statusData={statusData}
        contractorSpend={contractorSpend}
        projectUsage={projectUsage}
        kpiSpendTotal={kpiSpendTotal}
        kpiOcrCount={totalOcr}
        kpiDocumentCount={totalDocuments}
      />
    </div>
  );
}
