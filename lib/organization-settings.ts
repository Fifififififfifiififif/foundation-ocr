import prisma from "@/lib/prisma";
import { getCurrentOrganizationId } from "@/lib/app-context";
import type { PublicBranding } from "@/lib/branding-url";
import type { Organization } from "@/generated/prisma";
import { isPrismaMissingSchemaObject } from "@/lib/prisma-recoverable";

function fallbackOrganization(): Organization {
  const now = new Date();
  return {
    id: "fallback",
    slug: "fallback",
    name: "Moja organizacja",
    status: "active",
    suspendedAt: null,
    suspendedReason: null,
    tagline: null,
    logoPath: null,
    accentColor: "#18181b",
    fontColor: null,
    contactEmail: null,
    address: null,
    phone: null,
    organizationInfo: null,
    nip: null,
    regon: null,
    krs: null,
    legalForm: null,
    registryStatus: null,
    verifiedAt: null,
    registryRawData: null,
    appLanguage: "pl",
    timezone: "Europe/Warsaw",
    dateFormat: "dd.MM.yyyy",
    currency: "PLN",
    emailAlertsGeneral: true,
    emailAlertsOcr: true,
    emailAlertsExport: true,
    sessionTimeoutMinutes: 480,
    twoFactorEnabled: false,
    ocrEnabled: true,
    maxUploadBytes: 10485760,
    appearanceTheme: "system",
    sidebarStyle: "default",
    uiDensity: "comfortable",
    dashboardPreferences: {},
    createdAt: now,
    updatedAt: now,
  };
}

export async function getOrganizationById(organizationId: string): Promise<Organization> {
  try {
    const row = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (row) return row;
  } catch (e: unknown) {
    if (isPrismaMissingSchemaObject(e)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[organization] Tabela `organization` lub kolumna nie istnieje w bazie — zwracam domyślne ustawienia. Uruchom: npm run db:deploy",
        );
      }
    } else {
      throw e;
    }
  }
  return fallbackOrganization();
}

export async function getOrganizationForDefaultTenant(): Promise<Organization> {
  return getOrganizationById(await getCurrentOrganizationId());
}

export async function getPublicBrandingForOrganization(organizationId: string): Promise<PublicBranding> {
  const s = await getOrganizationById(organizationId);
  return {
    foundationName: s.name,
    tagline: s.tagline,
    logoPath: s.logoPath,
    accentColor: s.accentColor,
  };
}
