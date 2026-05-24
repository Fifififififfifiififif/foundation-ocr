import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { OrganizationRole } from "@/generated/prisma";
import prisma from "@/lib/prisma";
import { isPrismaMissingSchemaObject } from "@/lib/prisma-recoverable";
import { shouldUseDevAuthContext } from "@/src/modules/auth/config.server";
import { isDevSignedOut } from "@/src/modules/auth/dev-session.server";
import { getSupabaseAuthUser } from "@/src/modules/auth/session";
import {
  getActiveOrganizationId,
  getMembershipRole,
} from "@/src/modules/organizations/context";
import {
  completePendingSignup,
  ensureUserProfile,
} from "@/src/modules/organizations/onboarding";
import { getEnabledModuleKeys } from "@/src/modules/permissions/check";
import { getUserEffectiveModules } from "@/src/modules/permissions/member-modules";
import { resolveOrganizationEntitlement } from "@/src/modules/subscription/resolve";
import type { OrganizationEntitlement } from "@/src/modules/subscription/types";
import { ensureDeprecatedModulesPurged } from "@/src/modules/organizations/modules";
import { assertOrgActive } from "@/src/modules/tenant/isolation";
import type { ModuleKey } from "@/generated/prisma";
import type { SubscriptionSummary } from "@/lib/subscription-display";
import { entitlementToSummary } from "@/src/modules/subscription/display";

export const IMPERSONATE_ORG_COOKIE = "saas_impersonate_org";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: OrganizationRole | null;
  banned: boolean;
  isSuperAdmin: boolean;
  impersonating?: boolean;
};

export type AppContext = {
  organizationId: string;
  user: AppUser;
  enabledModules: Set<ModuleKey>;
  entitlement: OrganizationEntitlement;
  subscription: SubscriptionSummary;
};

const DEFAULT_ORG_ID = "org_default";

function devOrgId(): string {
  return process.env.DEV_ORGANIZATION_ID?.trim() || DEFAULT_ORG_ID;
}

function devUserFallback(): AppUser {
  return {
    id: process.env.DEV_USER_ID?.trim() || process.env.APP_USER_ID?.trim() || "dev-user-local",
    name: process.env.DEV_USER_NAME?.trim() || "Developer",
    email: process.env.DEV_USER_EMAIL?.trim() || "dev@local",
    role: "ADMIN",
    banned: false,
    isSuperAdmin: false,
  };
}

async function devContextFallback(): Promise<AppContext> {
  const organizationId = devOrgId();
  const entitlement = await resolveOrganizationEntitlement(organizationId);
  const enabledModules = await getEnabledModuleKeys(organizationId);
  return {
    organizationId,
    user: devUserFallback(),
    enabledModules,
    entitlement,
    subscription: entitlementToSummary(entitlement),
  };
}

async function resolveDevContext(): Promise<AppContext> {
  const userId = process.env.DEV_USER_ID?.trim() || process.env.APP_USER_ID?.trim();
  if (userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        isSuperAdmin: true,
        organizationId: true,
      },
    });
    if (dbUser?.organizationId) {
      const role = (await getMembershipRole(dbUser.id, dbUser.organizationId)) ?? dbUser.role;
      const enabledModules = await getUserEffectiveModules(
        dbUser.organizationId,
        dbUser.id,
        role,
        dbUser.isSuperAdmin,
      );
      const entitlement = await resolveOrganizationEntitlement(dbUser.organizationId);
      return {
        organizationId: dbUser.organizationId,
        user: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role,
          banned: dbUser.banned,
          isSuperAdmin: dbUser.isSuperAdmin,
        },
        enabledModules,
        entitlement,
        subscription: entitlementToSummary(entitlement),
      };
    }
  }
  return devContextFallback();
}

