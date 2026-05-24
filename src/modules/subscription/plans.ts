import type { ModuleKey } from "@/generated/prisma";

import type { PlanDefinition, SaasPlanId, SubscriptionFeatureFlag } from "@/src/modules/subscription/types";

/** Rdzeń — każdy plan: logowanie, faktury, ustawienia, zespół, subskrypcja. */
const CORE: ModuleKey[] = [
  "AUTH",
  "DOCUMENTS",
  "INVOICES",
  "SETTINGS",
  "UPLOAD",
  "USERS",
  "PERMISSIONS",
  "BILLING",
];

/** Pro: OCR, eksporty, kalendarz, projekty, analityka, workflow, audyt. */
const PRO_MODULES: ModuleKey[] = [
  ...CORE,
  "OCR",
  "EXPORTS",
  "CALENDAR",
  "PROJECTS",
  "ANALYTICS",
  "APPROVALS",
  "AUDIT",
];

/** Enterprise: Pro + księgowość (KSeF, paczki, finanse). */
const ENTERPRISE_MODULES: ModuleKey[] = [...PRO_MODULES, "ACCOUNTING"];

function features(partial: Partial<Record<SubscriptionFeatureFlag, boolean>>) {
  const base: Record<SubscriptionFeatureFlag, boolean> = {
    invoice_ocr: false,
    krs: false,
    export_csv: false,
    export_xlsx: false,
    export_pdf: false,
    advanced_ocr: false,
    approval_workflows: false,
    api_access: false,
    bulk_processing: false,
    accountant_pack: false,
    integrations: false,
    priority_support: false,
  };
  return { ...base, ...partial };
}

const GB = 1024 * 1024 * 1024;

/** Trzy plany: Free → Pro → Enterprise. */
export const PLAN_DEFINITIONS: Record<SaasPlanId, PlanDefinition> = {
  free: {
    id: "free",
    label: "Free",
    tagline: "Start — ręczna praca z fakturami, bez OCR i automatyzacji.",
    modules: CORE,
    limits: {
      maxUsers: 3,
      maxDocumentsMonthly: 25,
      maxOcrJobsMonthly: 0,
      maxExportsMonthly: 0,
      maxStorageBytes: 500 * 1024 * 1024,
    },
    features: features({}),
    highlights: [
      "Przechowywanie i przegląd dokumentów",
      "Ręczne wprowadzanie faktur",
      "Ustawienia organizacji i zespół (do 3 osób)",
      "Podstawowy pulpit",
    ],
  },
  pro: {
    id: "pro",
    label: "Pro",
    tagline: "Rosnące zespoły — OCR, analityka, projekty i eksporty.",
    badge: "popular",
    modules: PRO_MODULES,
    limits: {
      maxUsers: 25,
      maxDocumentsMonthly: 1_000,
      maxOcrJobsMonthly: 500,
      maxExportsMonthly: 200,
      maxStorageBytes: 25 * GB,
    },
    features: features({
      invoice_ocr: true,
      krs: true,
      export_csv: true,
      export_xlsx: true,
      export_pdf: true,
      advanced_ocr: true,
      approval_workflows: true,
    }),
    highlights: [
      "OCR faktur i kalendarz terminów",
      "Projekty, analityka i audyt",
      "Zatwierdzania i eksporty (CSV, XLSX, PDF)",
      "Lookup KRS / weryfikacja organizacji",
    ],
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    tagline: "Pełna platforma — księgowość, KSeF, API i najwyższe limity.",
    badge: "enterprise",
    modules: ENTERPRISE_MODULES,
    limits: {
      maxUsers: 500,
      maxDocumentsMonthly: 50_000,
      maxOcrJobsMonthly: 15_000,
      maxExportsMonthly: 5_000,
      maxStorageBytes: 500 * GB,
    },
    features: features({
      invoice_ocr: true,
      krs: true,
      export_csv: true,
      export_xlsx: true,
      export_pdf: true,
      advanced_ocr: true,
      approval_workflows: true,
      api_access: true,
      bulk_processing: true,
      accountant_pack: true,
      integrations: true,
      priority_support: true,
    }),
    highlights: [
      "Moduł księgowości i dashboard finansowy",
      "Integracja KSeF (import faktur)",
      "API, operacje zbiorcze, paczki dla księgowości",
      "Limity i wsparcie dopasowane do organizacji",
    ],
  },
};

export const SAAS_PLAN_IDS = Object.keys(PLAN_DEFINITIONS) as SaasPlanId[];

export const PAID_PLAN_IDS: SaasPlanId[] = ["pro", "enterprise"];

/** Mapowanie starych identyfikatorów planów (starter, business…) na nowe. */
const LEGACY_PLAN_ALIASES: Record<string, SaasPlanId> = {
  starter: "pro",
  business: "enterprise",
  trial: "pro",
};

export function normalizePlanId(raw: string | null | undefined): SaasPlanId {
  const key = (raw ?? "free").trim().toLowerCase();
  if (key in PLAN_DEFINITIONS) return key as SaasPlanId;
  if (key in LEGACY_PLAN_ALIASES) return LEGACY_PLAN_ALIASES[key]!;
  return "free";
}

export function getPlanDefinition(planId: SaasPlanId): PlanDefinition {
  return PLAN_DEFINITIONS[planId];
}

export function formatPlanLimit(value: number): string {
  if (value === 0) return "—";
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  return value.toLocaleString("pl-PL");
}

export const BILLING_CYCLE_DAYS = 30;

/** Wiersze limitów do tabel porównawczych (UI / dokumentacja). */
export const PLAN_LIMIT_COMPARE_ROWS = [
  { key: "maxUsers" as const, label: "Użytkownicy" },
  { key: "maxDocumentsMonthly" as const, label: "Dokumenty / mies." },
  { key: "maxOcrJobsMonthly" as const, label: "OCR / mies." },
  { key: "maxExportsMonthly" as const, label: "Eksporty / mies." },
  { key: "maxStorageBytes" as const, label: "Magazyn" },
];
