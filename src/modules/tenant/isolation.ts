import { redirect } from "next/navigation";
import type { OrganizationRole } from "@/generated/prisma";
import prisma from "@/lib/prisma";

/** Weryfikuje członkostwo w organizacji (aktywne). */
export async function assertOrgMembership(
  userId: string,
  organizationId: string,
): Promise<{ role: OrganizationRole; isActive: boolean }> {
  const member = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { role: true, isActive: true },
  });
  if (!member?.isActive) {
    throw new Error("NOT_ORG_MEMBER");
  }
  return member;
}

/** Organizacja musi być aktywna (nie zawieszona). */
export async function assertOrgActive(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { status: true, name: true },
  });
  if (!org) throw new Error("ORG_NOT_FOUND");
  if (org.status === "suspended") throw new Error("ORG_SUSPENDED");
  return org;
}

export async function requireActiveTenant(userId: string, organizationId: string) {
  await assertOrgActive(organizationId);
  return assertOrgMembership(userId, organizationId);
}

export function tenantWhere(organizationId: string) {
  return { organizationId } as const;
}

/** Dla zapytań po ID encji — wymaga dopasowania tenantId. */
export async function assertEntityInOrg<T extends { organizationId: string }>(
  entity: T | null,
  organizationId: string,
): Promise<T> {
  if (!entity || entity.organizationId !== organizationId) {
    throw new Error("TENANT_MISMATCH");
  }
  return entity;
}

export function redirectIfOrgSuspended() {
  redirect("/odmowa-dostepu?reason=org_suspended");
}
