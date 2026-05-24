import { NextResponse } from "next/server";

import type { AppContext } from "@/lib/app-context";
import type { ModuleKey } from "@/generated/prisma";
import {
  assertFeature,
  assertModule,
  assertQuota,
  EntitlementError,
} from "@/src/modules/subscription/enforce";
import type { SubscriptionFeatureFlag } from "@/src/modules/subscription/types";

export function apiEntitlementDenied(
  error: EntitlementError,
): NextResponse<{ error: string; code: string }> {
  const status = error.code === "quota" ? 402 : error.code === "expired" ? 403 : 403;
  return NextResponse.json({ error: error.message, code: error.code }, { status });
}

export function enforceApiModule(ctx: AppContext, moduleKey: ModuleKey): NextResponse | null {
  if (ctx.user.isSuperAdmin && !ctx.user.impersonating) return null;
  try {
    assertModule(ctx.entitlement, moduleKey);
    return null;
  } catch (e) {
    if (e instanceof EntitlementError) return apiEntitlementDenied(e);
    throw e;
  }
}

export function enforceApiFeature(
  ctx: AppContext,
  feature: SubscriptionFeatureFlag,
): NextResponse | null {
  if (ctx.user.isSuperAdmin && !ctx.user.impersonating) return null;
  try {
    assertFeature(ctx.entitlement, feature);
    return null;
  } catch (e) {
    if (e instanceof EntitlementError) return apiEntitlementDenied(e);
    throw e;
  }
}

export function enforceApiQuota(
  ctx: AppContext,
  metric: "users" | "documents" | "ocr" | "exports",
): NextResponse | null {
  if (ctx.user.isSuperAdmin && !ctx.user.impersonating) return null;
  try {
    assertQuota(ctx.entitlement, metric);
    return null;
  } catch (e) {
    if (e instanceof EntitlementError) return apiEntitlementDenied(e);
    throw e;
  }
}
