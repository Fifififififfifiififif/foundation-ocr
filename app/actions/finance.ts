"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import prisma from "@/lib/prisma";
import { requireModule, requirePermission } from "@/lib/require-permission";
import { computeFinancialOverview } from "@/src/modules/finance/summary";
import type { FinancialOverview } from "@/src/modules/finance/types";
import { writeAuditLog } from "@/src/modules/tenant/audit";

export type FinanceActionResult =
  | { ok: true; message?: string; overview?: FinancialOverview }
  | { ok: false; error: string };

const bankAccountSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Nazwa konta jest wymagana."),
  iban: z.string().optional(),
  accountNumber: z.string().optional(),
  openingBalance: z.coerce.number().default(0),
  currentBalance: z.coerce.number(),
  currency: z.string().default("PLN"),
  isPrimary: z.coerce.boolean().optional(),
});

const financialSettingsSchema = z.object({
  reservedCommitments: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  accounts: z.array(bankAccountSchema).default([]),
});

function touchFinancePaths() {
  revalidatePath("/dashboard");
  revalidatePath("/ustawienia/finanse");
}

export async function getFinancialOverviewAction(): Promise<FinancialOverview> {
  const { organizationId } = await requireModule("ACCOUNTING");
  return computeFinancialOverview(organizationId);
}

export async function saveFinancialSettingsAction(input: unknown): Promise<FinanceActionResult> {
  const { organizationId, user } = await requireModule("ACCOUNTING");
  await requirePermission("settings.organization");

  const parsed = financialSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Błąd walidacji." };
  }

  const { reservedCommitments, notes, accounts } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.organizationFinancialSettings.upsert({
      where: { organizationId },
      create: { organizationId, reservedCommitments, notes: notes?.trim() || null },
      update: { reservedCommitments, notes: notes?.trim() || null },
    });

    const existing = await tx.bankAccount.findMany({
      where: { organizationId },
      select: { id: true },
    });
    const keepIds = new Set(accounts.map((a) => a.id).filter(Boolean) as string[]);

    for (const row of existing) {
      if (!keepIds.has(row.id)) {
        await tx.bankAccount.delete({ where: { id: row.id } });
      }
    }

    let primarySet = false;
    for (let i = 0; i < accounts.length; i++) {
      const acc = accounts[i]!;
      const isPrimary = acc.isPrimary === true || (!primarySet && i === 0);
      if (isPrimary) primarySet = true;

      if (acc.id) {
        const owned = await tx.bankAccount.findFirst({
          where: { id: acc.id, organizationId },
          select: { id: true },
        });
        if (!owned) continue;
        await tx.bankAccount.update({
          where: { id: acc.id },
          data: {
            name: acc.name,
            iban: acc.iban?.trim() || null,
            accountNumber: acc.accountNumber?.trim() || null,
            openingBalance: acc.openingBalance,
            currentBalance: acc.currentBalance,
            currency: acc.currency || "PLN",
            isPrimary,
            sortOrder: i,
          },
        });
      } else {
        await tx.bankAccount.create({
          data: {
            organizationId,
            name: acc.name,
            iban: acc.iban?.trim() || null,
            accountNumber: acc.accountNumber?.trim() || null,
            openingBalance: acc.openingBalance,
            currentBalance: acc.currentBalance,
            currency: acc.currency || "PLN",
            isPrimary,
            sortOrder: i,
          },
        });
      }
    }
  });

  const overview = await computeFinancialOverview(organizationId);

  await writeAuditLog({
    organizationId,
    userId: user.id,
    action: "finance.settings_updated",
    metadata: { accountCount: accounts.length },
  });

  touchFinancePaths();
  return { ok: true, message: "Ustawienia finansowe zapisane.", overview };
}
