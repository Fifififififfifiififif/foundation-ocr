import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/app-context";
import {
  assertFeature,
  assertModule,
  assertQuota,
  EntitlementError,
} from "@/src/modules/subscription/enforce";
import type { ModuleKey } from "@/generated/prisma";
import type { SubscriptionFeatureFlag } from "@/src/modules/subscription/types";

export async function requireEntitlementModule(moduleKey: ModuleKey) {
  const ctx = await getAppContext();
  if (ctx.user.isSuperAdmin && !ctx.user.impersonating) return ctx;
  try {
    assertModule(ctx.entitlement, moduleKey);
  } catch (e) {
    if (e instanceof EntitlementError) {
      redirect(`/odmowa-dostepu?reason=entitlement&msg=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }
  return ctx;
}

export async function requireEntitlementFeature(feature: SubscriptionFeatureFlag) {
  const ctx = await getAppContext();
  if (ctx.user.isSuperAdmin && !ctx.user.impersonating) return ctx;
  try {
    assertFeature(ctx.entitlement, feature);
  } catch (e) {
    if (e instanceof EntitlementError) {
      redirect(`/odmowa-dostepu?reason=entitlement&msg=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }
  return ctx;
}

export async function requireEntitlementQuota(metric: "users" | "documents" | "ocr" | "exports") {
  const ctx = await getAppContext();
  if (ctx.user.isSuperAdmin && !ctx.user.impersonating) return ctx;
  try {
    assertQuota(ctx.entitlement, metric);
  } catch (e) {
    if (e instanceof EntitlementError) {
      redirect(`/odmowa-dostepu?reason=quota&msg=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }
  return ctx;
}
