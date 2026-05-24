import type { ModuleKey, OrganizationRole } from "@/generated/prisma";
import {
  type ModulePermission,
  MODULE_PERMISSION_MAP,
  PERMISSION_TO_MODULE,
  type Permission,
  roleHasPermission,
  normalizeRole,
} from "@/src/modules/permissions/constants";
import { userHasModuleAccess } from "@/src/modules/permissions/member-modules";
import { getPlanGatedModuleKeys } from "@/src/modules/subscription/resolve";
import type { OrganizationEntitlement } from "@/src/modules/subscription/types";

/** Moduły włączone dla organizacji (plan SaaS + organization_module). */
export async function getEnabledModuleKeys(organizationId: string): Promise<Set<ModuleKey>> {
  return getPlanGatedModuleKeys(organizationId);
}

export async function organizationHasModule(organizationId: string, moduleKey: ModuleKey): Promise<boolean> {
  const enabled = await getEnabledModuleKeys(organizationId);
  return enabled.has(moduleKey);
}

export async function canUseModulePermission(
  organizationId: string,
  role: OrganizationRole | null | undefined,
  modulePerm: ModulePermission,
  isSuperAdmin = false,
): Promise<boolean> {
  if (isSuperAdmin) return true;
  const mapped = MODULE_PERMISSION_MAP[modulePerm];
  if (!roleHasPermission(role, mapped.permission)) return false;
  return organizationHasModule(organizationId, mapped.module);
}

function permissionModuleKey(permission: Permission): ModuleKey | null {
  const fromMap = PERMISSION_TO_MODULE[permission];
  if (fromMap) return fromMap;
  for (const [, mapped] of Object.entries(MODULE_PERMISSION_MAP)) {
    if (mapped.permission === permission) return mapped.module;
  }
  return null;
}

export async function hasPermissionInOrg(
  organizationId: string,
  role: OrganizationRole | null | undefined,
  permission: Permission,
  isSuperAdmin = false,
  userId?: string,
): Promise<boolean> {
  if (isSuperAdmin) return true;
  if (!roleHasPermission(normalizeRole(role), permission)) return false;

  const moduleKey = permissionModuleKey(permission);
  if (!moduleKey) return true;

  if (!userId) return organizationHasModule(organizationId, moduleKey);
  return userHasModuleAccess(organizationId, userId, role, moduleKey, false);
}

/** OCR przy uploadzie — moduł OCR + flaga planu + ustawienie organizacji. */
export function mayRunOcrPipeline(
  enabledModules: Set<ModuleKey>,
  orgOcrEnabled: boolean,
  entitlement?: Pick<OrganizationEntitlement, "features">,
): boolean {
  if (entitlement && !entitlement.features.invoice_ocr) return false;
  return enabledModules.has("OCR") && orgOcrEnabled;
}
