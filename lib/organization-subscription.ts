import { entitlementToSummary } from "@/src/modules/subscription/display";
import { resolveOrganizationEntitlement } from "@/src/modules/subscription/resolve";
import type { SubscriptionSummary } from "@/lib/subscription-display";

/** Subskrypcja bieżącej organizacji (plan, status, ważność, limity). */
export async function getOrganizationSubscriptionSummary(
  organizationId: string,
): Promise<SubscriptionSummary> {
  try {
    const entitlement = await resolveOrganizationEntitlement(organizationId);
    return entitlementToSummary(entitlement);
  } catch {
    return {
      plan: "free",
      effectivePlan: "free",
      status: "active",
      currentPeriodEnd: null,
      daysRemaining: null,
      isExpired: false,
    };
  }
}

export { resolveOrganizationEntitlement };
