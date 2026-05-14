import { getCurrentOrganizationId } from "@/lib/app-context";
import { getOrganizationById } from "@/lib/organization-settings";
import type { Organization } from "@/generated/prisma";

export async function requireOrganizationSettings(): Promise<Organization> {
  return getOrganizationById(await getCurrentOrganizationId());
}
