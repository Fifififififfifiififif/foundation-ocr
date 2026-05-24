import { redirect } from "next/navigation";

import { requireEntitlementModule, requireEntitlementQuota } from "@/lib/require-entitlement";
import { requirePermission } from "@/lib/require-permission";
import { mayRunOcrPipeline } from "@/src/modules/permissions/check";
import { getOrganizationById } from "@/lib/organization-settings";

/** Strony i akcje OCR — moduł SaaS musi być włączony. */
export async function requireOcrModule() {
  return requireEntitlementModule("OCR");
}

/** Server action: uruchomienie OCR (moduł + uprawnienie ocr.use + ustawienie org). */
export async function requireOcrExecution() {
  const ctx = await requirePermission("ocr.use");
  await requireEntitlementModule("OCR");
  await requireEntitlementQuota("ocr");
  if (!ctx.enabledModules.has("OCR")) {
    redirect("/odmowa-dostepu?reason=module_disabled&module=OCR");
  }
  const org = await getOrganizationById(ctx.organizationId);
  if (!mayRunOcrPipeline(ctx.enabledModules, org.ocrEnabled)) {
    return { ctx, org, allowed: false as const };
  }
  return { ctx, org, allowed: true as const };
}
