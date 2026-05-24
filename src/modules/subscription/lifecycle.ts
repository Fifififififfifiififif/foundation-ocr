import type { SubscriptionStatus } from "@/generated/prisma";
import prisma from "@/lib/prisma";
import {
  listPlatformModuleRows,
  seedOrganizationModules,
} from "@/src/modules/organizations/modules";
import { writeAuditLog } from "@/src/modules/tenant/audit";
import {
  BILLING_CYCLE_DAYS,
  getPlanDefinition,
  normalizePlanId,
} from "@/src/modules/subscription/plans";
import type { SaasPlanId } from "@/src/modules/subscription/types";

export function addBillingPeriod(from: Date = new Date()): Date {
  const end = new Date(from);
  end.setDate(end.getDate() + BILLING_CYCLE_DAYS);
  return end;
}

export function isStatusActive(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}

export function isSubscriptionExpired(input: {
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  plan: string;
}): boolean {
  const plan = normalizePlanId(input.plan);
  if (plan === "free") return false;
  if (input.status === "expired" || input.status === "canceled") return true;
  if (input.status === "suspended") return true;
  if (!input.currentPeriodEnd) return false;
  return input.currentPeriodEnd.getTime() < Date.now();
}

/** Synchronizuje organization_module z planem (włącza/wyłącza moduły platformy). */
export async function syncOrganizationModulesToPlan(
  organizationId: string,
  planId: SaasPlanId,
): Promise<void> {
  await seedOrganizationModules(organizationId);
  const allowed = new Set(getPlanDefinition(planId).modules);
  const modules = await listPlatformModuleRows();

  for (const mod of modules) {
    const enabled = allowed.has(mod.key);
    await prisma.organizationModule.upsert({
      where: {
        organizationId_moduleId: { organizationId, moduleId: mod.id },
      },
      create: { organizationId, moduleId: mod.id, enabled },
      update: { enabled, disabledAt: enabled ? null : new Date() },
    });
  }
}

/** Automatyczny downgrade do FREE po wygaśnięciu. */
export async function downgradeOrganizationToFree(
  organizationId: string,
  reason: string,
): Promise<void> {
  const free = getPlanDefinition("free");
  await prisma.subscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      plan: "free",
      status: "expired",
      seats: free.limits.maxUsers,
      ocrQuotaMonthly: free.limits.maxOcrJobsMonthly,
      storageBytes: BigInt(free.limits.maxStorageBytes),
      currentPeriodStart: new Date(),
      currentPeriodEnd: null,
      billingCycle: "monthly",
    },
    update: {
      plan: "free",
      status: "expired",
      currentPeriodEnd: null,
      canceledAt: new Date(),
      seats: free.limits.maxUsers,
      ocrQuotaMonthly: free.limits.maxOcrJobsMonthly,
    },
  });

  await syncOrganizationModulesToPlan(organizationId, "free");

  await writeAuditLog({
    organizationId,
    action: "subscription.downgraded_to_free",
    metadata: { reason },
  });
}

/** Aktywacja / zmiana planu (domyślnie 30 dni od dziś). */
export async function activateOrganizationPlan(input: {
  organizationId: string;
  plan: SaasPlanId;
  status?: SubscriptionStatus;
  periodDays?: number;
  extendFromNow?: boolean;
}): Promise<void> {
  const planDef = getPlanDefinition(input.plan);
  const periodDays = input.periodDays ?? BILLING_CYCLE_DAYS;
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + periodDays);
  const status = input.status ?? "active";

  await prisma.subscription.upsert({
    where: { organizationId: input.organizationId },
    create: {
      organizationId: input.organizationId,
      plan: input.plan,
      status,
      seats: planDef.limits.maxUsers,
      ocrQuotaMonthly: planDef.limits.maxOcrJobsMonthly,
      storageBytes: BigInt(planDef.limits.maxStorageBytes),
      currentPeriodStart: start,
      currentPeriodEnd: input.plan === "free" ? null : end,
      trialEndsAt: status === "trialing" ? end : null,
      billingCycle: "monthly",
    },
    update: {
      plan: input.plan,
      status,
      seats: planDef.limits.maxUsers,
      ocrQuotaMonthly: planDef.limits.maxOcrJobsMonthly,
      storageBytes: BigInt(planDef.limits.maxStorageBytes),
      currentPeriodStart: input.extendFromNow ? start : undefined,
      currentPeriodEnd: input.plan === "free" ? null : end,
      trialEndsAt: status === "trialing" ? end : null,
      canceledAt: null,
    },
  });

  await syncOrganizationModulesToPlan(input.organizationId, input.plan);

  await writeAuditLog({
    organizationId: input.organizationId,
    action: "subscription.plan_activated",
    metadata: { plan: input.plan, status, expiresAt: end.toISOString() },
  });
}

/** Przedłużenie bieżącego okresu — dodaje dni do currentPeriodEnd (lub od dziś, jeśli brak/wygasły). */
export async function extendOrganizationSubscriptionPeriod(input: {
  organizationId: string;
  days: number;
}): Promise<{ plan: SaasPlanId; newPeriodEnd: Date | null }> {
  const days = Math.max(1, Math.floor(input.days));
  const existing = await prisma.subscription.findUnique({
    where: { organizationId: input.organizationId },
  });

  let planId = normalizePlanId(existing?.plan);
  if (planId === "free") planId = "pro";

  const planDef = getPlanDefinition(planId);
  const now = new Date();
  const base =
    existing?.currentPeriodEnd && existing.currentPeriodEnd.getTime() > now.getTime()
      ? new Date(existing.currentPeriodEnd)
      : now;

  const newEnd = new Date(base);
  newEnd.setDate(newEnd.getDate() + days);

  await prisma.subscription.upsert({
    where: { organizationId: input.organizationId },
    create: {
      organizationId: input.organizationId,
      plan: planId,
      status: "active",
      seats: planDef.limits.maxUsers,
      ocrQuotaMonthly: planDef.limits.maxOcrJobsMonthly,
      storageBytes: BigInt(planDef.limits.maxStorageBytes),
      currentPeriodStart: now,
      currentPeriodEnd: newEnd,
      billingCycle: "monthly",
    },
    update: {
      plan: planId,
      status: "active",
      seats: planDef.limits.maxUsers,
      ocrQuotaMonthly: planDef.limits.maxOcrJobsMonthly,
      currentPeriodEnd: newEnd,
      canceledAt: null,
    },
  });

  await syncOrganizationModulesToPlan(input.organizationId, planId);

  await writeAuditLog({
    organizationId: input.organizationId,
    action: "subscription.period_extended",
    metadata: { days, newPeriodEnd: newEnd.toISOString(), plan: planId },
  });

  return { plan: planId, newPeriodEnd: newEnd };
}

/** Wywoływane przy każdym żądaniu kontekstu — downgrade jeśli po terminie. */
export async function processSubscriptionLifecycle(organizationId: string): Promise<void> {
  const sub = await prisma.subscription.findUnique({ where: { organizationId } });
  if (!sub) {
    await activateOrganizationPlan({ organizationId, plan: "free", status: "active" });
    return;
  }

  if (isSubscriptionExpired(sub)) {
    if (normalizePlanId(sub.plan) !== "free") {
      await downgradeOrganizationToFree(organizationId, "subscription_period_ended");
    }
  }
}
