import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/app-context";
import { type Permission } from "@/lib/permissions";
import { hasPermissionInOrg } from "@/src/modules/permissions/check";

export async function requirePermission(permission: Permission) {
  const ctx = await getAppContext();
  if (ctx.user.banned) {
    redirect("/odmowa-dostepu?reason=banned");
  }

  const allowed = ctx.user.isSuperAdmin
    ? true
    : await hasPermissionInOrg(
        ctx.organizationId,
        ctx.user.role,
        permission,
        false,
        ctx.user.id,
      );

  if (!allowed) {
    redirect("/odmowa-dostepu?reason=permission_denied");
  }

  return ctx;
}

export async function requireSuperAdmin() {
  const ctx = await getAppContext();
  if (!ctx.user.isSuperAdmin) {
    redirect("/odmowa-dostepu");
  }
  return ctx;
}

export async function requireModule(moduleKey: import("@/generated/prisma").ModuleKey) {
  const ctx = await getAppContext();
  if (ctx.user.isSuperAdmin) return ctx;
  if (!ctx.enabledModules.has(moduleKey)) {
    redirect("/odmowa-dostepu?reason=module_disabled");
  }
  return ctx;
}
