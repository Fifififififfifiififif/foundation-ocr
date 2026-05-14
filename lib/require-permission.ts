import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/app-context";
import { type Permission, roleHasPermission } from "@/lib/permissions";

export async function requirePermission(permission: Permission) {
  const ctx = await getAppContext();
  if (!roleHasPermission(ctx.user.role, permission)) {
    redirect("/odmowa-dostepu");
  }
  return ctx;
}
