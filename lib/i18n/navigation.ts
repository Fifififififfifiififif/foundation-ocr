/**
 * Polskie etykiety nawigacji i okruszków.
 * Ścieżki URL pozostają bez zmian (np. `/dashboard`, `/documents`) — bezpieczne dla linków i zakładek.
 */

/** Etykiety segmentów URL w okruszkach (klucz = segment ścieżki). */
export const breadcrumbSegmentPl: Record<string, string> = {
  dashboard: "Panel",
  documents: "Faktury",
  kalendarz: "Kalendarz",
  contractors: "Kontrahenci",
  projects: "Projekty",
  ocr: "OCR",
  raporty: "Raporty",
  ustawienia: "Ustawienia",
  ogolne: "Ogólne",
  wyglad: "Wygląd",
  fundacja: "Fundacja",
  konto: "Konto",
  powiadomienia: "Powiadomienia",
  bezpieczenstwo: "Bezpieczeństwo",
  integracje: "Integracje",
  uzytkownicy: "Użytkownicy",
  new: "Nowy",
  verify: "Weryfikacja",
};

export function breadcrumbSegmentLabel(i: number, seg: string, raw: string[]): string {
  if (seg === "new" && raw[i - 1] === "documents") return "Nowa faktura";
  if (seg === "verify" && raw[i - 2] === "documents") return "Weryfikacja OCR";
  return breadcrumbSegmentPl[seg] ?? seg;
}

/** Tekst linku głównego w okruszkach (ten sam cel co pierwsza pozycja menu). */
export const breadcrumbHomeLabel = "Panel";

/** Dostępność — krótki opis logo w panelu bocznym. */
export const a11yFoundationLogo = "Logo fundacji";
