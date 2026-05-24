import type { ModuleKey } from "@/generated/prisma";

export type NavLink = {
  href: string;
  label: string;
  module?: ModuleKey;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
};

export const NAV_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Panel", module: "DOCUMENTS" },
  { href: "/documents", label: "Faktury", module: "INVOICES" },
  { href: "/kalendarz", label: "Kalendarz", module: "CALENDAR" },
  { href: "/contractors", label: "Kontrahenci", module: "DOCUMENTS" },
  { href: "/projects", label: "Projekty", module: "PROJECTS" },
  { href: "/ocr", label: "OCR", module: "OCR" },
  { href: "/raporty", label: "Raporty", module: "ANALYTICS" },
  { href: "/ustawienia", label: "Ustawienia", module: "SETTINGS" },
  { href: "/ustawienia/uzytkownicy", label: "Użytkownicy", module: "USERS", adminOnly: true },
  { href: "/admin", label: "Platforma", superAdminOnly: true },
];

export function filterNavLinks(
  enabledModules: Set<ModuleKey>,
  opts: { canManageUsers: boolean; isSuperAdmin: boolean },
): NavLink[] {
  return NAV_LINKS.filter((link) => {
    if (link.superAdminOnly && !opts.isSuperAdmin) return false;
    if (link.adminOnly && !opts.canManageUsers) return false;
    if (link.module && !enabledModules.has(link.module)) return false;
    return true;
  });
}
