"use server";

import fs from "fs/promises";
import path from "path";

import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { getOrganizationById } from "@/lib/organization-settings";
import { effectiveUploadMimeType } from "@/lib/uploads";
import {
  appearanceSettingsSchema,
  foundationOrgSchema,
  generalSettingsSchema,
  notificationsSettingsSchema,
  ocrSettingsSchema,
  securitySettingsSchema,
} from "@/validators/settings";

export type ActionResult =
  | { ok: true; message?: string; logoPath?: string }
  | { ok: false; error: string };

async function touchPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath("/ustawienia");
}

export async function updateGeneralSettings(input: unknown): Promise<ActionResult> {
  const { organizationId: orgId } = await requirePermission("settings.organization");
  const parsed = generalSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Błąd walidacji" };
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      ...parsed.data,
      appLanguage: "pl",
      dateFormat: "dd.MM.yyyy",
    },
  });
  await touchPaths();
  return { ok: true, message: "Ustawienia ogólne zapisane." };
}

export async function updateFoundationOrg(input: unknown): Promise<ActionResult> {
  const { organizationId: orgId } = await requirePermission("settings.organization");
  const parsed = foundationOrgSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Błąd walidacji" };
  const d = parsed.data;
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      name: d.foundationName,
      tagline: d.tagline?.trim() ? d.tagline : null,
      contactEmail: d.contactEmail?.trim() ? d.contactEmail : null,
      phone: d.phone?.trim() ? d.phone : null,
      address: d.address?.trim() ? d.address : null,
      organizationInfo: d.organizationInfo?.trim() ? d.organizationInfo : null,
      nip: d.nip?.trim() ? d.nip : null,
      regon: d.regon?.trim() ? d.regon : null,
      krs: d.krs?.trim() ? d.krs : null,
    },
  });
  await touchPaths();
  return { ok: true, message: "Dane organizacji zapisane." };
}

export async function updateNotificationSettings(input: unknown): Promise<ActionResult> {
  const { organizationId: orgId } = await requirePermission("settings.organization");
  const parsed = notificationsSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Błąd walidacji" };
  await prisma.organization.update({
    where: { id: orgId },
    data: parsed.data,
  });
  await touchPaths();
  return { ok: true, message: "Powiadomienia zapisane." };
}

export async function updateSecuritySettings(input: unknown): Promise<ActionResult> {
  const { organizationId: orgId } = await requirePermission("settings.organization");
  const parsed = securitySettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Błąd walidacji" };
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      sessionTimeoutMinutes: parsed.data.sessionTimeoutMinutes,
      twoFactorEnabled: false,
    },
  });
  await touchPaths();
  return { ok: true, message: "Ustawienia bezpieczeństwa zapisane." };
}

export async function updateOcrSettings(input: unknown): Promise<ActionResult> {
  const { organizationId: orgId } = await requirePermission("settings.organization");
  const parsed = ocrSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Błąd walidacji" };
  await prisma.organization.update({
    where: { id: orgId },
    data: parsed.data,
  });
  await touchPaths();
  return { ok: true, message: "Ustawienia OCR zapisane." };
}

export async function updateAppearanceSettings(input: unknown): Promise<ActionResult> {
  const { organizationId: orgId } = await requirePermission("settings.organization");
  const parsed = appearanceSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Błąd walidacji" };
  const d = parsed.data;
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      appearanceTheme: d.appearanceTheme,
      sidebarStyle: d.sidebarStyle,
      uiDensity: d.uiDensity,
      accentColor: d.accentColor,
      fontColor: d.fontColor,
      dashboardPreferences: {
        defaultLanding: d.defaultLanding,
        widgets: {
          kpi: d.widgetKpi,
          calendar: d.widgetCalendar,
          charts: d.widgetCharts,
          projectsBreakdown: d.widgetProjectsBreakdown,
          recent: d.widgetRecent,
        },
      },
    },
  });
  await touchPaths();
  return { ok: true, message: "Wygląd i preferencje pulpitu zapisane." };
}

const LOGO_MAX = 2 * 1024 * 1024;
const LOGO_MIMES = new Set(["image/png", "image/jpeg"]);

export async function uploadFoundationLogo(formData: FormData): Promise<ActionResult> {
  const { organizationId: orgId } = await requirePermission("settings.organization");
  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Wybierz plik graficzny (PNG lub JPG)." };
  if (file.size > LOGO_MAX) return { ok: false, error: "Logo może mieć maks. 2 MB." };
  const mime = effectiveUploadMimeType(file);
  if (!LOGO_MIMES.has(mime)) return { ok: false, error: "Dozwolone formaty: PNG, JPG." };

  const ext = mime === "image/png" ? "png" : "jpg";
  const relative = path.join("branding", orgId, `logo.${ext}`).replace(/\\/g, "/");
  const dir = path.join(process.cwd(), "uploads", "branding", orgId);
  await fs.mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(process.cwd(), "uploads", relative), buffer);

  await prisma.organization.update({
    where: { id: orgId },
    data: { logoPath: relative },
  });
  await touchPaths();
  return { ok: true, message: "Logo zaktualizowane.", logoPath: relative };
}

export async function removeFoundationLogo(): Promise<ActionResult> {
  const { organizationId: orgId } = await requirePermission("settings.organization");
  const s = await getOrganizationById(orgId);
  if (s.logoPath) {
    try {
      await fs.unlink(path.join(process.cwd(), "uploads", s.logoPath));
    } catch {
      /* ignore */
    }
  }
  await prisma.organization.update({
    where: { id: orgId },
    data: { logoPath: null },
  });
  await touchPaths();
  return { ok: true, message: "Logo usunięte." };
}
