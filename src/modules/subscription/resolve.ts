import { differenceInCalendarDays, startOfDay } from "date-fns";

import type { ModuleKey } from "@/generated/prisma";
import prisma from "@/lib/prisma";
import {
  getPlanDefinition,
  normalizePlanId,
} from "@/src/modules/subscription/plans";
import type { SaasPlanId } from "@/src/modules/subscription/types";
import {
  isStatusActive,
  isSubscriptionExpired,
  processSubscriptionLifecycle,
} from "@/src/modules/subscription/lifecycle";
import type { OrganizationEntitlement } from "@/src/modules/subscription/types";
import {
  ensureDeprecatedModulesPurged,
  listOrganizationModuleRows,
} from "@/src/modules/organizations/modules";

async function countUsage(organizationId: string) {
  const monthStart = startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [users, documentsThisMonth, ocrUsage, exportUsage] = await Promise.all([
    prisma.organizationMember.count({
      where: { organizationId, isActive: true },
    }),
    prisma.document.count({
      where: { organizationId, createdAt: { gte: monthStart } },
    }),
    prisma.usage.aggregate({
      where: {
        organizationId,
        moduleKey: "OCR",
        metric: "ocr_jobs",
        periodStart: { gte: monthStart },
      },
      _sum: { quantity: true },
    }),
    prisma.usage.aggregate({
      where: {
        organizationId,
        moduleKey: "EXPORTS",
        metric: "exports",
        periodStart: { gte: monthStart },
      },
      _sum: { quantity: true },
    }),
  ]);

  return {
    users,
    documentsThisMonth,
    ocrThisMonth: ocrUsage._sum.quantity ?? 0,
    exportsThisMonth: exportUsage._sum.quantity ?? 0,
  };
}

export async function resolveOrganizationEntitlement(
  organizationId: string,
): Promise<OrganizationEntitlement> {
  await processSubscriptionLifecycle(organizationId);

  const sub = await prisma.subscription.findUnique({ where: { organizationId } });
  const plan = normalizePlanId(sub?.plan);
  const status = sub?.status ?? "active";
  const expired = sub ? isSubscriptionExpired(sub) : false;
  const active = sub ? isStatusActive(status) && !expired : true;
  const effectivePlan: SaasPlanId = active ? plan : "free";
  const planDef = getPlanDefinition(effectivePlan);

  const end = sub?.currentPeriodEnd ? startOfDay(sub.currentPeriodEnd) : null;
  const today = startOfDay(new Date());
  const daysRemaining =
    end && active ? Math.max(0, differenceInCalendarDays(end, today)) : null;

  const usage = await countUsage(organizationId);

  return {
    organizationId,
    plan,
    effectivePlan,
    status,
    isActive: active,
    isExpired: expired,
    daysRemaining,
    currentPeriodStart: sub?.currentPeriodStart ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    trialEndsAt: sub?.trialEndsAt ?? null,
    billingCycle: sub?.billingCycle ?? "monthly",
    planModules: planDef.modules,
    limits: planDef.limits,
    features: planDef.features,
    usage,
  };
}

/** Moduły dostępne dla organizacji (plan + opcjonalne wyłączenia w organization_module). */
export async function getPlanGatedModuleKeys(organizationId: string): Promise<Set<ModuleKey>> {
  await ensureDeprecatedModulesPurged();
  const entitlement = await resolveOrganizationEntitlement(organizationId);
  const allowed = new Set(entitlement.planModules);

  const rows = await listOrganizationModuleRows(organizationId);

  if (rows.length === 0) return allowed;

  const enabled = new Set<ModuleKey>();
  for (const row of rows) {
    if (row.enabled && allowed.has(row.key)) {
      enabled.add(row.key);
    }
  }
  return enabled;
}
