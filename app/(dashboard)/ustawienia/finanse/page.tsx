import { FinancialSettingsForm } from "@/components/settings/financial-settings-form";
import { PageHeader } from "@/components/layout/page-header";
import { getAppContext } from "@/lib/app-context";
import { requireModule, requirePermission } from "@/lib/require-permission";
import prisma from "@/lib/prisma";
import type { BankAccountDto } from "@/src/modules/finance/types";

export default async function FinanseSettingsPage() {
  await requireModule("ACCOUNTING");
  await requirePermission("settings.organization");
  const { organizationId } = await getAppContext();

  const [settings, accounts] = await Promise.all([
    prisma.organizationFinancialSettings.findUnique({ where: { organizationId } }),
    prisma.bankAccount.findMany({
      where: { organizationId },
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
    }),
  ]);

  const initialAccounts: BankAccountDto[] = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    iban: a.iban,
    accountNumber: a.accountNumber,
    openingBalance: Number(a.openingBalance),
    currentBalance: Number(a.currentBalance),
    currency: a.currency,
    isPrimary: a.isPrimary,
  }));

  return (
    <>
      <PageHeader
        title="Finanse"
        description="Rachunki bankowe, salda i zobowiązania — ręczna konfiguracja bez integracji bankowej."
      />
      <FinancialSettingsForm
        initial={{
          reservedCommitments: Number(settings?.reservedCommitments ?? 0),
          notes: settings?.notes ?? null,
          accounts: initialAccounts,
        }}
      />
    </>
  );
}
