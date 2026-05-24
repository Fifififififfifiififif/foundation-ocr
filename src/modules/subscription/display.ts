import { format } from "date-fns";

import type { OrganizationEntitlement } from "@/src/modules/subscription/types";
import { getPlanDefinition, normalizePlanId } from "@/src/modules/subscription/plans";

export type SubscriptionVisualVariant = "active" | "expiring" | "expired";

export type SubscriptionDisplay = {
  planLabel: string;
  statusBadge: string;
  validityLabel: string;
  variant: SubscriptionVisualVariant;
  daysRemaining: number | null;
};

export type SubscriptionSummary = {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  daysRemaining: number | null;
  effectivePlan: string;
  isExpired: boolean;
};

export function entitlementToSummary(e: OrganizationEntitlement): SubscriptionSummary {
  return {
    plan: e.plan,
    effectivePlan: e.effectivePlan,
    status: e.status,
    currentPeriodEnd: e.currentPeriodEnd?.toISOString() ?? null,
    daysRemaining: e.daysRemaining,
    isExpired: e.isExpired,
  };
}

export function buildSubscriptionDisplay(input: SubscriptionSummary): SubscriptionDisplay {
  const planDef = getPlanDefinition(normalizePlanId(input.effectivePlan ?? input.plan));

  if (input.isExpired || input.status === "expired" || input.status === "canceled") {
    return {
      planLabel: `Plan ${planDef.label}`,
      statusBadge: "Wygasła",
      validityLabel: "Subskrypcja wygasła — plan Free",
      variant: "expired",
      daysRemaining: 0,
    };
  }

  if (input.status === "past_due") {
    return {
      planLabel: `Plan ${planDef.label}`,
      statusBadge: "Zaległość",
      validityLabel: "Wymagana płatność",
      variant: "expiring",
      daysRemaining: input.daysRemaining,
    };
  }

  if (input.status === "suspended") {
    return {
      planLabel: `Plan ${planDef.label}`,
      statusBadge: "Zawieszona",
      validityLabel: "Subskrypcja zawieszona",
      variant: "expired",
      daysRemaining: null,
    };
  }

  if (input.effectivePlan === "free" || input.plan === "free") {
    return {
      planLabel: "Plan Free",
      statusBadge: "Free",
      validityLabel: "Bezpłatny plan",
      variant: "active",
      daysRemaining: null,
    };
  }

  const days = input.daysRemaining;
  if (days != null) {
    if (days <= 14) {
      const statusBadge =
        days === 0 ? "Wygasa dziś" : `Pozostało ${days} ${days === 1 ? "dzień" : "dni"}`;
      return {
        planLabel: `Plan ${planDef.label}`,
        statusBadge,
        validityLabel: input.currentPeriodEnd
          ? `Ważne do ${format(new Date(input.currentPeriodEnd), "yyyy-MM-dd")}`
          : "Subskrypcja aktywna",
        variant: days <= 3 ? "expiring" : "expiring",
        daysRemaining: days,
      };
    }
    return {
      planLabel: `Plan ${planDef.label}`,
      statusBadge: input.status === "trialing" ? "Okres próbny" : "Aktywna",
      validityLabel: input.currentPeriodEnd
        ? `Ważne do ${format(new Date(input.currentPeriodEnd), "yyyy-MM-dd")}`
        : "Subskrypcja aktywna",
      variant: "active",
      daysRemaining: days,
    };
  }

  return {
    planLabel: `Plan ${planDef.label}`,
    statusBadge: input.status === "trialing" ? "Okres próbny" : "Aktywna",
    validityLabel: "Subskrypcja aktywna",
    variant: "active",
    daysRemaining: null,
  };
}
