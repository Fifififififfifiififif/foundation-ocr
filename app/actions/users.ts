"use server";

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import type { ModuleKey, OrganizationRole } from "@/generated/prisma";
import prisma from "@/lib/prisma";
import { prismaSafe } from "@/lib/prisma-safe";
import { requirePermission } from "@/lib/require-permission";
import { provisionSupabaseAuthUser } from "@/src/modules/auth/provision-user";
import { attachUserToOrganization } from "@/src/modules/organizations/onboarding";
import { getEnabledModuleKeys } from "@/src/modules/permissions/check";
import { canAssignRole, canManageUsers } from "@/src/modules/permissions/hierarchy";
import { setUserModuleGrants } from "@/src/modules/permissions/member-modules";
import { writeAuditLog } from "@/src/modules/tenant/audit";
import { requireEntitlementQuota } from "@/lib/require-entitlement";

export type UserAdminRow = {
  id: string;
  name: string;
  email: string;
  role: OrganizationRole;
  banned: boolean;
  isActive: boolean;
};

export async function listOrgUsers(): Promise<UserAdminRow[]> {
  const { organizationId } = await requirePermission("settings.users");
  const members = await prismaSafe(
    () =>
      prisma.organizationMember.findMany({
        where: { organizationId },
        include: {
          user: {
            select: { id: true, name: true, email: true, banned: true },
          },
        },
        orderBy: { user: { name: "asc" } },
      }),
    [],
  );
  return members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    banned: m.user.banned,
    isActive: m.isActive,
  }));
}

export async function updateUserRole(userId: string, role: OrganizationRole) {
  const ctx = await requirePermission("settings.users");
  if (!canManageUsers(ctx.user.role)) {
    return { ok: false as const, error: "Brak uprawnień." };
  }
  if (!canAssignRole(ctx.user.role, role)) {
    return { ok: false as const, error: "Nie możesz nadać tej roli." };
  }
  if (userId === ctx.user.id) {
    return { ok: false as const, error: "Nie możesz zmienić własnej roli." };
  }

  await prisma.organizationMember.update({
    where: {
      organizationId_userId: { organizationId: ctx.organizationId, userId },
    },
    data: { role },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  await writeAuditLog({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "user.role_changed",
    entityType: "user",
    entityId: userId,
    metadata: { role },
  });

  revalidatePath("/ustawienia/uzytkownicy");
  return { ok: true as const };
}

export async function setUserBanned(userId: string, banned: boolean) {
  const ctx = await requirePermission("settings.users");
  if (userId === ctx.user.id) {
    return { ok: false as const, error: "Nie możesz dezaktywować samego siebie." };
  }
  await prisma.user.update({
    where: { id: userId },
    data: { banned },
  });
  await prisma.organizationMember.update({
    where: {
      organizationId_userId: { organizationId: ctx.organizationId, userId },
    },
    data: { isActive: !banned },
  });

  await writeAuditLog({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: banned ? "user.deactivated" : "user.reactivated",
    entityType: "user",
    entityId: userId,
  });

  revalidatePath("/ustawienia/uzytkownicy");
  return { ok: true as const };
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Utwórz użytkownika w Supabase Auth + członkostwo w organizacji. */
export async function createOrgUser(formData: FormData) {
  const ctx = await requirePermission("settings.users");
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const role = (String(formData.get("role") ?? "MEMBER") || "MEMBER") as OrganizationRole;

  if (!email || !name || password.length < 8) {
    return { ok: false as const, error: "Wypełnij pola (hasło min. 8 znaków)." };
  }
  if (!canAssignRole(ctx.user.role, role)) {
    return { ok: false as const, error: "Nie możesz nadać tej roli." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: ctx.organizationId,
          userId: existing.id,
        },
      },
    });
    if (member) {
      return { ok: false as const, error: "Użytkownik jest już w tej organizacji." };
    }
  }

  const supabaseUserId = await provisionSupabaseAuthUser({
    email,
    password,
    name,
    metadata: {
      organization_id: ctx.organizationId,
      invited_by: ctx.user.id,
    },
  });

  const userId = existing?.id ?? supabaseUserId;

  await attachUserToOrganization({
    userId,
    organizationId: ctx.organizationId,
    role,
    email,
    name,
  });

  if (!existing) {
    await prisma.user.update({
      where: { id: userId },
      data: { supabaseUserId },
    });
  }

  await writeAuditLog({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "user.created",
    entityType: "user",
    entityId: userId,
    metadata: { email, role },
  });

  revalidatePath("/ustawienia/uzytkownicy");
  return {
    ok: true as const,
    message: `Utworzono konto ${email}. Użytkownik może się zalogować na /logowanie.`,
  };
}

/** Zaproszenie e-mailem (link /zaproszenie/[token]). */
export async function inviteOrgUser(formData: FormData) {
  const ctx = await requirePermission("settings.users");
  await requireEntitlementQuota("users");
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = (String(formData.get("role") ?? "MEMBER") || "MEMBER") as OrganizationRole;

  if (!email) return { ok: false as const, error: "Podaj email." };
  if (!canAssignRole(ctx.user.role, role)) {
    return { ok: false as const, error: "Nie możesz nadać tej roli." };
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.inviteToken.create({
    data: {
      organizationId: ctx.organizationId,
      email,
      role,
      tokenHash,
      expiresAt,
      invitedById: ctx.user.id,
    },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${base}/zaproszenie/${token}`;

  await writeAuditLog({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "user.invited",
    metadata: { email, role, inviteUrl },
  });

  revalidatePath("/ustawienia/uzytkownicy");
  return {
    ok: true as const,
    message: "Zaproszenie utworzone.",
    inviteUrl,
  };
}

export async function updateUserModulePermissions(
  userId: string,
  grants: Partial<Record<ModuleKey, boolean>>,
) {
  const ctx = await requirePermission("settings.users");
  const orgModules = await getEnabledModuleKeys(ctx.organizationId);
  const filtered: Partial<Record<ModuleKey, boolean>> = {};
  for (const [key, val] of Object.entries(grants) as [ModuleKey, boolean][]) {
    if (orgModules.has(key)) filtered[key] = val;
  }
  await setUserModuleGrants(ctx.organizationId, userId, filtered);
  revalidatePath("/ustawienia/uzytkownicy");
  return { ok: true as const };
}

export async function updateUserRoleAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "MEMBER") as OrganizationRole;
  return updateUserRole(userId, role);
}

export async function setUserBannedAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const banned = String(formData.get("banned") ?? "") === "1";
  return setUserBanned(userId, banned);
}

export async function createOrgUserAction(formData: FormData) {
  return createOrgUser(formData);
}

export async function inviteOrgUserAction(formData: FormData) {
  return inviteOrgUser(formData);
}

/** @deprecated */
export async function createInvitedUserAction(formData: FormData) {
  return createOrgUser(formData);
}
