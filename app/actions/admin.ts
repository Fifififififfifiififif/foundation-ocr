"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ModuleKey, SubscriptionStatus } from "@/generated/prisma";
import prisma from "@/lib/prisma";
import { IMPERSONATE_ORG_COOKIE } from "@/lib/app-context";
import { requireSuperAdmin } from "@/lib/require-permission";
import { createOrganizationForUser } from "@/src/modules/organizations/onboarding";
import { setOrganizationModuleEnabled } from "@/src/modules/organizations/modules";
import {
  activateOrganizationPlan,
  downgradeOrganizationToFree,
  extendOrganizationSubscriptionPeriod,
} from "@/src/modules/subscription/lifecycle";
import { SAAS_PLAN_IDS, normalizePlanId } from "@/src/modules/subscription/plans";
import { writeAuditLog } from "@/src/modules/tenant/audit";

const STATUSES: SubscriptionStatus[] = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
  "suspended",
];

export async function toggleOrganizationModuleAction(
  organizationId: string,
  moduleKey: ModuleKey,
  enabled: boolean,
) {
  const ctx = await requireSuperAdmin();
  await setOrganizationModuleEnabled(organizationId, moduleKey, enabled);
  await writeAuditLog({
    organizationId,
    userId: ctx.user.id,
    action: enabled ? "platform.module_enabled" : "platform.module_disabled",
    metadata: { moduleKey },
  });
  revalidatePath("/admin/modules");
  revalidatePath("/admin/organizations");
}

export async function updateOrganizationSubscriptionAction(formData: FormData) {
  const ctx = await requireSuperAdmin();
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const plan = String(formData.get("plan") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as SubscriptionStatus;

  if (!organizationId) return;
  const planId = normalizePlanId(plan);
  if (!SAAS_PLAN_IDS.includes(planId)) return;
  if (!STATUSES.includes(status)) return;

  if (planId === "free" || status === "expired" || status === "canceled") {
    await downgradeOrganizationToFree(organizationId, "admin_override");
  } else {
    await activateOrganizationPlan({
      organizationId,
      plan: planId,
      status,
      periodDays: 30,
      extendFromNow: true,
    });
  }

  await writeAuditLog({
    organizationId,
    userId: ctx.user.id,
    action: "platform.subscription_updated",
    metadata: { plan: planId, status },
  });

  revalidatePath("/admin/organizations");
  revalidatePath("/ustawienia/subskrypcja");
}

export async function extendOrganizationSubscriptionAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireSuperAdmin();
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const days = Number(formData.get("days") ?? 30);
  if (!organizationId || !Number.isFinite(days) || days < 1) {
    return { ok: false, error: "Nieprawidłowe dane przedłużenia." };
  }

  try {
    const result = await extendOrganizationSubscriptionPeriod({ organizationId, days });

    await writeAuditLog({
      organizationId,
      userId: ctx.user.id,
      action: "platform.subscription_extended",
      metadata: { days, newPeriodEnd: result.newPeriodEnd?.toISOString() },
    });

    revalidatePath("/admin/organizations");
    revalidatePath("/ustawienia/subskrypcja");
    return { ok: true };
  } catch (err) {
    console.error("extendOrganizationSubscriptionAction", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Nie udało się przedłużyć subskrypcji.",
    };
  }
}

export async function setOrganizationStatusAction(formData: FormData) {
  const ctx = await requireSuperAdmin();
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const status = String(formData.get("status") ?? "active") as "active" | "suspended";
  const reason = String(formData.get("reason") ?? "").trim();

  if (!organizationId) return;

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      status,
      suspendedAt: status === "suspended" ? new Date() : null,
      suspendedReason: status === "suspended" ? reason || "Zawieszona przez administratora platformy" : null,
    },
  });

  await writeAuditLog({
    organizationId,
    userId: ctx.user.id,
    action: status === "suspended" ? "platform.org_suspended" : "platform.org_activated",
    metadata: { reason },
  });

  revalidatePath("/admin/organizations");
}

export async function createOrganizationManuallyAction(formData: FormData) {
  const ctx = await requireSuperAdmin();
  const orgName = String(formData.get("organizationName") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  const ownerName = String(formData.get("ownerName") ?? "").trim();

  if (!orgName || !ownerEmail) {
    redirect("/admin/organizations?error=missing_fields");
  }

  let owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner) {
    owner = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: ownerEmail,
        name: ownerName || ownerEmail,
        role: "OWNER",
      },
    });
  }

  const org = await createOrganizationForUser({
    userId: owner.id,
    name: orgName,
    email: ownerEmail,
    userName: owner.name,
    role: "OWNER",
  });

  await writeAuditLog({
    organizationId: org.id,
    userId: ctx.user.id,
    action: "platform.org_created",
    entityId: org.id,
    metadata: { orgName, ownerEmail },
  });

  revalidatePath("/admin/organizations");
  redirect(`/admin/modules?org=${org.id}`);
}

export async function impersonateOrganizationAction(organizationId: string) {
  await requireSuperAdmin();
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, status: true },
  });
  if (!org || org.status === "suspended") {
    redirect("/admin/organizations?error=invalid_org");
  }

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  redirect("/dashboard");
}

export async function stopImpersonationAction() {
  await requireSuperAdmin();
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATE_ORG_COOKIE);
  redirect("/admin");
}

export async function impersonateOrganizationFormAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  if (organizationId) await impersonateOrganizationAction(organizationId);
}
