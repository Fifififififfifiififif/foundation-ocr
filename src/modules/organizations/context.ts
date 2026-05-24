import { cookies } from "next/headers";
import type { OrganizationRole } from "@/generated/prisma";
import prisma from "@/lib/prisma";

const ACTIVE_ORG_COOKIE = "active_organization_id";

export async function getActiveOrganizationId(userId: string): Promise<string | null> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  if (fromCookie) {
    const member = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: fromCookie, userId } },
      select: { organizationId: true },
    });
    if (member) return member.organizationId;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  if (user?.organizationId) return user.organizationId;

  const first = await prisma.organizationMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true },
  });
  return first?.organizationId ?? null;
}

export async function getMembershipRole(
  userId: string,
  organizationId: string,
): Promise<OrganizationRole | null> {
  const member = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { role: true },
  });
  return member?.role ?? null;
}

export async function listUserOrganizations(userId: string) {
  return prisma.organizationMember.findMany({
    where: { userId },
    include: {
      organization: {
        select: { id: true, name: true, slug: true, logoPath: true, accentColor: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function setActiveOrganization(userId: string, organizationId: string) {
  const member = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
  if (!member) throw new Error("Not a member of this organization");

  await prisma.user.update({
    where: { id: userId },
    data: { organizationId, role: member.role },
  });

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
