import type { OrganizationRole } from "@/generated/prisma";

/** Uprawnienia RBAC (string — łatwe logowanie i rozszerzenia). */
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
  | "ocr.use";

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
];

const SET: Record<OrganizationRole, ReadonlySet<Permission>> = {
  ADMIN: new Set(ALL),
  ACCOUNTANT: new Set<Permission>([
    "dashboard.read",
    "documents.read",
    "documents.write",
    "documents.export",
    "documents.ocr_verify",
    "calendar.read",
    "ocr.use",
    "projects.read",
    "contractors.read",
    "analytics.read",
  ]),
  MANAGER: new Set<Permission>([
    "dashboard.read",
    "documents.read",
    "documents.write",
    "documents.ocr_verify",
    "projects.read",
    "projects.write",
    "contractors.read",
    "contractors.write",
    "calendar.read",
    "analytics.read",
    "ocr.use",
  ]),
  USER: new Set<Permission>([
    "dashboard.read",
    "documents.read",
    "documents.write",
    "projects.read",
    "contractors.read",
    "calendar.read",
    "ocr.use",
  ]),
};

export function roleHasPermission(role: OrganizationRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return SET[role].has(permission);
}

/** USER: tylko dokumenty utworzone przez siebie (uploady / „własne”). */
export function isLimitedToOwnDocuments(role: OrganizationRole | null | undefined): boolean {
  return role === "USER";
}
