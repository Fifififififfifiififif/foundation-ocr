import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import type { OrganizationRole } from "@/generated/prisma";
import prisma from "@/lib/prisma";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: OrganizationRole | null;
};

/** Sesja Better Auth (bez pełnej walidacji DB — użyj `getAppContext` w chronionych widokach). */
export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect("/logowanie");
  }
  return session;
}

/**
 * Kontekst SaaS: zalogowany użytkownik + jego organizacja (tenant).
 * Wszystkie zapytania biznesowe muszą filtrować po `organizationId`.
 */
export async function getAppContext(): Promise<{ organizationId: string; user: AppUser }> {
  const session = await requireAuth();
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      organizationId: true,
      banned: true,
    },
  });

  if (!dbUser || dbUser.banned) {
    redirect("/logowanie?komunikat=konto-niedostepne");
  }
  if (!dbUser.organizationId) {
    redirect("/logowanie?komunikat=brak-organizacji");
  }

  return {
    organizationId: dbUser.organizationId,
    user: {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
    },
  };
}

export async function getCurrentOrganizationId(): Promise<string> {
  const { organizationId } = await getAppContext();
  return organizationId;
}
