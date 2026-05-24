"use server";

import { createHash } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { provisionSupabaseAuthUser } from "@/src/modules/auth/provision-user";
import { attachUserToOrganization, ensureUserProfile } from "@/src/modules/organizations/onboarding";
import { clearDevSignedOut } from "@/src/modules/auth/dev-session.server";
import { writeAuditLog } from "@/src/modules/tenant/audit";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getInviteByToken(token: string) {
  const tokenHash = hashToken(token);
  const invite = await prisma.inviteToken.findUnique({
    where: { tokenHash },
    include: { organization: { select: { id: true, name: true, status: true } } },
  });
  if (!invite) return null;
  if (invite.status !== "pending") return null;
  if (invite.expiresAt < new Date()) return null;
  if (invite.organization.status === "suspended") return null;
  return invite;
}

export async function acceptInviteAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!token || !name || password.length < 8) {
    redirect(`/zaproszenie/${token}?error=${encodeURIComponent("Uzupełnij dane (hasło min. 8 znaków).")}`);
  }

  const invite = await getInviteByToken(token);
  if (!invite) {
    redirect(`/zaproszenie/${token}?error=${encodeURIComponent("Zaproszenie wygasło lub jest nieprawidłowe.")}`);
  }

  const supabaseUserId = await provisionSupabaseAuthUser({
    email: invite.email,
    password,
    name,
    metadata: { organization_id: invite.organizationId },
  });

  let dbUser = await prisma.user.findUnique({ where: { email: invite.email } });
  if (!dbUser) {
    dbUser = await ensureUserProfile({
      supabaseUserId,
      email: invite.email,
      name,
    });
  }

  await attachUserToOrganization({
    userId: dbUser.id,
    organizationId: invite.organizationId,
    role: invite.role,
    email: invite.email,
    name,
  });

  await prisma.inviteToken.update({
    where: { id: invite.id },
    data: { status: "accepted", acceptedAt: new Date() },
  });

  await writeAuditLog({
    organizationId: invite.organizationId,
    userId: dbUser.id,
    action: "invite.accepted",
    entityType: "invite",
    entityId: invite.id,
  });

  await clearDevSignedOut();
  revalidatePath("/", "layout");
  redirect("/onboarding/welcome?joined=1");
}
