"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { hashPassword } from "better-auth/crypto";

import type { OrganizationRole } from "@/generated/prisma";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

export type UserAdminRow = {
  id: string;
  name: string;
  email: string;
  role: OrganizationRole;
  banned: boolean;
};

export async function listOrgUsers(): Promise<UserAdminRow[]> {
  const { organizationId } = await requirePermission("settings.users");
  return prisma.user.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, banned: true },
  });
}

export async function updateUserRole(userId: string, role: OrganizationRole) {
  const ctx = await requirePermission("settings.users");
  if (userId === ctx.user.id) return { ok: false as const, error: "Nie możesz zmienić własnej roli." };
  await prisma.user.update({
    where: { id: userId, organizationId: ctx.organizationId },
    data: { role },
  });
  revalidatePath("/ustawienia/uzytkownicy");
  return { ok: true as const };
}

export async function setUserBanned(userId: string, banned: boolean) {
  const ctx = await requirePermission("settings.users");
  if (userId === ctx.user.id) return { ok: false as const, error: "Nie możesz dezaktywować samego siebie." };
  await prisma.user.update({
    where: { id: userId, organizationId: ctx.organizationId },
    data: { banned },
  });
  revalidatePath("/ustawienia/uzytkownicy");
  return { ok: true as const };
}

export async function createInvitedUser(formData: FormData) {
  const ctx = await requirePermission("settings.users");
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = (String(formData.get("role") ?? "USER") || "USER") as OrganizationRole;
  const password = String(formData.get("password") ?? "");
  if (!email || !name || password.length < 8) {
    return { ok: false as const, error: "Wypełnij pola (hasło min. 8 znaków)." };
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false as const, error: "Ten e-mail jest już zajęty." };

  const id = randomUUID();
  const hashed = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id,
        name,
        email,
        emailVerified: false,
        role,
        organizationId: ctx.organizationId,
        banned: false,
      },
    });
    await tx.account.create({
      data: {
        id: randomUUID(),
        userId: id,
        accountId: id,
        providerId: "credential",
        password: hashed,
      },
    });
  });

  revalidatePath("/ustawienia/uzytkownicy");
  return { ok: true as const, message: "Użytkownik został utworzony." };
}

export async function updateUserRoleAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "USER") as OrganizationRole;
  await updateUserRole(userId, role);
}

export async function setUserBannedAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const banned = String(formData.get("banned") ?? "") === "1";
  await setUserBanned(userId, banned);
}

export async function createInvitedUserAction(formData: FormData) {
  await createInvitedUser(formData);
}