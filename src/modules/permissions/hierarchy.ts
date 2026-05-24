import type { OrganizationRole } from "@/generated/prisma";
import { normalizeRole } from "@/src/modules/permissions/constants";

/** Wyższy = więcej uprawnień w organizacji. */
export const ROLE_RANK: Record<OrganizationRole, number> = {
  OWNER: 60,
  ADMIN: 50,
  ACCOUNTANT: 40,
  MANAGER: 30,
  MEMBER: 20,
  VIEWER: 10,
  USER: 20,
};

export function roleRank(role: OrganizationRole | null | undefined): number {
  const r = normalizeRole(role);
  if (!r) return 0;
  return ROLE_RANK[r] ?? 0;
}

export function canManageUsers(role: OrganizationRole | null | undefined): boolean {
  const r = normalizeRole(role);
  return r === "OWNER" || r === "ADMIN";
}

export function canAssignRole(
  actorRole: OrganizationRole | null | undefined,
  targetRole: OrganizationRole,
): boolean {
  const actor = normalizeRole(actorRole);
  if (!actor) return false;
  if (targetRole === "OWNER") return actor === "OWNER";
  return roleRank(actor) > roleRank(targetRole);
}

export function isOrganizationOwner(role: OrganizationRole | null | undefined): boolean {
  return normalizeRole(role) === "OWNER";
}
