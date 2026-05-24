import type { ModuleKey, SubscriptionStatus } from "@/generated/prisma";

export type SaasPlanId = "free" | "pro" | "enterprise";

export type SubscriptionFeatureFlag =
  | "invoice_ocr"
  | "krs"
  | "export_csv"
  | "export_xlsx"
  | "export_pdf"
  | "advanced_ocr"
  | "approval_workflows"
  | "api_access"
  | "bulk_processing"
  | "accountant_pack"
  | "integrations"
  | "priority_support";

export type PlanLimits = {
  maxUsers: number;
  maxDocumentsMonthly: number;
  maxOcrJobsMonthly: number;
  maxExportsMonthly: number;
  maxStorageBytes: number;
};

export type PlanBadge = "popular" | "enterprise";

export type PlanDefinition = {
  id: SaasPlanId;
  label: string;
  tagline: string;
  badge?: PlanBadge;
  modules: ModuleKey[];
  limits: PlanLimits;
  features: Record<SubscriptionFeatureFlag, boolean>;
  highlights: string[];
};

export type OrganizationEntitlement = {
  organizationId: string;
  plan: SaasPlanId;
  effectivePlan: SaasPlanId;
  status: SubscriptionStatus;
  isActive: boolean;
  isExpired: boolean;
  daysRemaining: number | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  billingCycle: string;
  planModules: ModuleKey[];
  limits: PlanLimits;
  features: Record<SubscriptionFeatureFlag, boolean>;
  usage: {
    users: number;
    documentsThisMonth: number;
    ocrThisMonth: number;
    exportsThisMonth: number;
  };
};

export type EntitlementDenialReason =
  | "plan"
  | "module"
  | "feature"
  | "quota"
  | "expired"
  | "suspended";
