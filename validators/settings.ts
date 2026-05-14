import { z } from "zod";

import { tryParseAccentStored } from "@/lib/accent-color";

const tz = z.string().min(1).max(80);
const currency = z.enum(["PLN", "EUR", "USD"]);

/** Aplikacja wyłącznie po polsku; format daty wyświetlania ustalony (dd.MM.yyyy). */
export const generalSettingsSchema = z.object({
  appLanguage: z.literal("pl"),
  timezone: tz,
  dateFormat: z.literal("dd.MM.yyyy"),
  currency,
});

const hex6 = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Kolor w formacie #RRGGBB");

const accentColorStored = z
  .string()
  .max(200)
  .refine(
    (s) => {
      const t = s.trim();
      if (/^#[0-9A-Fa-f]{6}$/.test(t)) return true;
      return tryParseAccentStored(t)?.kind === "gradient";
    },
    { message: "Nieprawidłowy kolor akcentu lub gradient." },
  );

export const foundationOrgSchema = z.object({
  foundationName: z.string().min(1).max(200),
  tagline: z.string().max(300),
  contactEmail: z.union([z.string().email(), z.literal("")]),
  phone: z.string().max(40),
  address: z.string().max(2000),
  organizationInfo: z.string().max(8000),
  nip: z.string().max(20),
  regon: z.string().max(20),
  krs: z.string().max(20),
});

export const notificationsSettingsSchema = z.object({
  emailAlertsGeneral: z.coerce.boolean(),
  emailAlertsOcr: z.coerce.boolean(),
  emailAlertsExport: z.coerce.boolean(),
});

export const securitySettingsSchema = z.object({
  sessionTimeoutMinutes: z.coerce.number().int().min(15).max(10080),
});

export const ocrSettingsSchema = z.object({
  ocrEnabled: z.coerce.boolean(),
  maxUploadBytes: z.coerce.number().int().min(1024 * 1024).max(50 * 1024 * 1024),
});

export const appearanceSettingsSchema = z.object({
  appearanceTheme: z.enum(["light", "dark", "system"]),
  sidebarStyle: z.enum(["default", "soft", "minimal"]),
  uiDensity: z.enum(["comfortable", "compact"]),
  defaultLanding: z.enum(["/dashboard", "/documents"]),
  widgetKpi: z.coerce.boolean(),
  widgetCalendar: z.coerce.boolean(),
  widgetCharts: z.coerce.boolean(),
  widgetProjectsBreakdown: z.coerce.boolean(),
  widgetRecent: z.coerce.boolean(),
  accentColor: accentColorStored,
  fontColor: z
    .union([hex6, z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});
