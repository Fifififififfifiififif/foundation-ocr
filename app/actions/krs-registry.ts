"use server";

import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { requireActionFeature } from "@/lib/entitlement-action";
import { requirePermission } from "@/lib/require-permission";
import type { OrganizationRegistryProfile } from "@/src/modules/krs/types";
import {
  lookupOrganizationRegistry,
  registryProfileToOrganizationData,
  verifyOrganizationByKrsOnServer,
} from "@/src/modules/krs/service";
import { validateLookupIdentifiers } from "@/src/modules/krs/validation";
import type { ActionResult } from "@/app/actions/foundation-settings";

export async function applyOrganizationRegistryLookupAction(input: {
  krs?: string;
  nip?: string;
  regon?: string;
}): Promise<ActionResult & { profile?: OrganizationRegistryProfile }> {
  const ctx = await requirePermission("settings.organization");
  const featureErr = requireActionFeature(ctx, "krs");
  if (featureErr) return { ok: false, error: featureErr };

  const result = await lookupOrganizationRegistry(input);
  if (!result.ok) {
    return { ok: false, error: result.message };
  }

  const data = registryProfileToOrganizationData(result.profile, result.registryRawData);

  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data,
  });

  revalidatePath("/ustawienia/organizacja");
  revalidatePath("/admin/organizations");

  return {
    ok: true,
    message: result.profile.verifiedFromKrs
      ? "Organizacja zweryfikowana w KRS i zapisana."
      : "Dane rejestrowe zapisane (bez pełnej weryfikacji KRS).",
    profile: result.profile,
  };
}

/** Ponowna weryfikacja po numerze KRS (serwer → oficjalne API). */
export async function reverifyOrganizationKrsAction(
  krs: string,
): Promise<ActionResult & { profile?: OrganizationRegistryProfile }> {
  const ctx = await requirePermission("settings.organization");
  const featureErr = requireActionFeature(ctx, "krs");
  if (featureErr) return { ok: false, error: featureErr };
  const validated = validateLookupIdentifiers({ krs });
  if (!validated.ok) return { ok: false, error: validated.message };

  const verified = await verifyOrganizationByKrsOnServer(validated.krs!);
  if (!verified) {
    return { ok: false, error: "Nie udało się zweryfikować organizacji w KRS." };
  }

  const data = registryProfileToOrganizationData(verified.profile, verified.registryRawData);
  await prisma.organization.update({ where: { id: ctx.organizationId }, data });

  revalidatePath("/ustawienia/organizacja");
  revalidatePath("/admin/organizations");
  return {
    ok: true,
    message: "Weryfikacja KRS zakończona pomyślnie.",
    profile: verified.profile,
  };
}
