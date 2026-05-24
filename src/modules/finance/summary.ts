import prisma from "@/lib/prisma";
import type { FinancialOverview } from "@/src/modules/finance/types";

function toNum(v: unknown): number {
  if (v == null) return 0;
  return Math.round(Number(v) * 100) / 100;
}

export async function computeFinancialOverview(organizationId: string): Promise<FinancialOverview> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { currency: true },
  });

  const [incomeAgg, expenseAgg, commitmentAgg, accounts, settings] = await Promise.all([
    prisma.document.aggregate({
      where: { organizationId, archived: false, classification: "INCOME" },
      _sum: { amountGross: true },
    }),
    prisma.document.aggregate({
      where: { organizationId, archived: false, classification: "EXPENSE", isCommitment: false },
      _sum: { amountGross: true },
    }),
    prisma.document.aggregate({
      where: { organizationId, archived: false, isCommitment: true },
      _sum: { amountGross: true },
    }),
    prisma.bankAccount.findMany({ where: { organizationId }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] }),
    prisma.organizationFinancialSettings.findUnique({ where: { organizationId } }),
  ]);

  const income = toNum(incomeAgg._sum.amountGross);
  const expenses = toNum(expenseAgg._sum.amountGross);
  const docCommitments = toNum(commitmentAgg._sum.amountGross);
  const manualReserved = toNum(settings?.reservedCommitments);
  const commitments = Math.max(docCommitments, manualReserved);

  const accountBalance = accounts.reduce((sum, a) => sum + toNum(a.currentBalance), 0);
  const profit = income - expenses;
  const availableFunds = accountBalance - commitments;
  const computedAt = new Date();

  await prisma.financialSummaryCache.upsert({
    where: { organizationId },
    create: {
      organizationId,
      incomeTotal: income,
      expenseTotal: expenses,
      profitTotal: profit,
      accountBalance,
      commitments,
      availableFunds,
      computedAt,
    },
    update: {
      incomeTotal: income,
      expenseTotal: expenses,
      profitTotal: profit,
      accountBalance,
      commitments,
      availableFunds,
      computedAt,
    },
  });

  return {
    income,
    expenses,
    profit,
    accountBalance,
    commitments,
    availableFunds,
    currency: org?.currency ?? "PLN",
    computedAt,
  };
}
