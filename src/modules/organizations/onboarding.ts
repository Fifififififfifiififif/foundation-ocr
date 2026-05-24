import type { OrganizationRole } from "@/generated/prisma";
import prisma from "@/lib/prisma";
import {
  lookupOrganizationRegistry,
  registryProfileToOrganizationData,
  verifyOrganizationByKrsOnServer,
} from "@/src/modules/krs/service";
import { normalizeKrs } from "@/src/modules/krs/validation";
import { seedOrganizationModules } from "@/src/modules/organizations/modules";
import { activateOrganizationPlan } from "@/src/modules/subscription/lifecycle";
import { writeAuditLog } from "@/src/modules/tenant/audit";

export type OrganizationRegistryInput = {
  nip?: string | null;
  regon?: string | null;
  krs?: string | null;
  legalForm?: string | null;
  registryStatus?: string | null;
  address?: string | null;
  /** Klient oznaczył pobranie z KRS — serwer ponownie weryfikuje po KRS. */
  requestKrsVerification?: boolean;
};

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || "org";
}

async function resolveRegistryCreateData(
  name: string,
  registry?: OrganizationRegistryInput,
): Promise<Record<string, unknown>> {
  const base = {
    name: name.trim() || "Moja organizacja",
    nip: registry?.nip?.trim() || null,
    regon: registry?.regon?.trim() || null,
    krs: registry?.krs?.trim() || null,
    legalForm: registry?.legalForm?.trim() || null,
    registryStatus: registry?.registryStatus?.trim() || null,
    address: registry?.address?.trim() || null,
  };

  if (registry?.requestKrsVerification) {
    const krsNorm = registry?.krs ? normalizeKrs(registry.krs) : null;
    if (krsNorm) {
      const verified = await verifyOrganizationByKrsOnServer(krsNorm);
      if (verified) {
        return registryProfileToOrganizationData(verified.profile, verified.registryRawData);
      }
    } else if (registry.nip?.trim() || registry.regon?.trim()) {
      const lookedUp = await lookupOrganizationRegistry({
        nip: registry.nip ?? undefined,
        regon: registry.regon ?? undefined,
      });
      if (lookedUp.ok) {
        return registryProfileToOrganizationData(lookedUp.profile, lookedUp.registryRawData);
      }
    }
  }

  return base;
}

/** Nowy tenant — izolowana organizacja + właściciel (OWNER). */
export async function createOrganizationForUser(input: {
  userId: string;
  name: string;
  email: string;
  userName: string;
  role?: OrganizationRole;
  registry?: OrganizationRegistryInput;
}) {
  const role = input.role ?? "OWNER";
  let slug = slugify(input.name);
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const registryData = await resolveRegistryCreateData(input.name, input.registry);

  const org = await prisma.organization.create({
    data: {
      slug,
      contactEmail: input.email,
      status: "active",
      ...registryData,
    },
  });

  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: input.userId, role, isActive: true },
  });

  await activateOrganizationPlan({
    organizationId: org.id,
    plan: "free",
    status: "active",
  });

  await seedOrganizationModules(org.id);

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      organizationId: org.id,
      role,
      name: input.userName,
      email: input.email,
    },
  });

  await writeAuditLog({
    organizationId: org.id,
    userId: input.userId,
    action: "organization.created",
    entityType: "organization",
    entityId: org.id,
    metadata: { name: org.name, slug: org.slug, ownerRole: role },
  });

  return org;
}

export async function ensureUserProfile(input: {
  supabaseUserId: string;
  email: string;
  name: string;
}) {
  let user = await prisma.user.findUnique({
    where: { supabaseUserId: input.supabaseUserId },
  });

  if (!user) {
    user = await prisma.user.findUnique({ where: { email: input.email } });
  }

  if (user) {
    return prisma.user.update({
      where: { id: user.id },
      data: {
        supabaseUserId: input.supabaseUserId,
        name: input.name || user.name,
        email: input.email,
      },
    });
  }

  const id = input.supabaseUserId;
  user = await prisma.user.create({
    data: {
      id,
      supabaseUserId: input.supabaseUserId,
      name: input.name || input.email.split("@")[0] || "User",
      email: input.email,
      role: "MEMBER",
    },
  });

  return user;
}

/** Rejestracja: utwórz organizację z metadanych Supabase (tylko jeśli brak członkostwa). */
export async function completePendingSignup(input: {
  userId: string;
  email: string;
  name: string;
  metadata?: Record<string, unknown> | null;
}) {
  const existingMember = await prisma.organizationMember.findFirst({
    where: { userId: input.userId, isActive: true },
    select: { id: true },
  });
  if (existingMember) return null;

  const meta = input.metadata ?? {};
  const orgFromMeta =
    typeof meta.organization_name === "string" ? meta.organization_name.trim() : "";
  const orgName = orgFromMeta || `${input.name || "Moja"} organizacja`;

  const registry: OrganizationRegistryInput = {
    nip: typeof meta.organization_nip === "string" ? meta.organization_nip : null,
    regon: typeof meta.organization_regon === "string" ? meta.organization_regon : null,
    krs: typeof meta.organization_krs === "string" ? meta.organization_krs : null,
    legalForm:
      typeof meta.organization_legal_form === "string" ? meta.organization_legal_form : null,
    registryStatus:
      typeof meta.organization_registry_status === "string"
        ? meta.organization_registry_status
        : null,
    address: typeof meta.organization_address === "string" ? meta.organization_address : null,
    requestKrsVerification: meta.organization_registry_verified === "1",
  };

  const org = await createOrganizationForUser({
    userId: input.userId,
    name: orgName,
    email: input.email,
    userName: input.name || input.email,
    role: "OWNER",
    registry,
  });

  return org;
}

/** Użytkownik z zaproszenia / utworzony przez OWNER — dołączenie do organizacji. */
export async function attachUserToOrganization(input: {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  email: string;
  name: string;
}) {
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    },
    create: {
      organizationId: input.organizationId,
      userId: input.userId,
      role: input.role,
      isActive: true,
    },
    update: { role: input.role, isActive: true },
  });

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      organizationId: input.organizationId,
      role: input.role,
      email: input.email,
      name: input.name,
      banned: false,
    },
  });
}