async function resolveAuthenticatedContext(): Promise<AppContext | null> {
  const authUser = await getSupabaseAuthUser();
  if (!authUser?.email) return null;

  const dbUser = await ensureUserProfile({
    supabaseUserId: authUser.id,
    email: authUser.email,
    name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? authUser.email,
  });

  if (dbUser.banned) {
    redirect("/odmowa-dostepu?reason=banned");
  }

  await completePendingSignup({
    userId: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    metadata: authUser.user_metadata,
  });

  const cookieStore = await cookies();
  const impersonateOrgId = cookieStore.get(IMPERSONATE_ORG_COOKIE)?.value?.trim();

  let organizationId = await getActiveOrganizationId(dbUser.id);
  let role: OrganizationRole | null = null;
  let impersonating = false;

  if (dbUser.isSuperAdmin && impersonateOrgId) {
    organizationId = impersonateOrgId;
    role = "ADMIN";
    impersonating = true;
  } else {
    if (!organizationId) {
      redirect("/logowanie?error=Brak+przypisanej+organizacji.");
    }
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: dbUser.id },
      },
      select: { role: true, isActive: true },
    });
    if (!member?.isActive) {
      redirect("/odmowa-dostepu?reason=not_member");
    }
    role = member.role;
  }

  try {
    await assertOrgActive(organizationId);
  } catch {
    redirect("/odmowa-dostepu?reason=org_suspended");
  }

  const entitlement = await resolveOrganizationEntitlement(organizationId);
  const enabledModules =
    dbUser.isSuperAdmin && impersonating
      ? await getEnabledModuleKeys(organizationId)
      : await getUserEffectiveModules(organizationId, dbUser.id, role, dbUser.isSuperAdmin);

  return {
    organizationId,
    user: {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role,
      banned: dbUser.banned,
      isSuperAdmin: dbUser.isSuperAdmin,
      impersonating,
    },
    enabledModules,
    entitlement,
    subscription: entitlementToSummary(entitlement),
  };
}

export async function getAppContext(): Promise<AppContext> {
  await ensureDeprecatedModulesPurged();

  if (await shouldUseDevAuthContext()) {
    try {
      return await resolveDevContext();
    } catch (e) {
      if (isPrismaMissingSchemaObject(e)) return await devContextFallback();
      throw e;
    }
  }

  try {
    const ctx = await resolveAuthenticatedContext();
    if (ctx) return ctx;
    if (await isDevSignedOut()) redirect("/logowanie");
    return await devContextFallback();
  } catch (e) {
    if (isPrismaMissingSchemaObject(e)) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[app-context] DB not synced — dev fallback. Run: npm run db:sync");
      }
      return await devContextFallback();
    }
    throw e;
  }
}

export async function getCurrentOrganizationId(): Promise<string> {
  const { organizationId } = await getAppContext();
  return organizationId;
}

export async function getDevOrganizationId(): Promise<string | null> {
  if (await shouldUseDevAuthContext()) return devOrgId();
  try {
    const orgId = devOrgId();
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } });
    return org?.id ?? orgId;
  } catch (e) {
    if (isPrismaMissingSchemaObject(e)) return devOrgId();
    return null;
  }
}

/**
 * Organizacja do motywu w root layout — bez redirectów (strony logowania).
 * Wcześniej używano wyłącznie dev org → zapisany akcent „nie działał” po zalogowaniu.
 */
export async function tryResolveAppearanceOrganizationId(): Promise<string | null> {
  if (await shouldUseDevAuthContext()) return devOrgId();

  try {
    const authUser = await getSupabaseAuthUser();
    if (!authUser?.email) return null;

    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [{ supabaseUserId: authUser.id }, { email: authUser.email }],
      },
      select: { id: true, isSuperAdmin: true },
    });
    if (!dbUser) return null;

    const cookieStore = await cookies();
    const impersonateOrgId = cookieStore.get(IMPERSONATE_ORG_COOKIE)?.value?.trim();
    if (dbUser.isSuperAdmin && impersonateOrgId) return impersonateOrgId;

    return await getActiveOrganizationId(dbUser.id);
  } catch {
    return null;
  }
}
