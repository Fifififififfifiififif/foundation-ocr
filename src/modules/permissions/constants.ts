import type { ModuleKey, OrganizationRole } from "@/generated/prisma";

/** Legacy + module-aware permission keys */
export type Permission =
  | "settings.organization"
  | "settings.users"
  | "integrations.manage"
  | "documents.read"
  | "documents.write"
  | "documents.export"
  | "documents.ocr_verify"
  | "projects.read"
  | "projects.write"
  | "contractors.read"
  | "contractors.write"
  | "analytics.read"
  | "dashboard.read"
  | "calendar.read"
  | "ocr.use"
  | "billing.manage"
  | "audit.read"
  | "platform.organizations"
  | "platform.modules";

/** Module-level capability flags */
export type ModulePermission =
  | "can_use_ocr"
  | "can_manage_invoices"
  | "can_view_analytics"
  | "can_manage_users"
  | "can_manage_documents"
  | "can_manage_settings"
  | "can_manage_billing"
  | "can_view_audit"
  | "can_manage_contractors"
  | "can_manage_projects";

export const MODULE_PERMISSION_MAP: Record<ModulePermission, { module: ModuleKey; permission: Permission }> = {
  can_use_ocr: { module: "OCR", permission: "ocr.use" },
  can_manage_invoices: { module: "INVOICES", permission: "documents.write" },
  can_manage_documents: { module: "DOCUMENTS", permission: "documents.write" },
  can_view_analytics: { module: "ANALYTICS", permission: "analytics.read" },
  can_manage_users: { module: "USERS", permission: "settings.users" },
  can_manage_settings: { module: "SETTINGS", permission: "settings.organization" },
  can_manage_billing: { module: "BILLING", permission: "billing.manage" },
  can_view_audit: { module: "AUDIT", permission: "audit.read" },
  can_manage_contractors: { module: "DOCUMENTS", permission: "contractors.write" },
  can_manage_projects: { module: "DOCUMENTS", permission: "projects.write" },
};

const ALL: Permission[] = [
  "settings.organization",
  "settings.users",
  "integrations.manage",
  "documents.read",
  "documents.write",
  "documents.export",
  "documents.ocr_verify",
  "projects.read",
  "projects.write",
  "contractors.read",
  "contractors.write",
  "analytics.read",
  "dashboard.read",
  "calendar.read",
  "ocr.use",
  "billing.manage",
  "audit.read",
];

const VIEWER: Permission[] = [
  "dashboard.read",
  "documents.read",
  "projects.read",
  "contractors.read",
  "calendar.read",
  "analytics.read",
];

const MEMBER: Permission[] = [
  ...VIEWER,
  "documents.write",
  "ocr.use",
];

const MANAGER: Permission[] = [
  ...MEMBER,
  "documents.ocr_verify",
  "projects.write",
  "contractors.write",
];

const ACCOUNTANT: Permission[] = [
  ...MANAGER,
  "documents.export",
];

const ADMIN: Permission[] = [...ALL.filter((p) => !p.startsWith("platform."))];

const OWNER: Permission[] = [...ADMIN];

export const ROLE_PERMISSIONS: Record<OrganizationRole, ReadonlySet<Permission>> = {
  OWNER: new Set(OWNER),
  ADMIN: new Set(ADMIN),
  ACCOUNTANT: new Set(ACCOUNTANT),
  MANAGER: new Set(MANAGER),
  MEMBER: new Set(MEMBER),
  VIEWER: new Set(VIEWER),
  USER: new Set(MEMBER),
};

export function normalizeRole(role: OrganizationRole | null | undefined): OrganizationRole | null {
  if (!role) return null;
  if (role === "USER") return "MEMBER";
  return role;
}

export function roleHasPermission(role: OrganizationRole | null | undefined, permission: Permission): boolean {
  const r = normalizeRole(role);
  if (!r) return false;
  return ROLE_PERMISSIONS[r]?.has(permission) ?? false;
}

export function isLimitedToOwnDocuments(role: OrganizationRole | null | undefined): boolean {
  const r = normalizeRole(role);
  return r === "MEMBER" || r === "USER";
}

export const PLATFORM_PERMISSIONS: Permission[] = [
  "platform.organizations",
  "platform.modules",
  "billing.manage",
];

/** Każde uprawnienie wymaga włączonego modułu SaaS (Super Admin → /admin/modules). */
export const PERMISSION_TO_MODULE: Partial<Record<Permission, ModuleKey>> = {
  "settings.organization": "SETTINGS",
  "settings.users": "USERS",
  "integrations.manage": "SETTINGS",
  "documents.read": "INVOICES",
  "documents.write": "INVOICES",
  "documents.export": "INVOICES",
  "documents.ocr_verify": "OCR",
  "projects.read": "DOCUMENTS",
  "projects.write": "DOCUMENTS",
  "contractors.read": "DOCUMENTS",
  "contractors.write": "DOCUMENTS",
  "analytics.read": "ANALYTICS",
  "dashboard.read": "DOCUMENTS",
  "calendar.read": "CALENDAR",
  "ocr.use": "OCR",
  "billing.manage": "BILLING",
  "audit.read": "AUDIT",
};
