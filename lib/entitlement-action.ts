import type { AppContext } from "@/lib/app-context";
import type { ModuleKey } from "@/generated/prisma";
import {
  assertFeature,
  assertModule,
  assertQuota,
  EntitlementError,
} from "@/src/modules/subscription/enforce";
import type { SubscriptionFeatureFlag } from "@/src/modules/subscription/types";

function skipEntitlement(ctx: AppContext): boolean {
  return Boolean(ctx.user.isSuperAdmin && !ctx.user.impersonating);
}

/** Sprawdzenie entitlements w server action — zwraca komunikat zamiast redirect. */
export function entitlementActionError(
  ctx: AppContext,
  check: () => void,
): string | null {
  if (skipEntitlement(ctx)) return null;
  try {
    check();
    return null;
  } catch (e) {
    if (e instanceof EntitlementError) return e.message;
    throw e;
  }
}

export function requireActionModule(ctx: AppContext, moduleKey: ModuleKey): string | null {
  return entitlementActionError(ctx, () => assertModule(ctx.entitlement, moduleKey));
}

export function requireActionFeature(
  ctx: AppContext,
  feature: SubscriptionFeatureFlag,
): string | null {
  return entitlementActionError(ctx, () => assertFeature(ctx.entitlement, feature));
}

export function requireActionQuota(
  ctx: AppContext,
  metric: "users" | "documents" | "ocr" | "exports",
): string | null {
  return entitlementActionError(ctx, () => assertQuota(ctx.entitlement, metric));
}
