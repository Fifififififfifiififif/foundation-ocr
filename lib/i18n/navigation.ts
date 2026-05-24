/**
 * Polskie etykiety nawigacji i okruszków.
 */

export const breadcrumbSegmentPl: Record<string, string> = {
  dashboard: "Panel",
  documents: "Faktury",
  manual: "Ręcznie",
  kalendarz: "Kalendarz",
  contractors: "Kontrahenci",
  projects: "Projekty",
  ocr: "OCR",
  raporty: "Raporty",
  ustawienia: "Ustawienia",
  ogolne: "Ogólne",
  wyglad: "Wygląd",
  organizacja: "Organizacja",
  fundacja: "Organizacja",
  konto: "Konto",
  powiadomienia: "Powiadomienia",
  bezpieczenstwo: "Bezpieczeństwo",
  integracje: "Integracje",
  uzytkownicy: "Użytkownicy",
  moduly: "Moduły",
  subskrypcja: "Subskrypcja",
  admin: "Administracja",
  organizations: "Organizacje",
  modules: "Moduły",
  new: "Nowy",
  verify: "Weryfikacja",
  edit: "Edycja",
};

export function breadcrumbSegmentLabel(i: number, seg: string, raw: string[]): string {
  if (seg === "new" && raw[i - 1] === "documents") return "Nowa faktura";
  if (seg === "manual" && raw[i - 1] === "documents") return "Faktura ręczna";
  if (seg === "verify" && raw[i - 2] === "documents") return "Weryfikacja OCR";
  return breadcrumbSegmentPl[seg] ?? seg;
}

export const breadcrumbHomeLabel = "Panel";

export const a11yOrganizationLogo = "Logo organizacji";

/** @deprecated */
export const a11yFoundationLogo = a11yOrganizationLogo;

export const appTaglineDefault = "Zarządzanie dokumentami";
