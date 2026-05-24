import type { ModuleKey } from "@/generated/prisma";
import prisma from "@/lib/prisma";
import type { OrganizationEntitlement, SubscriptionFeatureFlag } from "@/src/modules/subscription/types";
import { resolveOrganizationEntitlement } from "@/src/modules/subscription/resolve";

export class EntitlementError extends Error {
  constructor(
    message: string,
    public code: EntitlementDenialCode = "forbidden",
  ) {
    super(message);
    this.name = "EntitlementError";
  }
}

export type EntitlementDenialCode = "forbidden" | "quota" | "expired";

export async function getEntitlementOrThrow(organizationId: string): Promise<OrganizationEntitlement> {
  return resolveOrganizationEntitlement(organizationId);
}

export function assertModule(entitlement: OrganizationEntitlement, moduleKey: ModuleKey): void {
  if (!entitlement.planModules.includes(moduleKey)) {
    throw new EntitlementError(
      `Moduł niedostępny w planie ${entitlement.effectivePlan.toUpperCase()}.`,
      "forbidden",
    );
  }
}

export function assertFeature(
  entitlement: OrganizationEntitlement,
  feature: SubscriptionFeatureFlag,
): void {
  if (!entitlement.features[feature]) {
    throw new EntitlementError(
      `Funkcja niedostępna w planie ${entitlement.effectivePlan.toUpperCase()}.`,
      "forbidden",
    );
  }
}

export function assertQuota(
  entitlement: OrganizationEntitlement,
  metric: "users" | "documents" | "ocr" | "exports",
): void {
  const { limits, usage } = entitlement;
  if (metric === "users" && usage.users >= limits.maxUsers) {
    throw new EntitlementError(
      `Limit użytkowników (${limits.maxUsers}) został osiągnięty.`,
      "quota",
    );
  }
  if (metric === "documents" && usage.documentsThisMonth >= limits.maxDocumentsMonthly) {
    throw new EntitlementError(
      `Miesięczny limit dokumentów (${limits.maxDocumentsMonthly}) został osiągnięty.`,
      "quota",
    );
  }
  if (metric === "ocr" && usage.ocrThisMonth >= limits.maxOcrJobsMonthly) {
    throw new EntitlementError(
      `Limit OCR w tym miesiącu (${limits.maxOcrJobsMonthly}) został osiągnięty.`,
      "quota",
    );
  }
  if (metric === "exports" && usage.exportsThisMonth >= limits.maxExportsMonthly) {
    throw new EntitlementError(
      `Limit eksportów w tym miesiącu (${limits.maxExportsMonthly}) został osiągnięty.`,
      "quota",
    );
  }
}

export async function recordUsageMetric(
  organizationId: string,
  moduleKey: ModuleKey,
  metric: string,
  quantity = 1,
): Promise<void> {
  const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const periodEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

  await prisma.usage.upsert({
    where: {
      organizationId_moduleKey_metric_periodStart: {
        organizationId,
        moduleKey,
        metric,
        periodStart,
      },
    },
    create: { organizationId, moduleKey, metric, quantity, periodStart, periodEnd },
    update: { quantity: { increment: quantity } },
  });
}
