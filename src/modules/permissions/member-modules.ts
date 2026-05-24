import { Prisma, type ModuleKey, type OrganizationRole } from "@/generated/prisma";
import prisma from "@/lib/prisma";
import {
  DEPRECATED_MODULE_KEYS,
  parseModuleKey,
} from "@/src/modules/organizations/modules";
import { getEnabledModuleKeys } from "@/src/modules/permissions/check";
import type { Permission } from "@/src/modules/permissions/constants";
import { MODULE_PERMISSION_MAP } from "@/src/modules/permissions/constants";

/** Moduły dostępne dla użytkownika (org enabled ∩ user grant ∩ rola). */
export async function getUserEffectiveModules(
  organizationId: string,
  userId: string,
  role: OrganizationRole | null | undefined,
  isSuperAdmin = false,
): Promise<Set<ModuleKey>> {
  if (isSuperAdmin) {
    return getEnabledModuleKeys(organizationId);
  }

  const orgModules = await getEnabledModuleKeys(organizationId);
  const overrideRows = await prisma.$queryRaw<{ moduleKey: string; granted: boolean }[]>`
    SELECT "moduleKey"::text AS "moduleKey", granted
    FROM "user_module_permission"
    WHERE "organizationId" = ${organizationId}
      AND "userId" = ${userId}
      AND "moduleKey"::text NOT IN (${Prisma.join(DEPRECATED_MODULE_KEYS)})
  `;

  const overrideMap = new Map<ModuleKey, boolean>();
  for (const row of overrideRows) {
    const key = parseModuleKey(row.moduleKey);
    if (key) overrideMap.set(key, row.granted);
  }

  const effective = new Set<ModuleKey>();
  for (const key of orgModules) {
    if (overrideMap.has(key)) {
      if (overrideMap.get(key)) effective.add(key);
      continue;
    }
    effective.add(key);
  }
  return effective;
}

export async function userHasModuleAccess(
  organizationId: string,
  userId: string,
  role: OrganizationRole | null | undefined,
  moduleKey: ModuleKey,
  isSuperAdmin = false,
): Promise<boolean> {
  const mods = await getUserEffectiveModules(organizationId, userId, role, isSuperAdmin);
  return mods.has(moduleKey);
}

export async function setUserModuleGrants(
  organizationId: string,
  userId: string,
  grants: Partial<Record<ModuleKey, boolean>>,
) {
  for (const [moduleKey, granted] of Object.entries(grants) as [ModuleKey, boolean][]) {
    await prisma.userModulePermission.upsert({
      where: {
        organizationId_userId_moduleKey: { organizationId, userId, moduleKey },
      },
      create: { organizationId, userId, moduleKey, granted },
      update: { granted },
    });
  }
}

export function permissionRequiresModule(permission: Permission): ModuleKey | null {
  for (const [, mapped] of Object.entries(MODULE_PERMISSION_MAP)) {
    if (mapped.permission === permission) return mapped.module;
  }
  return null;
}
